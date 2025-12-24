/**
 * src/pages/VehicleMarket.tsx
 *
 * Vehicle Market page with defensive specs resolution and client-side pagination.
 *
 * Purpose:
 * - Provide vehicle marketplace UI (trucks & trailers) with filters, tabs and purchase modal.
 * - Ensure canonical classification using isTrailer() helper.
 * - Implement client-side pagination with 10 items per page (trucks and trailers have independent paging).
 *
 * Visual / UX decisions:
 * - Pager UI re-uses existing Tailwind classes used across the page for a consistent look.
 * - Pagination state resets when filters/tabs change to provide predictable UX.
 *
 * Notes:
 * - This file is a safe, self-contained replacement to ensure used/new detection and proper persistence
 *   of used truck metadata (production year, kilometres, condition, price) from market -> modal -> garage.
 * - Added: runtime fetch+merge of authoritative technical specifications via fetchVehicleSpecs.
 *   The modal will try to enrich the selected vehicle with Supabase (public.vehicles) rows
 *   when available at runtime and fall back to local data otherwise.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useGame } from '../contexts/GameContext';
import { Package, DollarSign, Calendar, Truck as TruckIcon, X } from 'lucide-react';
import { TRAILERS } from '../data/trailers';
import TruckCard from '../components/market/TruckCard';
import { TRUCKS, TruckCategoryKey } from '../data/trucks';
import VehicleSpecsSelector from '../components/market/VehicleSpecsSelector';
import TrailerTechnicalSpecs from '../components/trailer/TrailerTechnicalSpecs';
import { isTrailer } from '../utils/vehicleTypeUtils';
import { getHubCapacityInfo } from '../engines/hubCapacityEngine';
import ConfirmPurchaseHubInfo from '../components/market/ConfirmPurchaseHubInfo';
import { readOffersFromStorage } from '../engines/UsedTruckGenerator';
import { fetchVehicleSpecs } from '../utils/specsFetcher';

/**
 * randInt
 * @description Generate a random integer in [min, max] inclusive.
 */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * parseAvailabilityDays
 * @description Extract a number of days from an availability string. Return null when no number found, 0 for stock/immediate.
 */
function parseAvailabilityDays(val: any): number | null {
  if (val === undefined || val === null) return null;
  const s = String(val).toLowerCase();
  const m = s.match(/(\d+)\s*day/);
  if (m) return Number(m[1]);
  if (s.includes('in stock') || s.includes('immediate') || s.includes('available') || s.includes('now')) return 0;
  return null;
}

/**
 * ensureSmallAndMediumNewTrucksAvailability
 * @description Adds availability / deliveryDays for 'new' small/medium trucks lacking a clear availability.
 */
function ensureSmallAndMediumNewTrucksAvailability(trucks: any[]): any[] {
  return trucks.map((t) => {
    if (!t) return t;
    const tonnage = Number(t.tonnage ?? t.specifications?.tonnage ?? t.specifications?.capacity ?? 0);
    const cat = (t.truckCategory || '').toString().toLowerCase();
    const isNew = (t.category ?? '').toString().toLowerCase() === 'new';
    const isSmall = cat === 'small' || tonnage < 7.5;
    const isMedium = cat === 'medium' || (tonnage >= 7.5 && tonnage <= 12);
    if (isNew && (isSmall || isMedium)) {
      const existing = parseAvailabilityDays(t.availability ?? t.specifications?.availability ?? '');
      if (existing === null) {
        const days = randInt(1, 4);
        return {
          ...t,
          availability: `${days} day${days === 1 ? '' : 's'}`,
          deliveryDays: days,
          specifications: { ...(t.specifications ?? {}), availability: `${days} day${days === 1 ? '' : 's'}` },
        };
      }
      return { ...t, deliveryDays: existing };
    }
    const parsed = parseAvailabilityDays(t.availability ?? t.specifications?.availability ?? '');
    if (parsed !== null) return { ...t, deliveryDays: parsed };
    return t;
  });
}

/**
 * normalizeTechnicalFields
 * @description Ensure a truck object contains normalized technical fields inside specifications.
 *              Specifically resolves fuel consumption from common key variants and injects it as
 *              specifications.fuelConsumption so downstream UI components can read a consistent key.
 * @param truck incoming truck object (may have fuel consumption in various keys)
 * @returns new truck object with normalized specifications
 */
function normalizeTechnicalFields(truck: any): any {
  const cloned = { ...(truck ?? {}) };
  if (!cloned.specifications) cloned.specifications = { ...(cloned.specifications ?? {}) };

  const fuelCandidates = [
    'fuelConsumption',
    'fuel_consumption',
    'consumption',
    'l100km',
    'fuel_l100km',
    'avgFuelConsumption',
    'avg_consumption',
    'fuelConsumptionL100km',
    'fuelConsumptionL100Km',
    'fuel_l_100km',
    'fuelL100km',
    'fuelConsumptionL/100km',
  ];

  // reliability aliases we want to normalize into specifications.reliability
  const reliabilityCandidates = ['reliability', 'reliabilityRating', 'reliability_rating', 'reliabilityCategory', 'reliability_category'];

  // durability, maintenanceGroup aliases
  const durabilityCandidates = ['durability', 'durabilityScore', 'durability_score'];
  const maintenanceCandidates = ['maintenanceGroup', 'maintenance_group', 'maintenance', 'mg', 'maintenanceGroupId'];

  // speed aliases
  const speedCandidates = ['maxSpeed', 'topSpeed', 'speed', 'speedKmH', 'speed_kmh', 'speedKm', 'speed_km_h'];

  let foundFuel: any = null;
  for (const key of fuelCandidates) {
    if (cloned[key] !== undefined && cloned[key] !== null && String(cloned[key]).trim() !== '') {
      foundFuel = cloned[key];
      break;
    }
    if (cloned.specifications && cloned.specifications[key] !== undefined && cloned.specifications[key] !== null && String(cloned.specifications[key]).trim() !== '') {
      foundFuel = cloned.specifications[key];
      break;
    }
    if (cloned.specifications) {
      const dk = key.replace(/\./g, '');
      if (cloned.specifications[dk] !== undefined && cloned.specifications[dk] !== null && String(cloned.specifications[dk]).trim() !== '') {
        foundFuel = cloned.specifications[dk];
        break;
      }
    }
  }

  if (foundFuel !== null) {
    cloned.specifications = { ...(cloned.specifications ?? {}), fuelConsumption: foundFuel };
  }

  // Normalize reliability: prefer top-level then nested specs then common variants
  for (const key of reliabilityCandidates) {
    const top = cloned[key];
    if (top !== undefined && top !== null && String(top).trim() !== '') {
      cloned.specifications = { ...(cloned.specifications ?? {}), reliability: top };
      break;
    }
    if (cloned.specifications && cloned.specifications[key] !== undefined && cloned.specifications[key] !== null && String(cloned.specifications[key]).trim() !== '') {
      cloned.specifications = { ...(cloned.specifications ?? {}), reliability: cloned.specifications[key] };
      break;
    }
  }

  // Normalize durability
  for (const key of durabilityCandidates) {
    const top = cloned[key];
    if (top !== undefined && top !== null && String(top).trim() !== '') {
      cloned.specifications = { ...(cloned.specifications ?? {}), durability: top };
      break;
    }
    if (cloned.specifications && cloned.specifications[key] !== undefined && cloned.specifications[key] !== null && String(cloned.specifications[key]).trim() !== '') {
      cloned.specifications = { ...(cloned.specifications ?? {}), durability: cloned.specifications[key] };
      break;
    }
  }

  // Normalize maintenance group
  for (const key of maintenanceCandidates) {
    const top = cloned[key];
    if (top !== undefined && top !== null && String(top).trim() !== '') {
      cloned.specifications = { ...(cloned.specifications ?? {}), maintenanceGroup: top };
      break;
    }
    if (cloned.specifications && cloned.specifications[key] !== undefined && cloned.specifications[key] !== null && String(cloned.specifications[key]).trim() !== '') {
      cloned.specifications = { ...(cloned.specifications ?? {}), maintenanceGroup: cloned.specifications[key] };
      break;
    }
  }

  // Normalize speed / maxSpeed
  for (const key of speedCandidates) {
    const top = cloned[key];
    if (top !== undefined && top !== null && String(top).trim() !== '') {
      cloned.specifications = { ...(cloned.specifications ?? {}), maxSpeed: top, speed: top };
      break;
    }
    if (cloned.specifications && cloned.specifications[key] !== undefined && cloned.specifications[key] !== null && String(cloned.specifications[key]).trim() !== '') {
      cloned.specifications = { ...(cloned.specifications ?? {}), maxSpeed: cloned.specifications[key], speed: cloned.specifications[key] };
      break;
    }
    if (cloned.specifications) {
      const dk = key.replace(/\./g, '');
      if (cloned.specifications[dk] !== undefined && cloned.specifications[dk] !== null && String(cloned.specifications[dk]).trim() !== '') {
        cloned.specifications = { ...(cloned.specifications ?? {}), maxSpeed: cloned.specifications[dk], speed: cloned.specifications[dk] };
        break;
      }
    }
  }

  return cloned;
}

