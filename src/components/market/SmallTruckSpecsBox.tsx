/**
 * src/components/market/SmallTruckSpecsBox.tsx
 *
 * Purpose:
 * - Render a compact technical specifications box for vehicles confidently classified
 *   as "small trucks" (vans / light trucks).
 * - Display only the requested fields:
 *   Capacity (Max payload), Engine, Reliability, Durability,
 *   Fuel Consumption (L/100 km Average), Max speed, Maintenance Group, Fuel tank capacity.
 *
 * Notes:
 * - Defensive: gracefully shows "—" when a value is missing.
 * - Conservative small-truck detection: uses tonnage/payload thresholds and common name/class hints.
 * - Does not change page layout or styles.
 */

import React from 'react';
import { Cpu, ShieldCheck, Star, Zap, Wrench, Package, ArrowRight } from 'lucide-react';

/**
 * Props
 * @description Component props for SmallTruckSpecsBox. 'specs' is the raw specs object from data.
 */
interface Props {
  specs?: { [key: string]: any } | null;
  /** Optional: allow forcing the box visible for debugging / QA */
  forceShow?: boolean;
}

/**
 * parseFirstNumber
 * @description Extract the first numeric value (integer or decimal) from a string or return number inputs as-is.
 * @param input any incoming value
 * @returns number | null
 */
function parseFirstNumber(input: any): number | null {
  if (input === undefined || input === null) return null;
  if (typeof input === 'number' && !Number.isNaN(input)) return input;
  const s = String(input);
  const m = s.match(/(-?\d+(\.\d+)?)/);
  if (!m) return null;
  return parseFloat(m[1]);
}

/**
 * getFirstExisting
 * @description Pick the first non-null/undefined/non-empty value among candidate keys in an object.
 */
