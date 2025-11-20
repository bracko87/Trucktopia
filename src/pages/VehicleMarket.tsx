/**
 * VehicleMarket.tsx
 *
 * Page: Vehicle Market (trucks & trailers)
 *
 * Responsibilities:
 * - List trucks and trailers with filters
 * - Show a detail modal when an item is selected
 * - Provide an in-app two-step purchase flow (NO browser-native alerts/confirms)
 *   where Purchase -> in-modal Confirm -> final purchase action
 * - On successful purchase transfer the vehicle into the company trucks or trailers
 *   (so the Garage / Truck Fleet page sees it immediately) and navigate to /garage
 *
 * Notes:
 * - Defensive checks are used to avoid reading properties from undefined objects.
 * - All user-facing confirmations are handled in-app.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useGame } from '../contexts/GameContext';
import {
  Package,
  DollarSign,
  Calendar,
  Truck as TruckIcon,
  X,
  ArrowRight,
  Cpu,
  ShieldCheck,
  Star,
  Zap,
  Wrench,
} from 'lucide-react';
import { TRAILERS } from '../data/trailers';
import type { Vehicle as Trailer } from '../data/trailers';
import TruckCard from '../components/market/TruckCard';
import { TRUCKS, TruckCategoryKey } from '../data/trucks';

/**
 * VehicleMarket
 * @description Main component rendering the market. Implements a two-step in-app
 *              purchase confirmation and moves purchased vehicles into company state.
 */