/**
 * unifyTrucksListLocal
 * @description Return unified truck list composed of small/medium/big arrays and normalize availability.
 *              Additionally normalize technical fields (fuel consumption etc.) so each truck has
 *              specifications.fuelConsumption when available in the source datasets.
 */
function unifyTrucksListLocal(): any[] {
  const small = (TRUCKS.small || []).map((s: any) => normalizeTechnicalFields({ ...s }));
  const medium = (TRUCKS.medium || []).map((m: any) => normalizeTechnicalFields({ ...m }));
  const big = (TRUCKS.big || []).map((b: any) => normalizeTechnicalFields({ ...b }));

  const mediumAndSmallNormalized = ensureSmallAndMediumNewTrucksAvailability([...small, ...medium]).map((t: any) =>
    normalizeTechnicalFields(t)
  );

  return [...mediumAndSmallNormalized, ...big];
}

/**
 * isSmallFromTopLevel
 * @description Detect small truck classification from top-level fields (tonnage/truckCategory).
 */
function isSmallFromTopLevel(item: any | null): boolean {
  if (!item) return false;
  const tonRaw = item?.tonnage ?? item?.specifications?.tonnage ?? item?.specifications?.capacity ?? 0;
  const ton = Number(tonRaw ?? 0);
  const cat = (item?.truckCategory ?? '').toString().toLowerCase();
  if (Number.isFinite(ton) && ton > 0) return ton <= 7.5;
  return cat === 'small' || cat === 'light' || /van|pickup/.test(cat);
}

/**
 * isBigFromTopLevel
 * @description Detect big truck classification from top-level fields (tonnage/truckCategory).
 */
function isBigFromTopLevel(item: any | null): boolean {
  if (!item) return false;
  const tonRaw = item?.tonnage ?? item?.specifications?.tonnage ?? item?.specifications?.capacity ?? 0;
  const ton = Number(tonRaw ?? 0);
  const cat = (item?.truckCategory ?? '').toString().toLowerCase();
  if (Number.isFinite(ton) && ton > 0) return ton >= 13;
  return cat === 'big' || cat === 'heavy' || /artic|articulated|semi|tractor|heavy-duty|heavy duty/.test(cat);
}

/**
 * VehicleMarket
 * @description Main page component for the vehicle marketplace with client-side pagination.
 */
