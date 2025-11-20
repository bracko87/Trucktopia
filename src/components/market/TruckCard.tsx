/**
 * src/components/market/TruckCard.tsx
 *
 * Purpose:
 * - Reusable truck card used across the Vehicle Market UI.
 * - Displays truck basic info and a compact metadata row including capacity and fuel consumption.
 *
 * Notes:
 * - Component is defensive: it accepts either a single `truck` object or individual props.
 * - Adds a small fuel icon and the trailing "average consumption" label when fuel data is present.
 */

import React from 'react';
import { Calendar, Truck, Package as PackageIcon, Droplet, Info } from 'lucide-react';

/**
 * TruckSpecifications
 * @description Optional technical spec block for trucks.
 */
export interface TruckSpecifications {
  capacity?: string | number;
  enginePower?: string;
  fuelConsumption?: number; // L/100 km
  fuelConsumptionL100km?: number; // alias supported by some datasets
  cargoTypes?: string[];
  [key: string]: any;
}

/**
 * TruckCardProps
 * @description Props for the TruckCard component. Either pass a `truck` object
 * or individual primitive props (backwards-compatible).
 */
export interface TruckCardProps {
  truck?: {
    id?: string;
    brand?: string;
    model?: string;
    price?: number;
    condition?: number;
    availability?: string;
    tonnage?: number;
    leaseRate?: number;
    image?: string;
    truckCategory?: string;
    cargoTypes?: string[];
    specifications?: TruckSpecifications;
    // some datasets might have alternate keys
    fuelConsumption?: number;
    fuelConsumptionL100km?: number;
  };
  id?: string;
  brand?: string;
  model?: string;
  price?: number;
  condition?: number;
  availability?: string;
  tonnage?: number;
  leaseRate?: number;
  onClick?: () => void;
  truckCategory?: string;
  cargoTypes?: string[];
  capacity?: string;
  specifications?: TruckSpecifications;
}

/**
 * getFuelFromSpecs
 * @description Robust helper to extract a numeric or string fuel consumption
 * value from various possible keys and formats used in datasets.
 *
 * Supports:
 * - specifications.fuelConsumption
 * - specifications.fuelConsumptionL100km
 * - specifications.fuelConsumptionL100Km
 * - specifications.fuel_consumption
 * - specifications.fuel
 * - top-level merged.fuelConsumption / merged.fuelConsumptionL100km
 *
 * Returns null when no usable value found.
 */
function getFuelFromSpecs(merged: any): number | string | null {
  const candidates: Array<string> = [
    'fuelConsumption',
    'fuelConsumptionL100km',
    'fuelConsumptionL100Km',
    'fuel_consumption',
    'fuel',
    'fuel_l100km',
    'fuelL100km'
  ];

  // check top-level first (some datasets put it directly on the truck)
  for (const key of candidates) {
    if (merged[key] !== undefined && merged[key] !== null) {
      return merged[key];
    }
  }

  const specs = merged.specifications ?? merged.spec ?? null;
  if (!specs) return null;

  for (const key of candidates) {
    if (specs[key] !== undefined && specs[key] !== null) {
      return specs[key];
    }
  }

  // try common nested variants (string like "10 L/100 km")
  // Look for any numeric-like value in specs values
  for (const k of Object.keys(specs)) {
    const val = specs[k];
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      // try to find a number inside
      const m = val.match(/(\d+(\.\d+)?)/);
      if (m) return parseFloat(m[1]);
    }
  }

  return null;
}

/**
 * Component: TruckCard
 * @description Present a single truck entry. Renders a compact card with title,
 * metadata and pricing. When fuel consumption is available we render a droplet
 * icon before "Fuel: X L/100 km" and append "average consumption" at the end.
 */