const VehicleMarket: React.FC = () => {
  const navigate = useNavigate();
  const { gameState, createCompany } = useGame();

  // Tabs (new/used trucks/trailers)
  const [activeTab, setActiveTab] = useState<'new-trucks' | 'used-trucks' | 'new-trailers' | 'used-trailers'>(
    'new-trailers'
  );

  // Selected vehicle for details
  const [selectedVehicle, setSelectedVehicle] = useState<Trailer | any | null>(null);

  // Purchase modal states
  const [confirmStage, setConfirmStage] = useState(false); // when true, show final Confirm inside modal
  const [isProcessingPurchase, setIsProcessingPurchase] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  // Filters & lists for trailers
  const [vehicles, setVehicles] = useState<Trailer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 150000]);
  const [sortBy, setSortBy] = useState<'price-low' | 'price-high' | 'availability'>('price-low');
  const [selectedClass, setSelectedClass] = useState<string>('all');

  // Filters & lists for trucks
  const [truckSearchTerm, setTruckSearchTerm] = useState('');
  const [truckPriceRange, setTruckPriceRange] = useState<[number, number]>([0, 200000]);
  const [truckSortBy, setTruckSortBy] = useState<'price-low' | 'price-high' | 'availability'>('price-low');
  const [truckCategoryFilter, setTruckCategoryFilter] = useState<'all' | TruckCategoryKey>('all');
  const [activeTruckCategoryTab, setActiveTruckCategoryTab] = useState<TruckCategoryKey>('medium');

  const company = gameState.company;

  // Initialize trailers from static data
  useEffect(() => {
    setVehicles(TRAILERS.map(v => ({ ...v })));
  }, []);

  /**
   * getFilteredTrailers
   * @returns trailers filtered by activeTab and filter controls
   */
  const getFilteredTrailers = (): Trailer[] => {
    let filtered = vehicles.filter(
      v => v.type === 'trailer' && v.category === (activeTab === 'new-trailers' ? 'new' : 'used')
    );

    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter(v =>
        (v.brand || '').toLowerCase().includes(s) ||
        (v.model || '').toLowerCase().includes(s) ||
        (String(v.specifications?.capacity || '') || '').toLowerCase().includes(s) ||
        (String(v.trailerClass || '') || '').toLowerCase().includes(s)
      );
    }

    if (selectedClass !== 'all') {
      filtered = filtered.filter(v => (v.trailerClass || '').toLowerCase() === selectedClass.toLowerCase());
    }

    filtered = filtered.filter(v => (typeof v.price === 'number' ? v.price : Number(v.price || 0)) >= priceRange[0] && (typeof v.price === 'number' ? v.price : Number(v.price || 0)) <= priceRange[1]);

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
   * unifyTrucksList
   * @returns unified truck list from TRUCKS dataset
   */
  const unifyTrucksList = () => {
    return [...TRUCKS.small, ...TRUCKS.medium, ...TRUCKS.big];
  };

  /**
   * getFilteredTrucks
   * @returns trucks filtered by activeTab and truck controls
   */
  const getFilteredTrucks = () => {
    let list = unifyTrucksList().filter(t => t.category === (activeTab === 'new-trucks' ? 'new' : 'used'));

    if (activeTruckCategoryTab) {
      list = list.filter(t => {
        const cat = (t.truckCategory || (t.tonnage > 12 ? 'Big' : t.tonnage >= 7.5 ? 'Medium' : 'Small')).toLowerCase();
        return cat === activeTruckCategoryTab.toLowerCase();
      });
    }

    if (truckSearchTerm) {
      const s = truckSearchTerm.toLowerCase();
      list = list.filter(t =>
        (t.brand || '').toLowerCase().includes(s) ||
        (t.model || '').toLowerCase().includes(s) ||
        (String(t.specifications?.capacity || '') || '').toLowerCase().includes(s)
      );
    }

    if (truckCategoryFilter !== 'all') {
      list = list.filter(t => (t.truckCategory || '').toLowerCase() === truckCategoryFilter.toLowerCase());
    }

    list = list.filter(t => (typeof t.price === 'number' ? t.price : Number(t.price || 0)) >= truckPriceRange[0] && (typeof t.price === 'number' ? t.price : Number(t.price || 0)) <= truckPriceRange[1]);

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
  const filteredTrucks = useMemo(getFilteredTrucks, [truckSearchTerm, truckPriceRange, truckSortBy, truckCategoryFilter, activeTruckCategoryTab, activeTab]);

  // Simple guard: when company is missing show placeholder (no native dialogs)
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
   * openItemDetails
   * @description Opens the detail modal for a selected vehicle.
   */
  const openItemDetails = (vehicle: Trailer | any | null) => {
    setPurchaseError(null);
    setConfirmStage(false);
    setIsProcessingPurchase(false);
    setSelectedVehicle(vehicle);
  };

  /**
   * closeModal
   * @description Close the detail / purchase modal and reset modal-related state.
   */
  const closeModal = () => {
    setSelectedVehicle(null);
    setConfirmStage(false);
    setIsProcessingPurchase(false);
    setPurchaseError(null);
  };

  /**
   * canPurchase
   * @description Check if the current selectedVehicle is purchasable by company funds.
   */
  const canPurchase = (vehicle: any | null) => {
    if (!vehicle) return false;
    const price = Number(vehicle.price ?? 0);
    return Number.isFinite(price) && price > 0 && (company.capital || 0) >= price;
  };

  /**
   * performPurchase
   * @description Finalize purchase: deduct capital and append vehicle to company.trucks or company.trailers,
   *              persist via createCompany and navigate to /garage.
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

    setIsProcessingPurchase(true);

    try {
      // Prepare new arrays (immutably)
      const newCompany: any = {
        ...company,
        capital: Math.max(0, (company.capital || 0) - price),
      };

      // If vehicle is truck-like, add to company.trucks (Garage expects company.trucks)
      if ((selectedVehicle.type || '').toLowerCase() === 'truck' || selectedVehicle.tonnage || selectedVehicle.truckCategory) {
        newCompany.trucks = Array.isArray(newCompany.trucks) ? [...newCompany.trucks] : [];
        // Create minimal truck entry consistent with Garage expectations
        const truckEntry = {
          id: selectedVehicle.id ?? `truck-${Date.now()}`,
          brand: selectedVehicle.brand ?? 'Unknown',
          model: selectedVehicle.model ?? '',
          year: selectedVehicle.year ?? new Date().getFullYear(),
          condition: typeof selectedVehicle.condition === 'number' ? selectedVehicle.condition : 100,
          capacity: selectedVehicle.specifications?.capacity ?? selectedVehicle.capacity ?? 0,
          tonnage: selectedVehicle.tonnage ?? null,
          maintenanceCost: selectedVehicle.maintenanceCost ?? 0,
          purchasePrice: price,
          mileage: 0,
          status: 'available',
          location: newCompany.hub?.city || newCompany.hub?.name || 'Hub',
        };
        newCompany.trucks.push(truckEntry);
      } else {
        // Otherwise treat as trailer
        newCompany.trailers = Array.isArray(newCompany.trailers) ? [...newCompany.trailers] : [];
        const trailerEntry = {
          id: selectedVehicle.id ?? `trailer-${Date.now()}`,
          brand: selectedVehicle.brand ?? 'Unknown',
          model: selectedVehicle.model ?? '',
          year: selectedVehicle.year ?? new Date().getFullYear(),
          condition: typeof selectedVehicle.condition === 'number' ? selectedVehicle.condition : 100,
          capacity: selectedVehicle.specifications?.capacity ?? selectedVehicle.capacity ?? 0,
          trailerClass: selectedVehicle.trailerClass ?? null,
          purchasePrice: price,
          location: newCompany.hub?.city || newCompany.hub?.name || 'Hub',
        };
        newCompany.trailers.push(trailerEntry);
      }

      // Persist using createCompany from context which already enforces reputation etc.
      if (typeof createCompany === 'function') {
        createCompany(newCompany);
      }

      // Clear modal and navigate to garage where the new vehicle appears
      closeModal();
      navigate('/garage');
    } catch (err) {
      console.error('VehicleMarket.performPurchase error', err);
      setPurchaseError('Failed to complete purchase. Please try again.');
    } finally {
      setIsProcessingPurchase(false);
    }
  };

  // Class / truck category options used in filters
  const classOptions = [
    { value: 'all', label: 'All Classes' },
    { value: 'Acid Tanker', label: 'Acid Tanker' },
    { value: 'Gas Tanker', label: 'Gas Tanker' },
    { value: 'Food-Grade Tanker', label: 'Food-Grade Tanker' },
    { value: 'Industrial Tanker', label: 'Industrial Tanker' },
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
        {[
          { id: 'new-trucks', label: 'New Trucks' },
          { id: 'used-trucks', label: 'Used Trucks' },
          { id: 'new-trailers', label: 'New Trailers' },
          { id: 'used-trailers', label: 'Used Trailers' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
              activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            {tab.id.includes('trailer') ? <Package className="w-4 h-4" /> : <TruckIcon className="w-4 h-4" />}
            <span>{tab.label}</span>
          </button>
        ))}
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
                    onChange={e => setTruckSearchTerm(e.target.value)}
                    placeholder="Search by brand, model or capacity..."
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-10 pr-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="absolute left-3 top-2.5 text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"></circle>
                      <path d="m21 21-4.35-4.35"></path>
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Price Range: €{truckPriceRange[0].toLocaleString()} - €{truckPriceRange[1].toLocaleString()}</label>
                <div className="space-y-2">
                  <input type="range" min={0} max={200000} step={500} value={truckPriceRange[0]}
                    onChange={e => setTruckPriceRange([Number(e.target.value), truckPriceRange[1]])}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
                  <input type="range" min={0} max={200000} step={500} value={truckPriceRange[1]}
                    onChange={e => setTruckPriceRange([truckPriceRange[0], Number(e.target.value)])}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Category</label>
                <select value={truckCategoryFilter} onChange={e => setTruckCategoryFilter(e.target.value as any)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {truckCategoryOptions.map(opt => (
                    <option key={opt.value} value={opt.value} className="bg-slate-800 text-white">{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Sort By</label>
                <select value={truckSortBy} onChange={e => setTruckSortBy(e.target.value as any)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
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
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search by brand, model, tonnage or class..."
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-10 pr-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="absolute left-3 top-2.5 text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"></circle>
                      <path d="m21 21-4.35-4.35"></path>
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Price Range: €{priceRange[0].toLocaleString()} - €{priceRange[1].toLocaleString()}</label>
                <div className="space-y-2">
                  <input type="range" min={0} max={150000} step={1000} value={priceRange[0]}
                    onChange={e => setPriceRange([Number(e.target.value), priceRange[1]])}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
                  <input type="range" min={0} max={150000} step={1000} value={priceRange[1]}
                    onChange={e => setPriceRange([priceRange[0], Number(e.target.value)])}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Class</label>
                <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {classOptions.map(opt => (
                    <option key={opt.value} value={opt.value} className="bg-slate-800 text-white">{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Sort By</label>
                <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="availability">Availability</option>
                </select>
              </div>
            </>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-slate-400">
            {activeTab.includes('truck') ? `Showing ${filteredTrucks.length} trucks` : `Showing ${filteredTrailers.length} trailers`}
          </div>
          <button
            onClick={() => {
              if (activeTab.includes('truck')) {
                setTruckSearchTerm('');
                setTruckPriceRange([0, 200000]);
                setTruckSortBy('price-low');
                setTruckCategoryFilter('all');
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
                {(['small', 'medium', 'big'] as TruckCategoryKey[]).map(k => (
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

              {filteredTrucks.map(truck => (
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
                  onClick={() => openItemDetails(truck)}
                />
              ))}

              {filteredTrucks.length === 0 && <div className="text-center py-8 text-slate-400">No trucks match the current filters.</div>}
            </>
          ) : (
            <>
              {filteredTrailers.map(vehicle => (
                <div
                  key={vehicle.id}
                  onClick={() => openItemDetails(vehicle)}
                  className="bg-slate-700 rounded-lg p-3 hover:bg-slate-600 transition-all duration-200 cursor-pointer border border-slate-600 hover:border-blue-500/50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className={`w-2 h-12 rounded-full ${vehicle.type === 'truck' ? 'text-blue-400 bg-blue-400/10' : 'text-purple-400 bg-purple-400/10'}`} />
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-white text-sm">{vehicle.brand} {vehicle.model}</h3>
                          <span className="inline-block px-3 py-0.5 rounded-full text-xs font-medium text-indigo-400 bg-indigo-400/10 ml-2">{vehicle.trailerClass || 'Trailer'}</span>
                        </div>

                        <div className="flex items-center space-x-3 text-xs text-slate-400 mt-1">
                          <span className={`${vehicle.condition === 100 ? 'text-green-400' : 'text-yellow-400'}`}>{vehicle.condition === 100 ? 'New' : `${vehicle.condition}% condition`}</span>

                          {vehicle.specifications?.capacity && (
                            <span className="flex items-center space-x-1">
                              <Package className="w-3 h-3 text-slate-400" />
                              <span>{vehicle.specifications.capacity}</span>
                            </span>
                          )}

                          <span className="flex items-center space-x-1 text-green-400"><Calendar className="w-3 h-3" /><span>{vehicle.availability}</span></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-xs text-slate-400">Purchase</div>
                        <div className="text-sm font-bold text-white">€{Number(vehicle.price || 0).toLocaleString()}</div>
                      </div>
                      {vehicle.leaseRate && <div className="text-right"><div className="text-xs text-slate-400">Lease</div><div className="text-sm font-bold text-green-400"> €{vehicle.leaseRate}/mo</div></div>}
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    </div>
                  </div>
                </div>
              ))}

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
                  <h2 className="text-xl font-bold text-white">{selectedVehicle.brand || 'Unknown'} {selectedVehicle.model || ''}</h2>
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

              <div className="mb-4">
                <div className="text-sm text-slate-400 mb-2">Specifications</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  {selectedVehicle.specifications?.capacity && (
                    <div className="flex items-center space-x-2">
                      <Package className="w-4 h-4 text-blue-400" />
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
                        <span className="text-slate-300 font-medium">Capacity: {selectedVehicle.specifications.capacity}</span>
                        <span className="text-xs text-slate-400">{selectedVehicle.specifications.gross || 'Max payload'}</span>
                      </div>
                    </div>
                  )}

                  {selectedVehicle.specifications?.length && (
                    <div className="flex items-center space-x-2">
                      <ArrowRight className="w-4 h-4 text-green-400" />
                      <span className="text-slate-300">Length: {selectedVehicle.specifications.length}</span>
                    </div>
                  )}

                  {(selectedVehicle.specifications?.enginePower || selectedVehicle.specifications?.engine) && (
                    <div className="flex items-center space-x-2">
                      <Cpu className="w-4 h-4 text-rose-400" />
                      <span className="text-slate-300">Engine: {selectedVehicle.specifications?.enginePower || selectedVehicle.specifications?.engine}</span>
                    </div>
                  )}

                  {(selectedVehicle.reliability ?? selectedVehicle.specifications?.reliability) && (
                    <div className="flex items-center space-x-2" title={`Reliability: ${(selectedVehicle.reliability ?? selectedVehicle.specifications?.reliability)}`}>
                      <ShieldCheck className="w-4 h-4 text-teal-400" />
                      <span className="text-slate-300">Reliability: {selectedVehicle.reliability ?? selectedVehicle.specifications?.reliability}</span>
                    </div>
                  )}

                  {(selectedVehicle.durability ?? selectedVehicle.specifications?.durability) !== undefined && (selectedVehicle.durability ?? selectedVehicle.specifications?.durability) !== null && (
                    <div className="flex items-center space-x-2" title={`Durability: ${(selectedVehicle.durability ?? selectedVehicle.specifications?.durability)} / 10`}>
                      <Star className="w-4 h-4 text-yellow-400" />
                      <span className="text-slate-300">Durability: {selectedVehicle.durability ?? selectedVehicle.specifications?.durability}/10</span>
                    </div>
                  )}

                  {(selectedVehicle.specifications?.fuelConsumption ?? selectedVehicle.specifications?.fuelConsumptionL100km) !== undefined && (
                    <div className="flex items-center space-x-2" title={`Fuel consumption: ${(selectedVehicle.specifications?.fuelConsumption ?? selectedVehicle.specifications?.fuelConsumptionL100km)} L/100 km`}>
                      <Wrench className="w-4 h-4 text-orange-400" />
                      <span className="text-slate-300">Fuel: {(selectedVehicle.specifications?.fuelConsumption ?? selectedVehicle.specifications?.fuelConsumptionL100km)} L/100 km</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedVehicle.specifications?.features?.length > 0 && (
                <div className="mb-4">
                  <div className="text-sm text-slate-400 mb-2">Features</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedVehicle.specifications.features.map((feature: string, idx: number) => (
                      <span key={idx} className="px-3 py-1 bg-slate-700 text-slate-300 rounded-full text-sm">{feature}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Purchase area: two-step in-modal confirmation */}
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Primary Purchase Button: reveal final confirm stage */}
                <button
                  onClick={() => {
                    setPurchaseError(null);
                    setConfirmStage(true);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Purchase</span>
                </button>

                {/* Optional Lease button (kept as-is but non-blocking) */}
                {selectedVehicle.leaseRate && (
                  <button
                    onClick={() => {
                      // Lease behavior kept simple and in-app; convert native alerts to in-modal errors if needed
                      // For now show a simple not-implemented in-app message
                      setPurchaseError('Lease flow is not implemented in this dialog. Use Purchase for immediate ownership.');
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Lease</span>
                  </button>
                )}

                {/* Assign to Truck (trailers only) */}
                {selectedVehicle.type === 'trailer' && (
                  <button
                    onClick={() => setPurchaseError('Assign flow is available from Garage. Purchase trailer first and assign from Truck details.')}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                  >
                    <TruckIcon className="w-4 h-4" />
                    <span>Assign to Truck</span>
                  </button>
                )}
              </div>

              {/* Final confirm stage (last step) */}
              {confirmStage && (
                <div className="mt-4 bg-slate-800 border border-slate-700 rounded-lg p-4">
                  <div className="text-sm text-slate-400 mb-2">Confirm Purchase</div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-xs text-slate-400">Item</div>
                      <div className="text-white font-medium">{selectedVehicle.brand} {selectedVehicle.model}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Total</div>
                      <div className="text-white font-bold">€{Number(selectedVehicle.price || 0).toLocaleString()}</div>
                    </div>
                  </div>

                  {purchaseError && <div className="mb-3 text-sm text-red-300">{purchaseError}</div>}

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        // Final Confirm: run performPurchase (no browser dialogs)
                        performPurchase();
                      }}
                      disabled={isProcessingPurchase || !(company && (company.capital || 0) >= Number(selectedVehicle.price || 0))}
                      className={`flex-1 ${isProcessingPurchase ? 'bg-blue-700/60' : 'bg-blue-600 hover:bg-blue-700'} text-white py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-60`}
                    >
                      {isProcessingPurchase ? 'Processing...' : 'Confirm Purchase'}
                    </button>

                    <button
                      onClick={() => {
                        // Cancel final confirm stage
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
