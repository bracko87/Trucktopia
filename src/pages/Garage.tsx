/**
 * src/pages/Garage.tsx
 *
 * Garage page showing truck fleet and trailer fleet side-by-side in the existing layout.
 *
 * Responsibilities:
 * - Render Truck Fleet (keeps original visual layout and controls)
 * - Render Trailer Fleet as a separate visible block (Purchase Trailer button provided)
 * - Implement sellTruck and sellTrailer actions that remove items from the persisted company state
 *
 * Notes:
 * - Uses GameContext.createCompany to persist company updates (keeps behavior consistent with rest of app)
 * - Defensive: protects against missing company and missing arrays
 */

import React, { useMemo, useState } from 'react';
import { useGame } from '../contexts/GameContext';
import { Truck, Package, MapPin, Wrench, User, DollarSign, Plus, Trash2 } from 'lucide-react';

/**
 * TruckCardProps
 * @description Props for the TruckCard presentational component
 */
interface TruckCardProps {
  truck: any;
  assignedTrailer?: any | null;
  onSell: (truckId: string) => void;
}

/**
 * TrailerCardProps
 * @description Props for the TrailerCard presentational component
 */
interface TrailerCardProps {
  trailer: any;
  isAssigned: boolean;
  onSell: (trailerId: string) => void;
}

/**
 * TruckCard
 * @description Presentational card for a truck. Small reusable unit inside the page.
 */
const TruckCard: React.FC<TruckCardProps> = ({ truck, assignedTrailer, onSell }) => {
  const registration = truck?.registration ?? `${(truck?.brand ?? 'XX').slice(0, 2).toUpperCase()}-${Math.floor(Math.random() * 9000) + 1000}`;
  const location = truck?.location ?? 'Hub';
  const condition = typeof truck?.condition === 'number' ? truck.condition : 100;
  const fuel = typeof truck?.fuel === 'number' ? truck.fuel : 0;
  const status = truck?.status ?? 'available';

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Truck className="w-4 h-4 text-orange-400" />
            <span className="font-medium text-white">{truck?.brand} {truck?.model}</span>
            <span className="text-xs text-slate-400">({truck?.year ?? '—'})</span>
          </div>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${status === 'available' ? 'text-green-400 bg-green-400/10' : status === 'on-job' ? 'text-blue-400 bg-blue-400/10' : 'text-slate-400 bg-slate-400/10'}`}>
            {status}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors" onClick={() => { /* toggle details would be here in the original layout */ }}>
            Details
          </button>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4 text-slate-400">
          <span>Reg: {registration}</span>
          <span>{location}</span>
        </div>
        {assignedTrailer ? (
          <div className="flex items-center space-x-1 text-blue-400">
            <Package className="w-3 h-3" />
            <span className="text-xs">{assignedTrailer?.type} ({assignedTrailer?.capacity ?? assignedTrailer?.tonnage ?? '—'}t)</span>
          </div>
        ) : (
          <span className="text-xs text-slate-500">No trailer</span>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-600">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-400">Condition:</span>
            <div className="flex items-center space-x-2 mt-1">
              <div className="w-16 bg-slate-600 rounded-full h-1">
                <div className={`h-1 rounded-full ${condition >= 70 ? 'bg-green-500' : condition >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${condition}%` }} />
              </div>
              <span className="text-white">{condition}%</span>
            </div>
          </div>
          <div>
            <span className="text-slate-400">Fuel:</span>
            <div className="flex items-center space-x-2 mt-1">
              <div className="w-16 bg-slate-600 rounded-full h-1">
                <div className={`h-1 rounded-full ${fuel >= 60 ? 'bg-green-500' : fuel >= 30 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${fuel}%` }} />
              </div>
              <span className="text-white">{fuel}%</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end space-x-2">
          <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors">Drive to Hub</button>
          <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors">Schedule Service</button>
          <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors" onClick={() => onSell(truck?.id)}>
            <Trash2 className="inline w-4 h-4 mr-2" /> Sell Truck
          </button>
          <button className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors">View History</button>
        </div>
      </div>
    </div>
  );
};

/**
 * TrailerCard
 * @description Presentational card for a trailer. Small reusable unit inside the page.
 */
const TrailerCard: React.FC<TrailerCardProps> = ({ trailer, isAssigned, onSell }) => {
  const idShort = String(trailer?.id ?? '').slice(-6);
  const location = trailer?.location ?? 'Hub';
  const capacity = trailer?.capacity ?? trailer?.tonnage ?? '—';
  const condition = typeof trailer?.condition === 'number' ? trailer.condition : 100;

  return (
    <div className="bg-slate-700 rounded-lg border border-slate-600 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Package className="w-4 h-4 text-blue-400" />
            <span className="font-medium text-white capitalize">{trailer?.trailerClass ?? trailer?.type ?? 'Trailer'}</span>
            <span className="text-xs text-slate-400">({trailer?.year ?? '—'})</span>
          </div>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${isAssigned ? 'text-blue-400 bg-blue-400/10' : 'text-green-400 bg-green-400/10'}`}>
            {isAssigned ? 'Assigned' : 'Available'}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-300">ID: {idShort}</span>
          <button className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors" onClick={() => onSell(trailer?.id)}>
            <Trash2 className="inline w-3 h-3 mr-1" /> Sell
          </button>
        </div>
      </div>

      <div className="mt-2 text-sm text-slate-400 flex items-center justify-between">
        <div>Capacity: <span className="text-white font-medium ml-1">{capacity}t</span></div>
        <div>Location: <span className="text-white font-medium ml-1">{location}</span></div>
      </div>

      <div className="mt-2">
        <div className="w-full bg-slate-600 rounded-full h-2">
          <div className={`h-2 rounded-full ${condition >= 70 ? 'bg-green-500' : condition >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${condition}%` }} />
        </div>
        <div className="text-xs text-slate-300 mt-1">Condition: {condition}%</div>
      </div>
    </div>
  );
};

