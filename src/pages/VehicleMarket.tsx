/**
 * src/pages/VehicleMarket.tsx
 *
 * Vehicle Market page with defensive specs resolution.
 *
 * Purpose:
 * - Provide vehicle marketplace UI (trucks & trailers) with filters, tabs and purchase modal.
 * - Ensure classification is canonical by using the shared isTrailer heuristic rather than fragile `type` fields.
 *
 * Notes:
 * - Prefer canonical helpers from src/utils/vehicleTypeUtils for classification so UI and purchase flows remain consistent.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useGame } from '../contexts/GameContext';
import {
  Package,
  DollarSign,
  Calendar,
  Truck as TruckIcon,
  X,
  ArrowRight,
} from 'lucide-react';
import { TRAILERS } from '../data/trailers';
import TruckCard from '../components/market/TruckCard';
import MarketTabs from '../components/market/MarketTabs';
import { TRUCKS, TruckCategoryKey } from '../data/trucks';
import SmallTruckSpecsBox from '../components/market/SmallTruckSpecsBox';
import BigTruckSpecsBox from '../components/market/BigTruckSpecsBox';
import VehicleSpecsSelector from '../components/market/VehicleSpecsSelector';
import TrailerTechnicalSpecs from '../components/trailer/TrailerTechnicalSpecs';
import { isTrailer } from '../utils/vehicleTypeUtils';

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

  // Candidate keys that may contain fuel consumption in different datasets
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

  // Find first existing, non-empty candidate (authoritative top-level or nested specs)
  let foundFuel: any = null;
  for (const key of fuelCandidates) {
    // top-level
    if (cloned[key] !== undefined && cloned[key] !== null && String(cloned[key]).trim() !== '') {
      foundFuel = cloned[key];
      break;
    }
    // nested specs
    if (cloned.specifications && cloned.specifications[key] !== undefined && cloned.specifications[key] !== null && String(cloned.specifications[key]).trim() !== '') {
      foundFuel = cloned.specifications[key];
      break;
    }
    // try common dot-notation nested keys
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

  // Ensure availability / deliveryDays for new small/medium trucks
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
 * @description Main page component for the vehicle marketplace.
 */