const TruckCard: React.FC<TruckCardProps> = (props) => {
  // Normalize props so callers can either pass truck={...} or individual props.
  const {
    truck,
    id,
    brand,
    model,
    price,
    condition = 100,
    availability,
    tonnage,
    leaseRate,
    onClick,
    truckCategory,
    cargoTypes,
    capacity,
    specifications
  } = props;

  // Merge truck object (if provided) with individual props (individual props take precedence)
  const merged = {
    id: id ?? truck?.id,
    brand: brand ?? truck?.brand ?? 'Unknown',
    model: model ?? truck?.model ?? '',
    price: price ?? truck?.price ?? 0,
    condition: condition ?? truck?.condition ?? 100,
    availability: availability ?? truck?.availability ?? truck?.specifications?.availability,
    tonnage: tonnage ?? truck?.tonnage,
    leaseRate: leaseRate ?? truck?.leaseRate,
    truckCategory: truckCategory ?? truck?.truckCategory ?? truck?.specifications?.truckCategory,
    cargoTypes: cargoTypes ?? truck?.cargoTypes ?? truck?.specifications?.cargoTypes,
    capacity: capacity ?? truck?.capacity ?? truck?.specifications?.capacity,
    specifications: specifications ?? truck?.specifications ?? truck?.spec
  };

  /**
   * renderCapacity
   * @description Render the inline capacity indicator using a package icon.
   */
  const renderCapacity = () => {
    const cap = merged.capacity;
    if (!cap) return null;
    return (
      <span className="flex items-center space-x-1" title={`Capacity: ${cap}`}>
        <PackageIcon className="w-3 h-3 text-slate-400" />
        <span className="text-slate-300">{cap}</span>
      </span>
    );
  };

  /**
   * renderFuel
   * @description Render fuel consumption row with a droplet icon and trailing label.
   *              Example: [droplet] Fuel: 9 L/100 km average consumption
   */
  const renderFuel = () => {
    const fuelRaw = getFuelFromSpecs(merged);
    if (fuelRaw === null || fuelRaw === undefined) return null;

    // If the raw value is numeric, display as number
    const fuelText =
      typeof fuelRaw === 'number'
        ? `${fuelRaw} L/100 km`
        : // if string already contains unit, use as-is, otherwise append unit
          fuelRaw.toString().match(/[a-zA-Z]/)
        ? fuelRaw.toString()
        : `${fuelRaw} L/100 km`;

    return (
      <div className="flex items-center space-x-2" title={`Fuel consumption: ${fuelText}`}>
        <Droplet className="w-3 h-3 text-amber-400" />
        <span className="text-slate-300 text-sm">
          Fuel: {fuelText}{' '}
          <span className="text-slate-400">average consumption</span>
        </span>
      </div>
    );
  };

  // Defensive: if no meaningful data is present, render a lightweight placeholder
  if (!merged.brand && !merged.model && !merged.price) {
    // eslint-disable-next-line no-console
    console.warn('TruckCard: missing or invalid truck prop', truck ?? props);
    return (
      <div className="bg-slate-700 rounded-lg p-3 border border-slate-600">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-600 flex items-center justify-center">
            <Truck className="w-4 h-4 text-slate-200" />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-200">Missing truck data</div>
            <div className="text-xs text-slate-400">This card could not load details.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="bg-slate-700 rounded-lg p-3 hover:bg-slate-600 transition-all duration-200 cursor-pointer border border-slate-600 hover:border-blue-500/50"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 flex-1 min-w-0">
          <div className="w-2 h-12 rounded-full text-purple-400 bg-purple-400/10" />

          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="font-medium text-white text-sm truncate">
                {merged.brand} {merged.model}
              </h3>

              {typeof merged.tonnage === 'number' && (
                <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-md bg-yellow-400/10 text-yellow-300 border border-yellow-400/20 ml-1">
                  {merged.tonnage} t
                </span>
              )}

              <span className="inline-block px-3 py-0.5 rounded-full text-xs font-medium text-indigo-400 bg-indigo-400/10 ml-2">
                {merged.truckCategory || 'Truck'}
              </span>
            </div>

            <div className="mt-2 text-xs text-slate-400 flex items-center flex-wrap gap-3">
              {/* Condition badge (inline) */}
              <div className={`${merged.condition === 100 ? 'text-green-400' : 'text-yellow-400'} text-xs`}>
                {merged.condition === 100 ? 'New' : `${merged.condition}% condition`}
              </div>

              {/* Capacity (package icon + value) - renderCapacity returns a span so it sits inline */}
              {renderCapacity()}

              {/* Availability (calendar icon + text) */}
              {merged.availability && (
                <div className="flex items-center space-x-1 text-green-400 text-sm">
                  <Calendar className="w-3 h-3" />
                  <span className="text-slate-300 text-sm">{merged.availability}</span>
                </div>
              )}

              {/* Fuel consumption row (with icon and trailing "average consumption") */}
              {renderFuel()}
            </div>

            {/* Cargo type badges */}
            {merged.cargoTypes && merged.cargoTypes.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {merged.cargoTypes.slice(0, 3).map((ct) => (
                  <span
                    key={ct}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-700 text-slate-300 rounded-full text-xs border border-slate-600"
                    title={ct}
                  >
                    <PackageIcon className="w-3 h-3 text-slate-400" />
                    <span className="truncate max-w-[10rem]">{ct}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-xs text-slate-400">Purchase</div>
            <div className="text-sm font-bold text-white">${(merged.price ?? 0).toLocaleString()}</div>
          </div>

          {merged.leaseRate && (
            <div className="text-right">
              <div className="text-xs text-slate-400">Lease</div>
              <div className="text-sm font-bold text-green-400">${merged.leaseRate}/mo</div>
            </div>
          )}

          <Truck className="w-5 h-5 text-slate-400" />
        </div>
      </div>
    </div>
  );
};

export default TruckCard;