const VehicleMarket: React.FC = () => {
  const navigate = useNavigate();
  const { gameState, createCompany } = useGame();

  /**
   * isUsedVehicle
   * @description Determine whether a vehicle should be treated as "used" for UI and purchase logic.
   */
  function isUsedVehicle(vehicle: any | null): boolean {
    if (!vehicle) return false;
    const category = (vehicle.category ?? '').toString().toLowerCase();
    const truckCategory = (vehicle.truckCategory ?? '').toString().toLowerCase();
    const marketSource = (vehicle.marketSource ?? '').toString().toLowerCase();

    if (category === 'used' || truckCategory === 'used') return true;
    if (marketSource === 'used-generator') return true;
    if (vehicle.isUsed === true) return true;
    return false;
  }

  /**
   * getInGameYear
   * @description Resolve the current in-game year from gameState; falls back to real-world year when unavailable.
   */
  function getInGameYear(): number {
    let ts: number | null = null;
    const candidates: any[] = [
      gameState?.time?.now,
      gameState?.time,
      gameState?.gameTime?.now,
      gameState?.now,
      gameState?.currentTime,
      gameState?.clock?.now,
      gameState?.clock,
    ];
    for (const c of candidates) {
      if (c === undefined || c === null) continue;
      if (typeof c === 'number' && Number.isFinite(c)) {
        ts = Number(c);
        break;
      }
      if (typeof c === 'string' && !Number.isNaN(Date.parse(c))) {
        ts = Date.parse(c);
        break;
      }
      if (typeof c === 'object' && c !== null && typeof c.now === 'number' && Number.isFinite(c.now)) {
        ts = Number(c.now);
        break;
      }
    }
    if (!ts) ts = Date.now();
    return new Date(ts).getFullYear();
  }

  const [activeTab, setActiveTab] = useState<'new-trucks' | 'used-trucks' | 'new-trailers' | 'used-trailers'>('new-trailers');

  const [vehicles, setVehicles] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 150000]);
  const [sortBy, setSortBy] = useState<'price-low' | 'price-high' | 'availability'>('price-low');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);
  const [confirmStage, setConfirmStage] = useState(false);
  const [isProcessingPurchase, setIsProcessingPurchase] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [selectedDeliveryHubId, setSelectedDeliveryHubId] = useState<string | null>(null);

  // NEW: loading flag when fetching authoritative specs for the modal
  const [specsLoading, setSpecsLoading] = useState<boolean>(false);

  const [truckSearchTerm, setTruckSearchTerm] = useState('');
  const [truckPriceRange, setTruckPriceRange] = useState<[number, number]>([0, 200000]);
  const [truckSortBy, setTruckSortBy] = useState<'price-low' | 'price-high' | 'availability'>('price-low');
  const [truckCategoryFilter, setTruckCategoryFilter] = useState<'all' | TruckCategoryKey>('all');
  const [activeTruckCategoryTab, setActiveTruckCategoryTab] = useState<TruckCategoryKey>('medium');
  const [showOnlyTrucks, setShowOnlyTrucks] = useState<boolean>(false);

  // Pagination states (10 items per page)
  const ITEMS_PER_PAGE = 10;
  const [truckPage, setTruckPage] = useState<number>(1);
  const [trailerPage, setTrailerPage] = useState<number>(1);

  const company = gameState?.company ?? null;
  const [searchParams] = useSearchParams();

  // Used offers generated by the UsedTruckGenerator (persisted in localStorage)
  const [usedOffers, setUsedOffers] = useState<any[]>([]);

  useEffect(() => {
    // Load trailers dataset into local vehicles list
    setVehicles((TRAILERS || []).map((v: any) => ({ ...v })));
  }, []);

  useEffect(() => {
    // load generated used offers from storage initially and attempt to enrich each offer
    let mounted = true;

    const loadAndEnrich = async () => {
      try {
        const stored = readOffersFromStorage();
        const base = Array.isArray(stored) ? stored.map((s: any) => normalizeTechnicalFields(s)) : [];
        if (!mounted) return;
        setUsedOffers(base);

        // Best-effort: enrich each offer with authoritative specs (same strategy used for new trucks)
        const enriched = await Promise.all(
          base.map(async (offer: any) => {
            try {
              const candidates: string[] = [];
              if (offer.specifications?.modelId) candidates.push(String(offer.specifications.modelId));
              if (offer.modelId) candidates.push(String(offer.modelId));
              if (offer.id) candidates.push(String(offer.id));
              if (offer.brand && offer.model) {
                candidates.push(`${String(offer.brand)} ${String(offer.model)}`);
                candidates.push(`${String(offer.brand)}-${String(offer.model)}`);
                candidates.push(`${String(offer.brand).toLowerCase()}-${String(offer.model).toLowerCase()}`);
              }
              if (offer.marketEntry?.model) candidates.push(String(offer.marketEntry.model));
              const uniq = Array.from(new Set(candidates.map((c) => (c || '').trim()))).filter(Boolean);
              let found: any = null;
              for (const id of uniq) {
                try {
                  // try to fetch authoritative specs
                  // eslint-disable-next-line no-await-in-loop
                  const res = await fetchVehicleSpecs(id);
                  if (res && Object.keys(res).length > 0) {
                    found = res;
                    break;
                  }
                } catch {
                  // continue trying other candidates
                }
              }
              if (!found) return offer;

              // Merge authoritative specs but preserve listing metadata (price/condition/km/year)
              const mergedSpecs = { ...(offer.specifications ?? {}), ...(found.specifications ?? {}), ...found };
              if (offer.price !== undefined) mergedSpecs.price = offer.price;
              if (offer.condition !== undefined) mergedSpecs.condition = offer.condition;
              if (offer.kilometers !== undefined) mergedSpecs.kilometers = offer.kilometers;
              if (offer.year !== undefined) mergedSpecs.year = mergedSpecs.year ?? offer.year;

              const merged = { ...offer, specifications: mergedSpecs, marketEntry: JSON.parse(JSON.stringify(offer.marketEntry ?? offer)) };

              // Ensure normalized technical fields are present
              return normalizeTechnicalFields(merged);
            } catch {
              return offer;
            }
          })
        );

        if (!mounted) return;
        setUsedOffers(enriched);
      } catch {
        if (!mounted) return;
        setUsedOffers([]);
      }
    };

    void loadAndEnrich();

    // Listen for generator events and re-run enrichment
    const handler = () => {
      void loadAndEnrich();
    };
    window.addEventListener('tm:used-offers-generated', handler as EventListener);

    return () => {
      mounted = false;
      window.removeEventListener('tm:used-offers-generated', handler as EventListener);
    };
  }, []);

  const unifyTrucksList = (): any[] => unifyTrucksListLocal();

  /**
   * getFilteredTrailers
   * @description Return filtered trailers using canonical isTrailer() heuristic.
   */
  const getFilteredTrailers = (): any[] => {
    let filtered = vehicles.filter((v) => isTrailer(v) && v.category === (activeTab === 'new-trailers' ? 'new' : 'used'));

    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          (v.brand || '').toLowerCase().includes(s) ||
          (v.model || '').toLowerCase().includes(s) ||
          (String(v.specifications?.capacity || '') || '').toLowerCase().includes(s) ||
          (String(v.trailerClass || '') || '').toLowerCase().includes(s)
      );
    }

    filtered = filtered.filter(
      (v) =>
        (typeof v.price === 'number' ? v.price : Number(v.price || 0)) >= priceRange[0] &&
        (typeof v.price === 'number' ? v.price : Number(v.price || 0)) <= priceRange[1]
    );

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return Number(a.price || 0) - Number(b.price || 0);
        case 'price-high':
          return Number(b.price || 0) - Number(a.price || 0);
        case 'availability':
          return (a.availability || '').localeCompare(b.availability || '');
        default:
          return 0;
      }
    });

    return filtered;
  };

  /**
   * getFilteredTrucks
   * @description Return filtered trucks from the unified trucks list while ensuring canonical classification.
   *              Includes generated used offers when viewing used-trucks tab.
   */
  const getFilteredTrucks = (): any[] => {
    // Compose base list based on activeTab.
    let list: any[] = [];

    try {
      if (activeTab === 'used-trucks') {
        // Start with generated used offers (so generator offers appear prominently)
        list = Array.isArray(usedOffers) ? usedOffers.map((o: any) => ({ ...o })) : [];
        // Append canonical used trucks as fallback
        const canonicalUsed = unifyTrucksList().filter((t) => !isTrailer(t) && (t.category ?? '').toString().toLowerCase() === 'used');
        list = [...list, ...canonicalUsed];
      } else {
        // For new trucks view, read canonical trucks with 'new' category
        list = unifyTrucksList().filter((t) => !isTrailer(t) && t.category === (activeTab === 'new-trucks' ? 'new' : 'used'));
      }
    } catch (e) {
      // In case of unexpected data shapes, fall back to empty list
      // eslint-disable-next-line no-console
      console.warn('VehicleMarket.getFilteredTrucks failed to build base list', e);
      list = [];
    }

    // Normalize technical fields for all list items so used offers receive same spec keys
    try {
      list = list.map((t) => normalizeTechnicalFields(t));
    } catch {
      // ignore normalization failures, keep original list
    }

    if (activeTruckCategoryTab) {
      list = list.filter((t) => {
        const ton = Number(t.tonnage ?? t.specifications?.tonnage ?? t.specifications?.capacity ?? 0);
        const cat = (t.truckCategory || (ton > 12 ? 'Big' : ton >= 7.5 ? 'Medium' : 'Small')).toLowerCase();
        return cat === activeTruckCategoryTab.toLowerCase();
      });
    }

    if (truckSearchTerm) {
      const s = truckSearchTerm.toLowerCase();
      list = list.filter(
        (t) =>
          (t.brand || '').toLowerCase().includes(s) ||
          (t.model || '').toLowerCase().includes(s) ||
          (String(t.specifications?.capacity || '') || '').toLowerCase().includes(s)
      );
    }

    if (truckCategoryFilter !== 'all') {
      list = list.filter((t) => (t.truckCategory || '').toLowerCase() === truckCategoryFilter.toLowerCase());
    }

    list = list.filter(
      (t) =>
        (typeof t.price === 'number' ? t.price : Number(t.price || 0)) >= truckPriceRange[0] &&
        (typeof t.price === 'number' ? t.price : Number(t.price || 0)) <= truckPriceRange[1]
    );

    list.sort((a, b) => {
      switch (truckSortBy) {
        case 'price-low':
          return Number(a.price || 0) - Number(b.price || 0);
        case 'price-high':
          return Number(b.price || 0) - Number(a.price || 0);
        case 'availability':
          return (a.availability || '').localeCompare(b.availability || '');
        default:
          return 0;
      }
    });

    return list;
  };

  const filteredTrailers = useMemo(getFilteredTrailers, [vehicles, searchTerm, priceRange, sortBy, selectedClass, activeTab]);
  const filteredTrucks = useMemo(getFilteredTrucks, [
    truckSearchTerm,
    truckPriceRange,
    truckSortBy,
    truckCategoryFilter,
    activeTruckCategoryTab,
    activeTab,
    usedOffers, // ensure usedOffers updates re-evaluate the truck list
  ]);

  // Reset pages when filters or tab change (so user always starts at page 1)
  useEffect(() => {
    setTruckPage(1);
  }, [truckSearchTerm, truckPriceRange, truckSortBy, truckCategoryFilter, activeTruckCategoryTab, activeTab]);

  useEffect(() => {
    setTrailerPage(1);
  }, [searchTerm, priceRange, sortBy, selectedClass, activeTab]);

  // Compute paged arrays
  const truckTotalPages = Math.max(1, Math.ceil(filteredTrucks.length / ITEMS_PER_PAGE));
  const trailerTotalPages = Math.max(1, Math.ceil(filteredTrailers.length / ITEMS_PER_PAGE));

  const pagedTrucks = filteredTrucks.slice((truckPage - 1) * ITEMS_PER_PAGE, truckPage * ITEMS_PER_PAGE);
  const pagedTrailers = filteredTrailers.slice((trailerPage - 1) * ITEMS_PER_PAGE, trailerPage * ITEMS_PER_PAGE);

  if (!company) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Package className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">No Company Found</h2>
          <p className="text-slate-400">Please create a company first to access the vehicle market</p>
        </div>
      </div>
    );
  }

  /**
   * getUserHubs
   * @returns normalized user's hubs array
   */
  const getUserHubs = (): { id: string; name: string }[] => {
    if (Array.isArray(company?.hubs) && company.hubs.length > 0) {
      return company.hubs.map((h: any) => ({ id: String(h.id ?? h.name ?? Math.random()), name: h.name ?? h.city ?? 'Hub' }));
    }
    if (company?.hub) {
      const h = company.hub;
      return [{ id: String(h.id ?? h.name ?? 'hub-1'), name: h.name ?? h.city ?? 'Hub' }];
    }
    return [];
  };

  /**
   * openItemDetails
   * @description Open details modal for selected vehicle and attempt authoritative lookups for trucks.
   *              This now attempts to enrich the selected vehicle with authoritative technical specs
   *              from Supabase.public.vehicles via fetchVehicleSpecs (if available).
   */
  const openItemDetails = (vehicle: any | null) => {
    setPurchaseError(null);
    setConfirmStage(false);
    setIsProcessingPurchase(false);
    if (!vehicle) {
      setSelectedVehicle(null);
      return;
    }

    // We try to find authoritative dataset for used trucks by id or brand/model
    let authoritative: any | null = null;
    try {
      const looksLikeTruck = !isTrailer(vehicle) &&
        (((vehicle.type || '').toString().toLowerCase() === 'truck') ||
          Boolean(vehicle.truckCategory) ||
          Boolean(vehicle.tonnage) ||
          Boolean(vehicle.brand && vehicle.model));

      if (looksLikeTruck) {
        const unified = unifyTrucksList();
        // Prefer exact id matches first.
        authoritative = unified.find((t: any) => String(t.id) === String(vehicle.id)) ?? null;

        // Determine whether this market item should be treated as a market/used offer.
        // Market listings carry important metadata (price/condition/km). We MUST NOT overwrite
        // those fields, but we still want to enrich used offers with canonical technical specs
        // (engine, fuelConsumption, reliability, maxSpeed, etc.) when we can find a matching model.
        const marketOfferHint =
          (vehicle.marketSource && String(vehicle.marketSource).toLowerCase().includes('used')) ||
          Boolean(vehicle.marketEntry && Object.keys(vehicle.marketEntry).length > 0) ||
          isUsedVehicle(vehicle);

        // Attempt brand+model heuristics to find an authoritative dataset entry.
        // Unlike before, we perform this lookup even for market/used offers — we will only
        // merge the authoritative technical specifications below and preserve listing metadata.
        if (!authoritative && vehicle.brand && vehicle.model) {
          authoritative =
            unified.find(
              (t: any) =>
                String((t.brand || '').toLowerCase()).trim() === String((vehicle.brand || '').toLowerCase()).trim() &&
                String((t.model || '').toLowerCase()).trim() === String((vehicle.model || '').toLowerCase()).trim()
            ) ?? null;
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('VehicleMarket.openItemDetails: truck lookup failed', err);
      authoritative = null;
    }

    // If the market item came from a generator, or is a used offer, prefer the listing (vehicle)
    // but merge authoritative technical specifications where the listing lacks them.
    // This keeps market metadata (price, condition, km, year, availability) intact while
    // enriching the item with canonical technical specs from the authoritative dataset.
    const source = authoritative ?? vehicle;

    /**
     * Build merged object:
     * - Start with authoritative dataset when available (it provides canonical technical defaults)
     * - Overlay listing (vehicle) top-level fields so market-specific metadata wins
     * - Merge specifications by using authoritative.specifications as base and layering vehicle.specifications on top
     * - Ensure common market metadata keys are preserved from the vehicle when present
     */
    let merged: any = {};

    if (authoritative) {
      // Deep-clone authoritative as base
      merged = JSON.parse(JSON.stringify(authoritative));

      // Overlay top-level values from the vehicle (market/listing). We skip 'specifications'
      // because it is merged explicitly below.
      if (vehicle && typeof vehicle === 'object') {
        for (const k of Object.keys(vehicle)) {
          if (k === 'specifications') continue;
          // Copy listing-specific values (price, condition, year, km, availability, etc.) to merged
          merged[k] = vehicle[k];
        }
      }

      // Merge specifications: authoritative values are base, vehicle.specifications may override
      merged.specifications = {
        ...(authoritative.specifications ?? {}),
        ...(vehicle?.specifications ?? {})
      };
    } else {
      // No authoritative dataset: clone the listing directly
      merged = JSON.parse(JSON.stringify(vehicle ?? {}));
      merged.specifications = { ...(merged.specifications ?? {}) };
    }

    // Normalize and explicitly preserve critical market metadata from the listing when present.
    // Price: prefer explicit listing price variants when available.
    const priceCandidates = [
      'price',
      'listingPrice',
      'offerPrice',
      'purchasePrice',
      'amount',
      'marketPrice',
    ];
    for (const p of priceCandidates) {
      if (vehicle && vehicle[p] !== undefined && vehicle[p] !== null && String(vehicle[p]).trim() !== '') {
        merged.price = vehicle[p];
        break;
      }
    }

    // Condition (explicit numeric or percentage)
    if (vehicle && (vehicle.condition !== undefined && vehicle.condition !== null)) {
      merged.condition = vehicle.condition;
    }

    // Year resolution (explicit listing year preferred)
    const listedYear =
      vehicle?.year ??
      vehicle?.productionYear ??
      vehicle?.specifications?.year ??
      vehicle?.specifications?.productionYear;
    if (listedYear !== undefined && listedYear !== null) merged.year = listedYear;

    // Kilometres / mileage resolution (preserve listing mileage when present)
    const listedKm =
      vehicle?.kilometers ??
      vehicle?.km ??
      vehicle?.mileage ??
      vehicle?.specifications?.kilometers ??
      vehicle?.specifications?.mileage;
    if (listedKm !== undefined && listedKm !== null) {
      // Keep both common names to maximize downstream compatibility
      merged.kilometers = listedKm;
      merged.km = listedKm;
      merged.mileage = listedKm;
    }

    // Availability / deliveryDays preservation
    if (vehicle && (vehicle.availability !== undefined && vehicle.availability !== null)) {
      merged.availability = vehicle.availability;
    }
    if (vehicle && (vehicle.deliveryDays !== undefined && vehicle.deliveryDays !== null)) {
      merged.deliveryDays = vehicle.deliveryDays;
    }

    // Ensure marketEntry is preserved (original listing snapshot)
    merged.marketEntry = JSON.parse(JSON.stringify(vehicle?.marketEntry ?? vehicle ?? {}));

    // Final cloned object used by the modal
    const cloned = merged;

    // Resolve some normalized fields to ensure modal displays consistent keys
    const resolveField = (keyCandidates: string[] | string) => {
      const keys = Array.isArray(keyCandidates) ? keyCandidates : [keyCandidates];
      if (authoritative) {
        for (const k of keys) {
          if (authoritative[k] !== undefined && authoritative[k] !== null && authoritative[k] !== '') {
            return authoritative[k];
          }
          if (authoritative.specifications && authoritative.specifications[k] !== undefined && authoritative.specifications[k] !== null && authoritative.specifications[k] !== '') {
            return authoritative.specifications[k];
          }
        }
      }
      for (const k of keys) {
        if (vehicle && vehicle[k] !== undefined && vehicle[k] !== null && vehicle[k] !== '') {
          return vehicle[k];
        }
        if (vehicle && vehicle.specifications && vehicle.specifications[k] !== undefined && vehicle.specifications[k] !== null && vehicle.specifications[k] !== '') {
          return vehicle.specifications[k];
        }
      }
      for (const k of keys) {
        if (cloned.specifications && cloned.specifications[k] !== undefined && cloned.specifications[k] !== null && cloned.specifications[k] !== '') {
          return cloned.specifications[k];
        }
      }
      return null;
    };

    const resolvedGcw = resolveField(['gcw', 'gcwCategory', 'grossCombinationWeight', 'maxGcW', 'max_gcw', 'gcw_t']);
    if (resolvedGcw !== null && resolvedGcw !== undefined) {
      cloned.specifications = { ...(cloned.specifications ?? {}), gcw: resolvedGcw };
    }

    const resolvedFuelConsumption = resolveField([
      'fuelConsumption',
      'fuel_consumption',
      'consumption',
      'l100km',
      'fuel_l100km',
      'avgFuelConsumption',
      'avg_consumption',
      'fuelConsumptionL100km',
      'fuelConsumptionL100Km',
      'fuel_l_100km',
      'fuelL100km',
      'fuelConsumptionL/100km'
    ]);
    if (resolvedFuelConsumption !== null && resolvedFuelConsumption !== undefined) {
      cloned.specifications = { ...(cloned.specifications ?? {}), fuelConsumption: resolvedFuelConsumption };
    }

    const resolvedEngine = resolveField(['engine', 'enginePower', 'engine_power', 'power', 'engineDesc']);
    if (resolvedEngine !== null && resolvedEngine !== undefined) {
      cloned.specifications = { ...(cloned.specifications ?? {}), enginePower: resolvedEngine };
    }

    const resolvedFuelTank = resolveField([
      'fuelTankCapacity',
      'fuelTank',
      'fuel_tank',
      'fuel_tank_capacity',
      'fuelTankCap',
      'fuel_tank_cap',
      'fuelTankCapacityL',
      'fuel_tank_l',
      'fuelTankCapacityL100km',
      'fuel_tank_capacity_l'
    ]);
    if (resolvedFuelTank !== null && resolvedFuelTank !== undefined) {
      cloned.specifications = { ...(cloned.specifications ?? {}), fuelTankCapacity: resolvedFuelTank };
    }

    // DeliveryDays resolution
    const ton = Number(cloned.tonnage ?? cloned.specifications?.tonnage ?? cloned.specifications?.capacity ?? 0);
    const cat = (cloned.truckCategory || '').toString().toLowerCase();
    const isNew = (cloned.category ?? '').toString().toLowerCase() === 'new';
    const isSmall = cat === 'small' || ton < 7.5;
    const isMedium = cat === 'medium' || (ton >= 7.5 && ton <= 12);
    if (isNew && (isSmall || isMedium)) {
      if (cloned.deliveryDays === undefined || cloned.deliveryDays === null) {
        const parsed = parseAvailabilityDays(cloned.availability ?? cloned.specifications?.availability ?? '');
        if (parsed === null) {
          const days = randInt(1, 4);
          cloned.deliveryDays = days;
          cloned.availability = `${days} day${days === 1 ? '' : 's'}`;
          cloned.specifications = { ...(cloned.specifications ?? {}), availability: cloned.availability };
        } else {
          cloned.deliveryDays = parsed;
        }
      }
    } else {
      if (cloned.deliveryDays === undefined || cloned.deliveryDays === null) {
        const parsed = parseAvailabilityDays(cloned.availability ?? cloned.specifications?.availability ?? '');
        cloned.deliveryDays = parsed ?? 0;
      }
    }

    // Attach the canonical market entry so purchase persists source info
    cloned.marketEntry = JSON.parse(JSON.stringify(source));

    setSelectedVehicle(cloned);
    const hubs = getUserHubs();
    setSelectedDeliveryHubId(hubs.length > 0 ? hubs[0].id : null);

    /**
     * fetchAndMergeSpecs
     * @description Attempt to fetch authoritative technical specs for the selected vehicle using fetchVehicleSpecs.
     *              Tries multiple candidate identifiers (modelId, id, brand+model variants). Merges returned specs
     *              into selectedVehicle.specifications while preserving listing-specific metadata (price, condition, km).
     */
    const fetchAndMergeSpecs = async () => {
      setSpecsLoading(true);
      try {
        const candidates: string[] = [];
        if (cloned.specifications?.modelId) candidates.push(String(cloned.specifications.modelId));
        if (cloned.modelId) candidates.push(String(cloned.modelId));
        if (cloned.id) candidates.push(String(cloned.id));
        if (cloned.brand && cloned.model) {
          candidates.push(`${String(cloned.brand)} ${String(cloned.model)}`);
          candidates.push(`${String(cloned.brand)}-${String(cloned.model)}`);
          candidates.push(`${String(cloned.brand).toLowerCase()}-${String(cloned.model).toLowerCase()}`);
        }
        if (cloned.marketEntry?.model) candidates.push(String(cloned.marketEntry.model));
        // make unique and filter empty
        const uniq = Array.from(new Set(candidates.map((c) => (c || '').trim()))).filter(Boolean);
        let found: any = null;
        for (const id of uniq) {
          try {
            const res = await fetchVehicleSpecs(id);
            if (res && Object.keys(res).length > 0) {
              found = res;
              break;
            }
          } catch (err) {
            // continue trying other candidates
            // eslint-disable-next-line no-console
            console.warn('fetchVehicleSpecs attempt failed for', id, err);
          }
        }
        if (found) {
          // Merge authoritative result into specifications, but preserve critical market metadata
          const enrichedSpecs = { ...(cloned.specifications ?? {}), ...(found.specifications ?? {}), ...found };

          // Ensure listing metadata stays in specs so UI that reads only specs sees them
          if (cloned.price !== undefined) enrichedSpecs.price = cloned.price;
          if (cloned.condition !== undefined) enrichedSpecs.condition = cloned.condition;
          if (cloned.kilometers !== undefined) enrichedSpecs.kilometers = cloned.kilometers;

          // Also ensure common reliability/durability/maintenance fields from found are present
          if (found.reliability !== undefined && found.reliability !== null) {
            enrichedSpecs.reliability = enrichedSpecs.reliability ?? found.reliability;
          }
          if ((found.specifications && found.specifications.reliability) !== undefined && (found.specifications && found.specifications.reliability) !== null) {
            enrichedSpecs.reliability = enrichedSpecs.reliability ?? found.specifications.reliability;
          }
          if (found.durability !== undefined && found.durability !== null) {
            enrichedSpecs.durability = enrichedSpecs.durability ?? found.durability;
          }
          if (found.maintenanceGroup !== undefined && found.maintenanceGroup !== null) {
            enrichedSpecs.maintenanceGroup = enrichedSpecs.maintenanceGroup ?? found.maintenanceGroup;
          }

          // Resolve speed / maxSpeed from found payload (many possible keys)
          const resolvedSpeed =
            found.maxSpeed ??
            found.topSpeed ??
            found.speed ??
            (found.specifications && (found.specifications.maxSpeed ?? found.specifications.speed)) ??
            null;
          if (resolvedSpeed !== null && resolvedSpeed !== undefined) {
            enrichedSpecs.maxSpeed = enrichedSpecs.maxSpeed ?? resolvedSpeed;
            enrichedSpecs.speed = enrichedSpecs.speed ?? resolvedSpeed;
          }

          // Update selected vehicle in state with enriched specifications and mirror top-level compatibility fields
          setSelectedVehicle((prev) => {
            if (!prev) return prev;
            const next = { ...prev, specifications: enrichedSpecs };

            // Mirror reliability/durability/maintenance to top-level for components that read top-level
            if (enrichedSpecs.reliability !== undefined && enrichedSpecs.reliability !== null) {
              next.reliability = next.reliability ?? enrichedSpecs.reliability;
            }
            if (enrichedSpecs.durability !== undefined && enrichedSpecs.durability !== null) {
              next.durability = next.durability ?? enrichedSpecs.durability;
            }
            if (enrichedSpecs.maintenanceGroup !== undefined && enrichedSpecs.maintenanceGroup !== null) {
              next.maintenanceGroup = next.maintenanceGroup ?? enrichedSpecs.maintenanceGroup;
            }

            // Mirror speed/maxSpeed to top-level for compatibility with components that read top-level
            if (enrichedSpecs.maxSpeed !== undefined && enrichedSpecs.maxSpeed !== null) {
              next.maxSpeed = next.maxSpeed ?? enrichedSpecs.maxSpeed;
              next.speed = next.speed ?? enrichedSpecs.maxSpeed;
            }

            return next;
          });
        }
      } finally {
        setSpecsLoading(false);
      }
    };

    // Fire-and-forget fetch to enrich modal. This is best-effort and non-blocking.
    // The modal will update when enriched specs arrive.
    void fetchAndMergeSpecs();
  };

  const closeModal = () => {
    setSelectedVehicle(null);
    setConfirmStage(false);
    setIsProcessingPurchase(false);
    setPurchaseError(null);
    setSelectedDeliveryHubId(null);
  };

  /**
   * canPurchase
   * @description Basic affordability check.
   */
  const canPurchase = (vehicle: any | null) => {
    if (!vehicle) return false;
    const price = Number(vehicle.price ?? 0);
    return Number.isFinite(price) && price > 0 && (company.capital || 0) >= price;
  };

  /**
   * performPurchase
   * @description Perform the in-memory purchase: deduct capital and add item to company.trucks or company.trailers
   *              based on canonical isTrailer() heuristic. Preserve used-truck metadata when purchasing used offers.
   */
  const performPurchase = async () => {
    setPurchaseError(null);
    if (!selectedVehicle) {
      setPurchaseError('No vehicle selected.');
      return;
    }
    const price = Number(selectedVehicle.price ?? 0);
    if (!Number.isFinite(price) || price <= 0) {
      setPurchaseError('Invalid vehicle price.');
      return;
    }
    if ((company.capital || 0) < price) {
      setPurchaseError(`Insufficient funds: €${price.toLocaleString()} required.`);
      return;
    }

    let deliveryDays = Number(
      selectedVehicle.deliveryDays ?? parseAvailabilityDays(selectedVehicle.availability ?? selectedVehicle.specifications?.availability ?? '')
    );
    if (!Number.isFinite(deliveryDays) || deliveryDays === null || deliveryDays === undefined) deliveryDays = 0;

    const hubs = getUserHubs();
    const chosenHub = hubs.find((h) => String(h.id) === String(selectedDeliveryHubId)) ?? hubs[0] ?? null;
    if (hubs.length > 0 && !chosenHub) {
      setPurchaseError('Please select a delivery hub.');
      return;
    }

    setIsProcessingPurchase(true);

    try {
      const newCompany: any = {
        ...company,
        capital: Math.max(0, (company.capital || 0) - price),
      };

      const etaIso = deliveryDays > 0 ? new Date(Date.now() + deliveryDays * 24 * 60 * 60 * 1000).toISOString() : null;

      const purchasedIsTrailer = isTrailer(selectedVehicle);
      const purchasedIsUsedTruck = isUsedVehicle(selectedVehicle);
      const inGameYearForPurchase = getInGameYear();
      const resolvedUsedYearForPurchase =
        (selectedVehicle.year ??
          selectedVehicle.productionYear ??
          selectedVehicle.specifications?.year ??
          selectedVehicle.specifications?.productionYear ??
          inGameYearForPurchase) as number;

      const rawKmForPurchase =
        selectedVehicle.kilometers ??
        selectedVehicle.km ??
        selectedVehicle.mileage ??
        selectedVehicle.specifications?.kilometers ??
        selectedVehicle.specifications?.mileage ??
        0;
      const numericKmForPurchase = Number(rawKmForPurchase);
      const resolvedMileageForPurchase =
        purchasedIsUsedTruck && Number.isFinite(numericKmForPurchase) ? numericKmForPurchase : 0;

      if (!purchasedIsTrailer) {
        newCompany.trucks = Array.isArray(newCompany.trucks) ? [...newCompany.trucks] : [];
        const truckEntry = {
          id: selectedVehicle.id ?? `truck-${Date.now()}`,
          brand: selectedVehicle.brand ?? 'Unknown',
          model: selectedVehicle.model ?? '',
          // New vs used: use in-game year for new, resolved used year for used offers
          year: purchasedIsUsedTruck ? resolvedUsedYearForPurchase : inGameYearForPurchase,
          // Keep whatever condition the offer had (used trucks can be < 100%)
          condition: typeof selectedVehicle.condition === 'number' ? selectedVehicle.condition : 100,
          capacity: selectedVehicle.specifications?.capacity ?? selectedVehicle.capacity ?? 0,
          tonnage: selectedVehicle.tonnage ?? null,
          purchasePrice: price,
          // New vs used: new trucks start at 0 km, used trucks keep their advertised mileage
          mileage: resolvedMileageForPurchase,
          status: deliveryDays > 0 ? 'in-transit' : 'available',
          location:
            deliveryDays > 0
              ? chosenHub?.name ?? newCompany.hub?.city ?? 'Hub'
              : newCompany.hub?.city || newCompany.hub?.name || 'Hub',
          deliveryDays,
          deliveryEta: etaIso,
          deliveryHub: chosenHub ? { id: chosenHub.id, name: chosenHub.name } : null,
          specifications: selectedVehicle.specifications ?? undefined,
          // Keep full original market entry for debugging/analytics
          marketEntry: JSON.parse(JSON.stringify(selectedVehicle.marketEntry ?? selectedVehicle)),
        };
        newCompany.trucks.push(truckEntry);
      } else {
        newCompany.trailers = Array.isArray(newCompany.trailers) ? [...newCompany.trailers] : [];
        const trailerEntry = {
          id: selectedVehicle.id ?? `trailer-${Date.now()}`,
          brand: selectedVehicle.brand ?? 'Unknown',
          model: selectedVehicle.model ?? '',
          year: selectedVehicle.year ?? new Date().getFullYear(),
          condition: typeof selectedVehicle.condition === 'number' ? selectedVehicle.condition : 100,
          capacity: selectedVehicle.specifications?.capacity ?? selectedVehicle.capacity ?? 0,
          purchasePrice: price,
          status: deliveryDays > 0 ? 'in-transit' : 'available',
          location: deliveryDays > 0 ? (chosenHub?.name ?? newCompany.hub?.city ?? 'Hub') : (newCompany.hub?.city || newCompany.hub?.name || 'Hub'),
          deliveryDays,
          deliveryEta: etaIso,
          deliveryHub: chosenHub ? { id: chosenHub.id, name: chosenHub.name } : null,
          specifications: selectedVehicle.specifications ? JSON.parse(JSON.stringify(selectedVehicle.specifications)) : {},
          marketEntry: JSON.parse(JSON.stringify(selectedVehicle.marketEntry ?? selectedVehicle)),
        };
        newCompany.trailers.push(trailerEntry);
      }

      if (typeof createCompany === 'function') {
        createCompany(newCompany);
      }

      closeModal();
      navigate('/garage');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('VehicleMarket.performPurchase error', err);
      setPurchaseError('Failed to complete purchase. Please try again.');
    } finally {
      setIsProcessingPurchase(false);
    }
  };

  const classOptions = [
    { value: 'all', label: 'All Classes' },
    { value: 'Acid Tanker', label: 'Acid Tanker' },
    { value: 'Gas Tanker', label: 'Gas Tanker' },
    { value: 'Food-Grade Tanker', label: 'Food-Grade Tanker' },
    { value: 'Step Deck Trailer', label: 'Step Deck Trailer' },
    { value: 'Extendable Flatbed', label: 'Extendable Flatbed' },
    { value: 'Flatbed Trailer', label: 'Flatbed Trailer' },
    { value: 'Dump Trailer', label: 'Dump Trailer' },
    { value: 'Walking Floor Trailer', label: 'Walking Floor Trailer' },
    { value: 'Pneumatic Tanker', label: 'Pneumatic Tanker' },
    { value: 'Container Chassis', label: 'Container Chassis' },
    { value: 'Livestock Trailer', label: 'Livestock Trailer' },
    { value: 'Car Carrier', label: 'Car Carrier' },
    { value: 'Hopper Bottom Trailer', label: 'Hopper Bottom Trailer' },
    { value: 'Lowboy Trailer', label: 'Lowboy Trailer' },
    { value: 'Curtainside Trailer', label: 'Curtainside Trailer' },
    { value: 'Reefer Trailer', label: 'Reefer Trailer' },
    { value: 'Box Trailer', label: 'Box Trailer' },
    { value: 'Trailer', label: 'Other / Trailer' },
  ];

  const truckCategoryOptions = [
    { value: 'all', label: 'All Trucks' },
    { value: 'small', label: 'Small (3.5 - 7.5 t)' },
    { value: 'medium', label: 'Medium (7.5 - 12 t)' },
    { value: 'big', label: 'Big (> 12 t)' },
  ];

  const hubsForSelect = getUserHubs();

  /**
   * effectiveHubRefForModal
   * @description Resolve selectedDeliveryHubId into a hub object/reference for capacity checks.
   */
  const effectiveHubRefForModal = useMemo(() => {
    if (!company) return null;
    const sel = selectedDeliveryHubId ?? 'main';

    if (!sel || sel === 'main') {
      if (company.hub) return company.hub;
      const hubsArr = Array.isArray(company.hubs) ? company.hubs : Array.isArray(company.infrastructure?.hubs) ? company.infrastructure.hubs : [];
      if (hubsArr.length > 0) return hubsArr[0];
      if (company.mainHubId) return { id: company.mainHubId, level: company.hub?.level ?? 1 };
      return null;
    }

    const hubsArr = Array.isArray(company.hubs) ? company.hubs : Array.isArray(company.infrastructure?.hubs) ? company.infrastructure.hubs : [];
    const found = hubsArr.find((h: any) => String(h?.id ?? h?.name ?? '') === String(sel));
    if (found) return found;
    return sel;
  }, [company, selectedDeliveryHubId]);

  /**
   * hubInfoForModal
   * @description Compute hub capacity info for selectedDeliveryHubId to display in confirm area.
   */
  const hubInfoForModal = useMemo(() => {
    try {
      return getHubCapacityInfo(company, effectiveHubRefForModal);
    } catch {
      return { hubId: null, hubName: null, level: 1, maxAllowed: 0, assignedCount: 0, isFull: false };
    }
  }, [company, effectiveHubRefForModal]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Vehicle Market</h1>
          <p className="text-slate-400">Purchase or lease new trailers and trucks</p>
        </div>
{/* Balance element removed as requested */}
      </div>

      {/* Main Tabs */}
      <div className="bg-slate-800 rounded-xl p-1 border border-slate-700 grid grid-cols-4 gap-1 mb-6">
        {(() => {
          const tabs = [
            { id: 'new-trucks', label: 'New Trucks' },
            { id: 'used-trucks', label: 'Used Trucks' },
            { id: 'new-trailers', label: 'New Trailers' },
            { id: 'used-trailers', label: 'Used Trailers' },
          ];
          return (
            <>
              {tabs.map((tab) => {
                const isTrailerTab = tab.id.includes('trailer');
                const disabled = isTrailerTab && showOnlyTrucks;
                const baseClass = `px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2`;
                const activeClass = activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : '';
                const disabledClass = disabled ? 'text-slate-500 bg-slate-800 cursor-not-allowed opacity-60' : '';
                const normalClass = !activeClass && !disabled ? 'text-slate-400 hover:text-white hover:bg-slate-700' : '';
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      if (!disabled) setActiveTab(tab.id as any);
                    }}
                    disabled={disabled}
                    aria-disabled={disabled}
                    className={`${baseClass} ${activeClass || disabledClass || normalClass}`}
                  >
                    {isTrailerTab ? <Package className="w-4 h-4" /> : <TruckIcon className="w-4 h-4" />}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </>
          );
        })()}
      </div>

      {/* Filters */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {activeTab.includes('truck') ? (
            <>
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-slate-400 mb-2">Search Trucks</label>
                <div className="relative">
                  <input
                    type="text"
                    value={truckSearchTerm}
                    onChange={(e) => setTruckSearchTerm(e.target.value)}
                    placeholder="Search by brand, model or capacity..."
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-10 pr-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Price Range: €{truckPriceRange[0].toLocaleString()} - €{truckPriceRange[1].toLocaleString()}
                </label>
                <div className="space-y-2">
                  <input
                    type="range"
                    min={0}
                    max={200000}
                    step={500}
                    value={truckPriceRange[0]}
                    onChange={(e) => setTruckPriceRange([Number(e.target.value), truckPriceRange[1]])}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <input
                    type="range"
                    min={0}
                    max={200000}
                    step={500}
                    value={truckPriceRange[1]}
                    onChange={(e) => setTruckPriceRange([truckPriceRange[0], Number(e.target.value)])}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Category</label>
                <select
                  value={truckCategoryFilter}
                  onChange={(e) => setTruckCategoryFilter(e.target.value as any)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {truckCategoryOptions.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-slate-800 text-white">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Sort By</label>
                <select
                  value={truckSortBy}
                  onChange={(e) => setTruckSortBy(e.target.value as any)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="availability">Availability</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-slate-400 mb-2">Search Trailers</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by brand, model, tonnage or class..."
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-10 pr-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Price Range: €{priceRange[0].toLocaleString()} - €{priceRange[1].toLocaleString()}
                </label>
                <div className="space-y-2">
                  <input
                    type="range"
                    min={0}
                    max={150000}
                    step={1000}
                    value={priceRange[0]}
                    onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <input
                    type="range"
                    min={0}
                    max={150000}
                    step={1000}
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Class</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {classOptions.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-slate-800 text-white">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="availability">Availability</option>
                </select>
              </div>
            </>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-slate-400">{activeTab.includes('truck') ? `Showing ${filteredTrucks.length} trucks` : `Showing ${filteredTrailers.length} trailers`}</div>
          <button
            onClick={() => {
              if (activeTab.includes('truck')) {
                setTruckSearchTerm('');
                setTruckPriceRange([0, 200000]);
                setTruckSortBy('price-low');
                setTruckCategoryFilter('all');
                setActiveTruckCategoryTab('medium');
              } else {
                setSearchTerm('');
                setPriceRange([0, 150000]);
                setSortBy('price-low');
                setSelectedClass('all');
              }
            }}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <div className="space-y-2">
          {activeTab.includes('truck') ? (
            <>
              {/* Truck sub-tabs */}
              <div className="flex gap-2 mb-4">
                {(['small', 'medium', 'big'] as TruckCategoryKey[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => setActiveTruckCategoryTab(k)}
                    className={`px-3 py-2 rounded-md text-sm ${activeTruckCategoryTab === k ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                  >
                    {k === 'small' && 'Small Trucks'}
                    {k === 'medium' && 'Medium Trucks'}
                    {k === 'big' && 'Big Trucks'}
                  </button>
                ))}
              </div>

              {pagedTrucks.map((truck) => {
                // Derive production year and kilometers from various possible fields
                const year =
                  truck.productionYear ??
                  truck.year ??
                  truck.specifications?.productionYear ??
                  truck.specifications?.year ??
                  null;

                const kilometers =
                  truck.kilometers ??
                  truck.mileage ??
                  truck.specifications?.kilometers ??
                  truck.specifications?.mileage ??
                  null;

                // Ensure each displayTruck has an explicit price field resolved from common variants
                function resolvePrice(item: any): number | string | null {
                  if (!item) return null;
                  const candidates = [
                    item.price,
                    item.listingPrice,
                    item.marketPrice,
                    item.offerPrice,
                    item.cost,
                    item.purchasePrice,
                    item.salePrice,
                    item.amount,
                    // nested places
                    item.marketEntry?.price,
                    item.marketEntry?.listingPrice,
                    item.specifications?.price,
                    item.specifications?.listingPrice,
                  ];

                  for (const c of candidates) {
                    if (c !== undefined && c !== null && String(c).trim() !== '') return c;
                  }
                  return null;
                }

                const resolvedPrice = resolvePrice(truck);
                const normalizedPrice =
                  resolvedPrice !== null
                    ? (typeof resolvedPrice === 'string' && /^\s*-?\d+(?:[.,]\d+)?\s*$/.test(resolvedPrice)
                        ? Number(String(resolvedPrice).replace(/[,\\s]+/g, ''))
                        : resolvedPrice)
                    : truck.price ?? null;

                const displayTruck = {
                  ...(truck ?? {}),
                  year: year ?? (truck.year ?? truck.productionYear ?? null),
                  kilometers: kilometers ?? (truck.kilometers ?? truck.mileage ?? null),
                  price: normalizedPrice,
                };

                // For used trucks missing availability, synthesize immediate..2 days when generated
                const isUsed = isUsedVehicle(displayTruck);
                const parsed = parseAvailabilityDays(displayTruck.availability ?? displayTruck.specifications?.availability ?? '');
                if (isUsed && parsed === null) {
                  const d = randInt(0, 2);
                  displayTruck.deliveryDays = d;
                  displayTruck.availability = d === 0 ? 'immediately' : `${d} day${d === 1 ? '' : 's'}`;
                } else if (parsed !== null && (displayTruck.deliveryDays === undefined || displayTruck.deliveryDays === null)) {
                  displayTruck.deliveryDays = parsed;
                }

                return (
                  <TruckCard
                    key={displayTruck.id ?? truck.id}
                    id={displayTruck.id ?? truck.id}
                    brand={displayTruck.brand ?? truck.brand}
                    model={displayTruck.model ?? truck.model}
                    price={displayTruck.price ?? truck.price}
                    condition={displayTruck.condition ?? truck.condition}
                    availability={displayTruck.availability ?? truck.availability}
                    tonnage={displayTruck.tonnage ?? truck.tonnage}
                    leaseRate={displayTruck.leaseRate ?? truck.leaseRate}
                    truckCategory={displayTruck.truckCategory ?? truck.truckCategory}
                    cargoTypes={displayTruck.specifications?.cargoTypes ?? truck.specifications?.cargoTypes}
                    capacity={displayTruck.specifications?.capacity ?? truck.specifications?.capacity}
                    gcw={displayTruck.specifications?.gcw ?? displayTruck.gcw ?? truck.specifications?.gcw ?? truck.gcw ?? null}
                    year={displayTruck.year}
                    kilometers={displayTruck.kilometers}
                    marketSource={displayTruck.marketSource ?? truck.marketSource ?? null}
                    onClick={() => openItemDetails(displayTruck)}
                  />
                );
              })}

              {filteredTrucks.length === 0 && <div className="text-center py-8 text-slate-400">No trucks match the current filters.</div>}

              {/* Truck pager */}
              {filteredTrucks.length > ITEMS_PER_PAGE && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-slate-300">
                    Showing {Math.min((truckPage - 1) * ITEMS_PER_PAGE + 1, filteredTrucks.length)} - {Math.min(truckPage * ITEMS_PER_PAGE, filteredTrucks.length)} of {filteredTrucks.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTruckPage((p) => Math.max(1, p - 1))}
                      disabled={truckPage === 1}
                      className="px-3 py-2 rounded-md bg-slate-800 text-slate-300 disabled:opacity-60"
                    >
                      Prev
                    </button>
                    <div className="text-sm text-slate-300">
                      Page {truckPage} of {truckTotalPages}
                    </div>
                    <button
                      onClick={() => setTruckPage((p) => Math.min(truckTotalPages, p + 1))}
                      disabled={truckPage === truckTotalPages}
                      className="px-3 py-2 rounded-md bg-slate-800 text-slate-300 disabled:opacity-60"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {pagedTrailers.map((vehicle) => {
                const trailerFlag = isTrailer(vehicle);
                return (
                  <div
                    key={vehicle.id}
                    onClick={() => openItemDetails(vehicle)}
                    className="bg-slate-700 rounded-lg p-3 hover:bg-slate-600 transition-all duration-200 cursor-pointer border border-slate-600 hover:border-blue-500/50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className={`w-2 h-12 rounded-full ${trailerFlag ? 'text-purple-400 bg-purple-400/10' : 'text-blue-400 bg-blue-400/10'}`} />
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium text-white text-sm">
                              {vehicle.brand} {vehicle.model}
                            </h3>
                            <span className="inline-block px-3 py-0.5 rounded-full text-xs font-medium text-indigo-400 bg-indigo-400/10 ml-2">
                              {vehicle.trailerClass || 'Trailer'}
                            </span>
                          </div>

                          <div className="flex items-center space-x-3 text-xs text-slate-400 mt-1">
                            <span className={`${vehicle.condition === 100 ? 'text-green-400' : 'text-yellow-400'}`}>{vehicle.condition === 100 ? 'New' : `${vehicle.condition}% condition`}</span>

                            {vehicle.specifications?.capacity && (
                              <span className="flex items-center space-x-1">
                                <Package className="w-3 h-3 text-slate-400" />
                                <span>{vehicle.specifications.capacity}</span>
                              </span>
                            )}

                            <span className="flex items-center space-x-1 text-green-400">
                              <Calendar className="w-3 h-3" />
                              <span>{vehicle.availability}</span>
                            </span>
                          </div>

                          <div className="mt-1 text-xs text-slate-400">
                            <span className="text-slate-400">GCW:</span>
                            <span className="ml-2 inline-block px-2 py-0.5 rounded text-xs font-medium bg-slate-700 text-slate-300">
                              {(vehicle.gcw ?? vehicle.specifications?.gcw) ?? '—'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-xs text-slate-400">Purchase</div>
                          <div className="text-sm font-bold text-white">€{Number(vehicle.price || 0).toLocaleString()}</div>
                        </div>
                        {vehicle.leaseRate && (
                          <div className="text-right">
                            <div className="text-xs text-slate-400">Lease</div>
                            <div className="text-sm font-bold text-green-400"> €{vehicle.leaseRate}/mo</div>
                          </div>
                        )}
                        <div className="w-2 h-2 bg-blue-400 rounded-full" />
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredTrailers.length === 0 && <div className="text-center py-8 text-slate-400">No trailers match the current filters.</div>}

              {/* Trailer pager */}
              {filteredTrailers.length > ITEMS_PER_PAGE && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-slate-300">
                    Showing {Math.min((trailerPage - 1) * ITEMS_PER_PAGE + 1, filteredTrailers.length)} - {Math.min(trailerPage * ITEMS_PER_PAGE, filteredTrailers.length)} of {filteredTrailers.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTrailerPage((p) => Math.max(1, p - 1))}
                      disabled={trailerPage === 1}
                      className="px-3 py-2 rounded-md bg-slate-800 text-slate-300 disabled:opacity-60"
                    >
                      Prev
                    </button>
                    <div className="text-sm text-slate-300">
                      Page {trailerPage} of {trailerTotalPages}
                    </div>
                    <button
                      onClick={() => setTrailerPage((p) => Math.min(trailerTotalPages, p + 1))}
                      disabled={trailerPage === trailerTotalPages}
                      className="px-3 py-2 rounded-md bg-slate-800 text-slate-300 disabled:opacity-60"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Detail & Purchase Modal */}
      {selectedVehicle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Image / top area */}
            <div className="w-full">
              <img
                src={selectedVehicle.image || 'https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/cebc0a61-8420-4995-9f47-90bd4b063221.jpg'}
                alt={`${selectedVehicle.brand || ''} ${selectedVehicle.model || ''}`}
                className="w-full h-56 object-cover rounded-t-xl border-b border-slate-700"
                loading="lazy"
              />
            </div>

            {/* Details */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {selectedVehicle.brand || 'Unknown'} {selectedVehicle.model || ''}
                  </h2>
                  <div className="mt-2 text-slate-400">{selectedVehicle.trailerClass || selectedVehicle.truckCategory || 'Vehicle'}</div>
                </div>

                <button onClick={closeModal} className="text-slate-400 hover:text-white transition-colors" aria-label="Close">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-sm text-slate-400">Price</div>
                  <div className="text-lg font-bold text-white">€{Number(selectedVehicle.price || 0).toLocaleString()}</div>
                </div>

                {selectedVehicle.leaseRate && (
                  <div>
                    <div className="text-sm text-slate-400">Lease Rate</div>
                    <div className="text-lg font-bold text-green-400">€{selectedVehicle.leaseRate}/month</div>
                  </div>
                )}

                {selectedVehicle.tonnage && (
                  <div>
                    <div className="text-sm text-slate-400">Tonnage</div>
                    <div className="text-lg font-bold text-yellow-400">{selectedVehicle.tonnage} t</div>
                  </div>
                )}

                <div>
                  <div className="text-sm text-slate-400">Condition</div>
                  <div className="text-lg font-bold text-green-400">{selectedVehicle.condition ?? 100}%</div>
                </div>

                {/* Production Year */}
                <div>
                  <div className="text-sm text-slate-400">Production Year</div>
                  <div className="text-lg font-bold text-white">
                    {(() => {
                      const used = isUsedVehicle(selectedVehicle);
                      if (!used) {
                        return getInGameYear();
                      }
                      const year =
                        selectedVehicle.year ??
                        selectedVehicle.productionYear ??
                        selectedVehicle.specifications?.year ??
                        selectedVehicle.specifications?.productionYear ??
                        null;
                      return year ?? '—';
                    })()}
                  </div>
                </div>

                {/* Kilometres */}
                <div>
                  <div className="text-sm text-slate-400">Kilometres</div>
                  <div className="text-lg font-bold text-white">
                    {(() => {
                      const used = isUsedVehicle(selectedVehicle);
                      if (!used) return '0 km';
                      const km =
                        selectedVehicle.kilometers ??
                        selectedVehicle.km ??
                        selectedVehicle.mileage ??
                        selectedVehicle.specifications?.kilometers ??
                        selectedVehicle.specifications?.mileage ??
                        null;
                      if (km === null || km === undefined || Number.isNaN(Number(km))) return '—';
                      return `${Number(km).toLocaleString()} km`;
                    })()}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                {/** Show a small loading indicator while authoritative specs are fetched and merged */}
                {specsLoading ? (
                  <div className="py-6 flex items-center justify-center text-sm text-slate-400">Loading specifications…</div>
                ) : selectedVehicle?.type === 'trailer' || isTrailer(selectedVehicle) ? (
                  <TrailerTechnicalSpecs specs={selectedVehicle.specifications ?? selectedVehicle} />
                ) : (
                  <VehicleSpecsSelector vehicle={selectedVehicle} />
                )}
              </div>

              {selectedVehicle.specifications?.features?.length > 0 && (
                <div className="mb-4">
                  <div className="text-sm text-slate-400 mb-2">Features</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedVehicle.specifications.features.map((feature: string, idx: number) => (
                      <span key={idx} className="px-3 py-1 bg-slate-700 text-slate-300 rounded-full text-sm">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Purchase area */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    setPurchaseError(null);
                    setConfirmStage(true);
                    const hubs = getUserHubs();
                    if (hubs.length > 0 && !selectedDeliveryHubId) setSelectedDeliveryHubId(hubs[0].id);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Purchase</span>
                </button>

                {selectedVehicle.leaseRate && (
                  <button
                    onClick={() => {
                      setPurchaseError('Lease flow is not implemented in this dialog. Use Purchase for immediate ownership.');
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Lease</span>
                  </button>
                )}

                {isTrailer(selectedVehicle) && (
                  <button
                    onClick={() => setPurchaseError('Assign flow is available from Garage. Purchase trailer first and assign from Truck details.')}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                  >
                    <TruckIcon className="w-4 h-4" />
                    <span>Assign to Truck</span>
                  </button>
                )}
              </div>

              {/* Final confirm stage */}
              {confirmStage && (
                <div className="mt-4 bg-slate-800 border border-slate-700 rounded-lg p-4">
                  <div className="text-sm text-slate-400 mb-2">Confirm Purchase</div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-xs text-slate-400">Item</div>
                      <div className="text-white font-medium">
                        {selectedVehicle.brand} {selectedVehicle.model}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Total</div>
                      <div className="text-white font-bold">€{Number(selectedVehicle.price || 0).toLocaleString()}</div>
                    </div>
                  </div>

                  {purchaseError && <div className="mb-3 text-sm text-red-300">{purchaseError}</div>}

                  <div className="mb-3">
                    <label className="block text-sm text-slate-300 mb-2">Deliver to</label>
                    <select value={selectedDeliveryHubId ?? 'main'} onChange={(e) => setSelectedDeliveryHubId(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white">
                      {hubsForSelect.length === 0 && <option value="">No hubs available (create a hub first)</option>}
                      {hubsForSelect.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name}
                        </option>
                      ))}
                    </select>
                    <div className="text-xs text-slate-400 mt-2">
                      Delivery in <span className="text-white font-semibold">{selectedVehicle.deliveryDays ?? parseAvailabilityDays(selectedVehicle.availability ?? selectedVehicle.specifications?.availability ?? '') ?? 0}</span> day(s).
                    </div>
                  </div>

                  <div className="mb-3">
                    <ConfirmPurchaseHubInfo
                      hubName={hubInfoForModal.hubName ?? undefined}
                      assignedCount={hubInfoForModal.assignedCount}
                      maxAllowed={hubInfoForModal.maxAllowed}
                      level={hubInfoForModal.level}
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        if (hubsForSelect.length > 0 && !selectedDeliveryHubId) {
                          setPurchaseError('Please select a delivery hub.');
                          return;
                        }
                        // Only block if maxAllowed is a positive number and we are actually over capacity
                        if (hubInfoForModal.maxAllowed > 0 && hubInfoForModal.assignedCount >= hubInfoForModal.maxAllowed) {
                          setPurchaseError('Selected hub is at capacity. Choose a different hub or free up space.');
                          return;
                        }
                        performPurchase();
                      }}
                      disabled={isProcessingPurchase || !(company && (company.capital || 0) >= Number(selectedVehicle.price || 0))}
                      className={`flex-1 ${isProcessingPurchase ? 'bg-blue-700/60' : 'bg-blue-600 hover:bg-blue-700'} text-white py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-60`}
                    >
                      {isProcessingPurchase ? 'Processing...' : 'Confirm Purchase'}
                    </button>

                    <button
                      onClick={() => {
                        setConfirmStage(false);
                        setPurchaseError(null);
                      }}
                      className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleMarket;