const VehicleMarket: React.FC = () => {
  const navigate = useNavigate();
  const { gameState, createCompany } = useGame();

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

  const [truckSearchTerm, setTruckSearchTerm] = useState('');
  const [truckPriceRange, setTruckPriceRange] = useState<[number, number]>([0, 200000]);
  const [truckSortBy, setTruckSortBy] = useState<'price-low' | 'price-high' | 'availability'>('price-low');
  const [truckCategoryFilter, setTruckCategoryFilter] = useState<'all' | TruckCategoryKey>('all');
  const [activeTruckCategoryTab, setActiveTruckCategoryTab] = useState<TruckCategoryKey>('medium');
  const [showOnlyTrucks, setShowOnlyTrucks] = useState<boolean>(false);

  const company = gameState?.company ?? null;
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Load trailers dataset into local vehicles list (we still rely on isTrailer() to classify)
    setVehicles((TRAILERS || []).map((v: any) => ({ ...v })));
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
   */
  const getFilteredTrucks = (): any[] => {
    let list = unifyTrucksList().filter((t) => !isTrailer(t) && t.category === (activeTab === 'new-trucks' ? 'new' : 'used'));

    if (activeTruckCategoryTab) {
      list = list.filter((t) => {
        const cat = (t.truckCategory || (t.tonnage > 12 ? 'Big' : t.tonnage >= 7.5 ? 'Medium' : 'Small')).toLowerCase();
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
  ]);

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
   * @description
   * - Open modal with deep-cloned selected vehicle.
   * - For truck-like items attempt authoritative lookup in the canonical TRUCKS DB (by id, then brand+model).
   * - Inject authoritative technical fields (gcw, reliability, durability, maintenanceGroup, speed, fuelConsumption, enginePower,
   *   fuelTankCapacity) into cloned.specifications, preferring authoritative values first, then top-level vehicle props, then existing nested specs.
   * - Preserve prior deliveryDays availability logic.
   */
  const openItemDetails = (vehicle: any | null) => {
    setPurchaseError(null);
    setConfirmStage(false);
    setIsProcessingPurchase(false);
    if (!vehicle) {
      setSelectedVehicle(null);
      return;
    }

    // Attempt authoritative lookup only for items that are not trailers
    let authoritative: any | null = null;
    try {
      const looksLikeTruck = !isTrailer(vehicle) && (
        ((vehicle.type || '').toString().toLowerCase() === 'truck') ||
        Boolean(vehicle.truckCategory) ||
        Boolean(vehicle.tonnage) ||
        Boolean(vehicle.brand && vehicle.model)
      );

      if (looksLikeTruck) {
        const unified = unifyTrucksList();
        authoritative = unified.find((t: any) => String(t.id) === String(vehicle.id)) ?? null;
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

    // Use authoritative if found, otherwise fall back to the provided object
    const source = authoritative ?? vehicle;

    // clone to avoid mutating shared data
    const cloned = JSON.parse(JSON.stringify(source));

    // Ensure we have a specs object to write into
    if (!cloned.specifications) cloned.specifications = {};

    // Helper to resolve a field preferring (authoritative -> top-level vehicle -> nested specs)
    const resolveField = (keyCandidates: string[] | string, vehicleKey?: string) => {
      const keys = Array.isArray(keyCandidates) ? keyCandidates : [keyCandidates];
      // try authoritative first
      if (authoritative) {
        for (const k of keys) {
          if (authoritative[k] !== undefined && authoritative[k] !== null && authoritative[k] !== '') {
            return authoritative[k];
          }
          // nested
          if (authoritative.specifications && authoritative.specifications[k] !== undefined && authoritative.specifications[k] !== null && authoritative.specifications[k] !== '') {
            return authoritative.specifications[k];
          }
        }
      }
      // then top-level provided vehicle
      for (const k of keys) {
        if (vehicle && vehicle[k] !== undefined && vehicle[k] !== null && vehicle[k] !== '') {
          return vehicle[k];
        }
        if (vehicle && vehicle.specifications && vehicle.specifications[k] !== undefined && vehicle.specifications[k] !== null && vehicle.specifications[k] !== '') {
          return vehicle.specifications[k];
        }
      }
      // then existing nested specs
      for (const k of keys) {
        if (cloned.specifications && cloned.specifications[k] !== undefined && cloned.specifications[k] !== null && cloned.specifications[k] !== '') {
          return cloned.specifications[k];
        }
      }
      return null;
    };

    // Inject authoritative technical fields if available
    const resolvedGcw = resolveField(['gcw', 'gcwCategory', 'grossCombinationWeight', 'maxGcW', 'max_gcw', 'gcw_t']);
    if (resolvedGcw !== null && resolvedGcw !== undefined) {
      cloned.specifications = { ...(cloned.specifications ?? {}), gcw: resolvedGcw };
    }

    const resolvedReliability = resolveField(['reliability', 'reliabilityRating', 'reliability_category', 'reliabilityCategory']);
    if (resolvedReliability !== null && resolvedReliability !== undefined) {
      cloned.specifications = { ...(cloned.specifications ?? {}), reliability: resolvedReliability };
    }

    const resolvedDurability = resolveField(['durability', 'durabilityScore', 'durability_score']);
    if (resolvedDurability !== null && resolvedDurability !== undefined) {
      cloned.specifications = { ...(cloned.specifications ?? {}), durability: resolvedDurability };
    }

    const resolvedMaintenanceGroup = resolveField(['maintenanceGroup', 'maintenance_group', 'maintenance']);
    if (resolvedMaintenanceGroup !== null && resolvedMaintenanceGroup !== undefined) {
      cloned.specifications = { ...(cloned.specifications ?? {}), maintenanceGroup: resolvedMaintenanceGroup };
    }

    const resolvedSpeed = resolveField(['speed', 'maxSpeed', 'topSpeed', 'speed_kmh']);
    if (resolvedSpeed !== null && resolvedSpeed !== undefined) {
      cloned.specifications = { ...(cloned.specifications ?? {}), speed: resolvedSpeed };
    }

    // Expanded fuel consumption candidates to match dataset (top-level & nested)
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

    // NEW: Resolve fuel tank capacity (common keys and variants)
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

    // For small/medium new trucks ensure deliveryDays are set (existing logic preserved)
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

    setSelectedVehicle(cloned);
    const hubs = getUserHubs();
    setSelectedDeliveryHubId(hubs.length > 0 ? hubs[0].id : null);
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
   *              based on canonical isTrailer() heuristic.
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

      // Use canonical heuristic to decide where to place the purchased item
      const purchasedIsTrailer = isTrailer(selectedVehicle);

      if (!purchasedIsTrailer) {
        newCompany.trucks = Array.isArray(newCompany.trucks) ? [...newCompany.trucks] : [];
        const truckEntry = {
          id: selectedVehicle.id ?? `truck-${Date.now()}`,
          brand: selectedVehicle.brand ?? 'Unknown',
          model: selectedVehicle.model ?? '',
          year: selectedVehicle.year ?? new Date().getFullYear(),
          condition: typeof selectedVehicle.condition === 'number' ? selectedVehicle.condition : 100,
          capacity: selectedVehicle.specifications?.capacity ?? selectedVehicle.capacity ?? 0,
          tonnage: selectedVehicle.tonnage ?? null,
          purchasePrice: price,
          mileage: 0,
          status: deliveryDays > 0 ? 'in-transit' : 'available',
          location: deliveryDays > 0 ? (chosenHub?.name ?? newCompany.hub?.city ?? 'Hub') : (newCompany.hub?.city || newCompany.hub?.name || 'Hub'),
          deliveryDays,
          deliveryEta: etaIso,
          deliveryHub: chosenHub ? { id: chosenHub.id, name: chosenHub.name } : null,
          specifications: selectedVehicle.specifications ?? undefined,
          marketEntry: JSON.parse(JSON.stringify(selectedVehicle)),
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
          marketEntry: JSON.parse(JSON.stringify(selectedVehicle)),
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Vehicle Market</h1>
          <p className="text-slate-400">Purchase or lease new trailers and trucks</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-400">Company Balance</div>
          <div className="text-2xl font-bold text-green-400">€{(company.capital || 0).toLocaleString()}</div>
        </div>
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

              {filteredTrucks.map((truck) => (
                <TruckCard
                  key={truck.id}
                  id={truck.id}
                  brand={truck.brand}
                  model={truck.model}
                  price={truck.price}
                  condition={truck.condition}
                  availability={truck.availability}
                  tonnage={truck.tonnage}
                  leaseRate={truck.leaseRate}
                  truckCategory={truck.truckCategory}
                  cargoTypes={truck.specifications?.cargoTypes}
                  capacity={truck.specifications?.capacity}
                  /** Pass authoritative GCW category (prefer nested specifications then top-level gcw) */
                  gcw={truck.specifications?.gcw ?? truck.gcw ?? null}
                  onClick={() => openItemDetails(truck)}
                />
              ))}

              {filteredTrucks.length === 0 && <div className="text-center py-8 text-slate-400">No trucks match the current filters.</div>}
            </>
          ) : (
            <>
              {filteredTrailers.map((vehicle) => {
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

                          {/* GCW category (from dataset) */}
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
              </div>

              {/* Technical specifications area:
                  For big trucks we ensure GCW was injected into selectedVehicle.specifications
                  (from authoritative TRUCKS DB) so BigTruckSpecsBox displays GCW Category.
                  We avoid showing SmallTruckSpecsBox for big trucks to replace Capacity with GCW. */}
              <div className="mb-4">
                {/* Vehicle specs selector component: centralizes classification and rendering.
                   For trailers we render a specialized, trailer-only specs component that shows:
                   GCW, Capacity (max payload), Reliability, Durability and Maintenance Group.
                   For trucks / other vehicle types we preserve the existing VehicleSpecsSelector. */}
                {selectedVehicle?.type === 'trailer' || isTrailer(selectedVehicle) ? (
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
                    <select value={selectedDeliveryHubId ?? ''} onChange={(e) => setSelectedDeliveryHubId(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white">
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

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        if (hubsForSelect.length > 0 && !selectedDeliveryHubId) {
                          setPurchaseError('Please select a delivery hub.');
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