/**
 * Garage
 * @description Page component rendering trucks and trailers, with purchase and sell operations.
 */
const Garage: React.FC = () => {
  const { gameState, createCompany } = useGame();
  const company = gameState?.company ?? null;

  const trucks: any[] = Array.isArray(company?.trucks) ? company?.trucks : [];
  const trailers: any[] = Array.isArray(company?.trailers) ? company?.trailers : [];

  const [purchasing, setPurchasing] = useState(false);

  /**
   * sellTrailer
   * @description Remove trailer by id from company.trailers and unassign from any trucks.
   */
  const sellTrailer = (trailerId: string) => {
    if (!company) return;
    const trailer = trailers.find(t => t.id === trailerId);
    const name = trailer?.trailerClass ?? trailer?.model ?? trailerId;
    const ok = window.confirm(`Sell trailer "${name}"? This will permanently remove it from your company.`);
    if (!ok) return;

    const updatedTrailers = trailers.filter(t => t.id !== trailerId);
    // Unassign from any truck referencing this trailerId
    const updatedTrucks = trucks.map((t) => {
      if (String(t.assignedTrailer) === String(trailerId)) {
        return { ...t, assignedTrailer: '' };
      }
      return t;
    });

    const updatedCompany = { ...company, trailers: updatedTrailers, trucks: updatedTrucks };
    // Persist using createCompany (keeps app persistence conventions)
    createCompany(updatedCompany);
  };

  /**
   * sellTruck
   * @description Remove truck by id. If it has an assigned trailer, optionally remove that trailer as well.
   */
  const sellTruck = (truckId: string) => {
    if (!company) return;
    const truck = trucks.find(t => t.id === truckId);
    const truckName = `${truck?.brand ?? 'Truck'} ${truck?.model ?? ''}`.trim();
    const confirmSell = window.confirm(`Sell truck "${truckName}"? This will permanently remove it from your company.`);
    if (!confirmSell) return;

    const assignedTrailerId = truck?.assignedTrailer;
    let updatedTrailers = [...trailers];
    let updatedTrucks = trucks.filter(t => t.id !== truckId);

    if (assignedTrailerId) {
      // Ask whether to also sell the trailer
      const trailer = trailers.find(tr => String(tr.id) === String(assignedTrailerId));
      const trailerName = trailer?.trailerClass ?? trailer?.model ?? assignedTrailerId;
      const sellTrailerAlso = window.confirm(`This truck has an assigned trailer "${trailerName}". Do you also want to sell the trailer? Press OK to sell the trailer, Cancel to keep it unassigned.`);
      if (sellTrailerAlso) {
        updatedTrailers = trailers.filter(tr => String(tr.id) !== String(assignedTrailerId));
        // Remove assignment references from other trucks too (defensive)
        updatedTrucks = updatedTrucks.map(t => t.assignedTrailer === assignedTrailerId ? { ...t, assignedTrailer: '' } : t);
      } else {
        // If user keeps trailer, ensure no truck references the trailer (it was assigned to the truck we removed)
        updatedTrucks = updatedTrucks.map(t => (t.assignedTrailer === assignedTrailerId ? { ...t, assignedTrailer: '' } : t));
      }
    }

    const updatedCompany = { ...company, trucks: updatedTrucks, trailers: updatedTrailers };
    createCompany(updatedCompany);
  };

  /**
   * purchaseTrailer
   * @description Simple prompt-based purchase flow for a trailer. Adds trailer to company.
   */
  const purchaseTrailer = () => {
    if (!company) {
      alert('Please create a company before purchasing trailers.');
      return;
    }

    const type = window.prompt('Trailer type (e.g. Curtainside, Flatbed, Tanker):', 'Curtainside');
    if (!type) return;
    const capacityStr = window.prompt('Capacity (tons):', '30');
    if (!capacityStr) return;
    const priceStr = window.prompt('Purchase price (USD):', '25000');
    if (!priceStr) return;

    const capacity = Number(capacityStr) || 0;
    const price = Number(priceStr) || 0;

    const newTrailerId = `trailer-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const newTrailer: any = {
      id: newTrailerId,
      type: 'trailer',
      category: 'new',
      brand: company?.name ?? 'Local',
      model: `${type} Custom`,
      year: new Date().getFullYear(),
      price,
      tonnage: capacity,
      capacity,
      condition: 100,
      availability: 'In stock',
      trailerClass: type,
      location: company?.hub?.id ?? 'Hub'
    };

    const updatedCompany = {
      ...company,
      trailers: [...(company.trailers ?? []), newTrailer],
      capital: typeof company.capital === 'number' ? Math.max(0, company.capital - price) : company.capital
    };

    createCompany(updatedCompany);
    setPurchasing(false);
  };

  // Derived counts for fleet summary
  const totalTrucks = trucks.length;
  const availableTrucks = trucks.filter(t => t.status === 'available' || !t.status).length;
  const onJobTrucks = trucks.filter(t => t.status === 'on-job').length;
  const movingTrucks = trucks.filter(t => t.status === 'moving').length;

  return (
    <main className="flex-1 p-6 overflow-auto">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Truck Fleet</h1>
            <p className="text-slate-400">Manage your truck fleet and maintenance</p>
          </div>
          <div className="flex space-x-2">
            <button className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2">
              <Package className="w-4 h-4" />
              <span>View Trailers ({trailers.length})</span>
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2" onClick={() => { /* Purchase New Truck is unchanged - route or modal may be triggered elsewhere */ }}>
              <Plus className="w-4 h-4" />
              <span>Purchase New Truck</span>
            </button>
            {/* New Purchase Trailer button placed next to Purchase New Truck as requested */}
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2" onClick={purchaseTrailer}>
              <Plus className="w-4 h-4" />
              <span>Purchase Trailer</span>
            </button>
          </div>
        </div>

        {/* Trucks listing (keeps prior structure) */}
        <div className="space-y-2">
          {trucks.length === 0 ? (
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 text-slate-300">No trucks in your fleet yet.</div>
          ) : (
            trucks.map((truck) => {
              const assignedTrailer = trailers.find(t => String(t.id) === String(truck.assignedTrailer)) ?? null;
              return <TruckCard key={truck.id} truck={truck} assignedTrailer={assignedTrailer} onSell={sellTruck} />;
            })
          )}
        </div>

        {/* Trailer Fleet: new visible block placed before Fleet Summary (layout preserved) */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Package className="w-5 h-5 text-blue-400" />
              <span>Trailer Fleet ({trailers.length})</span>
            </h2>
            <div className="flex items-center space-x-2 text-sm text-slate-400">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>{trailers.filter(tr => !tr.assigned).length} Available</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span>{trailers.filter(tr => tr.assigned).length} Assigned</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {trailers.length === 0 ? (
              <div className="bg-slate-700 rounded-lg border border-slate-600 p-3 text-slate-400">No trailers available. Use "Purchase Trailer" to add one.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {trailers.map((trailer) => {
                  const isAssigned = trucks.some(t => String(t.assignedTrailer) === String(trailer.id));
                  return <TrailerCard key={trailer.id} trailer={trailer} isAssigned={isAssigned} onSell={sellTrailer} />;
                })}
              </div>
            )}
          </div>
        </div>

        {/* Fleet Summary (unchanged layout) */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-lg font-bold text-white mb-4">Fleet Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">{totalTrucks}</div>
              <div className="text-sm text-slate-400">Total Trucks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400 mb-1">{availableTrucks}</div>
              <div className="text-sm text-slate-400">Available</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400 mb-1">{onJobTrucks}</div>
              <div className="text-sm text-slate-400">On Job</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400 mb-1">{movingTrucks}</div>
              <div className="text-sm text-slate-400">Moving</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Garage;