function getFirstExisting(obj: { [key: string]: any } | null | undefined, keys: string[]): any | null {
  if (!obj) return null;
  for (const k of keys) {
    // support nested dot-notation keys
    const parts = k.split('.');
    let v: any = obj;
    for (const p of parts) {
      if (v === undefined || v === null) break;
      v = v[p];
    }
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return null;
}

/**
 * formatPayload
 * @description Normalize payload/capacity display. Accepts tonnes or kilograms heuristically.
 */
function formatPayload(val: any): string {
  const n = parseFirstNumber(val);
  if (!Number.isFinite(n)) return '—';
  // if greater than 50, assume kg -> convert to tonnes for display
  if (Math.abs(n) > 50) {
    const kg = Math.round(n);
    const t = +(kg / 1000).toFixed(2);
    return `${t} t (${kg} kg)`;
  }
  return `${+n.toFixed(2)} t`;
}

/**
 * formatLitres
 * @description Format a numeric litre value for fuel tank capacity.
 */
function formatLitres(val: any): string {
  const n = parseFirstNumber(val);
  if (!Number.isFinite(n)) return '—';
  return `${Math.round(n)} L`;
}

/**
 * formatFuelConsumption
 * @description Format fuel consumption in L/100 km.
 */
function formatFuelConsumption(val: any): string {
  const n = parseFirstNumber(val);
  if (!Number.isFinite(n)) return '—';
  return `${+n.toFixed(1)} L/100 km`;
}

/**
 * formatSpeed
 * @description Format max speed in km/h.
 */
function formatSpeed(val: any): string {
  const n = parseFirstNumber(val);
  if (!Number.isFinite(n)) return '—';
  return `${Math.round(n)} km/h`;
}

/**
 * isSmallTruck
 * @description Conservative heuristic to detect small trucks/vans:
 * - Checks payload/tonnage keys and treats <= 7.5 t as small.
 * - Checks textual hints in class/name/specs fields (van, tge, koffer, small, light).
 * - Returns true only when detection is confident, unless forceShow is true.
 */
function isSmallTruck(specs: { [key: string]: any } | null | undefined, forceShow = false): boolean {
  if (forceShow) return true;
  if (!specs) return false;

  // Known numeric keys to inspect for payload/tonnage
  const payloadCandidates = [
    'capacity', 'payload', 'maxPayload', 'payloadKg', 'payload_kg', 'tonnage', 'tons', 'max_payload',
    'spec_capacity', 'specs.capacity', 'spec.payload'
  ];
  for (const key of payloadCandidates) {
    const raw = getFirstExisting(specs, [key]);
    const n = parseFirstNumber(raw);
    if (Number.isFinite(n)) {
      // if value probably in kg (large number) convert to tons
      const tonnes = Math.abs(n) > 50 ? n / 1000 : n;
      if (tonnes <= 7.5) return true;
      // if it's obviously large, it's not small -> bail out negative detection
      if (tonnes > 7.5 && tonnes < 100) return false;
    }
  }

  // textual hints: check common class/model/name fields
  const textCandidates = ['vehicleClass', 'class', 'category', 'type', 'model', 'brand', 'name', 'description', 'notes'];
  const hintWords = ['van', 'tge', 'koffer', 'small', 'light', 'panel', 'ward', 'sprinter', 'transit', 'lt', 'luton'];
  for (const k of textCandidates) {
    const raw = getFirstExisting(specs, [k]);
    if (!raw) continue;
    const s = String(raw).toLowerCase();
    for (const hint of hintWords) {
      if (s.includes(hint)) return true;
    }
  }

  return false;
}

/**
 * SmallTruckSpecsBox
 * @description Present a two-column list of core technical specs for small trucks.
 *              Returns null for non-small vehicles (conservative detection).
 */
const SmallTruckSpecsBox: React.FC<Props> = ({ specs, forceShow = false }) => {
  // Show nothing if not a small truck
  if (!isSmallTruck(specs, forceShow)) return null;

  const s = specs ?? {};

  const capacityRaw =
    getFirstExisting(s, ['capacity', 'payload', 'maxPayload', 'payloadKg', 'payload_kg', 'max_payload', 'tonnage']) ?? null;

  const engine =
    getFirstExisting(s, ['engine', 'enginePower', 'engine_power', 'power', 'engineDesc', 'specs.engine', 'spec.engine']) ??
    null;

  const reliability =
    getFirstExisting(s, ['reliability', 'reliabilityRating', 'reliability_rating', 'reliabilityCategory']) ?? null;

  const durability = getFirstExisting(s, ['durability', 'durabilityScore', 'durability_score']) ?? null;

  const fuelConsumption =
    getFirstExisting(s, ['fuelConsumption', 'fuel_consumption', 'fuel_l100km', 'consumption']) ?? null;

  const maxSpeed = getFirstExisting(s, ['maxSpeed', 'topSpeed', 'speed', 'speed_kmh', 'speedKmH']) ?? null;

  const maintenanceGroup = getFirstExisting(s, ['maintenanceGroup', 'maintenance_group', 'maintenance']) ?? null;

  const fuelTank = getFirstExisting(s, ['fuelTank', 'fuelTankCapacity', 'tankCapacity', 'fuel_tank_capacity']) ?? null;

  return (
    <div className="bg-slate-700 border border-slate-600 rounded-lg p-4">
      <div className="text-sm text-slate-300 mb-2">Technical Specifications</div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Capacity */}
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded bg-slate-800 text-slate-300">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Capacity (Max payload)</div>
            <div className="text-sm text-white font-medium">{formatPayload(capacityRaw)}</div>
          </div>
        </div>

        {/* Engine */}
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded bg-slate-800 text-slate-300">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Engine</div>
            <div className="text-sm text-white font-medium">{engine ?? '—'}</div>
          </div>
        </div>

        {/* Reliability */}
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded bg-slate-800 text-slate-300">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Reliability</div>
            <div className="text-sm text-white font-medium">{reliability ?? '—'}</div>
          </div>
        </div>

        {/* Durability */}
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded bg-slate-800 text-slate-300">
            <Star className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Durability</div>
            <div className="text-sm text-white font-medium">{durability ?? '—'}</div>
          </div>
        </div>

        {/* Fuel consumption */}
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded bg-slate-800 text-slate-300">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Fuel Consumption (avg)</div>
            <div className="text-sm text-white font-medium">{formatFuelConsumption(fuelConsumption)}</div>
          </div>
        </div>

        {/* Max speed */}
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded bg-slate-800 text-slate-300">
            <ArrowRight className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Max speed</div>
            <div className="text-sm text-white font-medium">{formatSpeed(maxSpeed)}</div>
          </div>
        </div>

        {/* Maintenance group */}
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded bg-slate-800 text-slate-300">
            <Wrench className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Maintenance Group</div>
            <div className="text-sm text-white font-medium">{maintenanceGroup ?? '—'}</div>
          </div>
        </div>

        {/* Fuel tank */}
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded bg-slate-800 text-slate-300">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Fuel tank capacity</div>
            <div className="text-sm text-white font-medium">{formatLitres(fuelTank)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmallTruckSpecsBox;