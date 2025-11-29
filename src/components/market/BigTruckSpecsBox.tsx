/**
 * src/components/market/BigTruckSpecsBox.tsx
 *
 * Purpose:
 * - Render a compact technical specifications box for vehicles confidently classified
 *   as "big trucks" (heavy / articulated / large trucks).
 * - Display fields:
 *   GCW category (replaces Capacity), Engine, Reliability, Durability,
 *   Fuel Consumption (L/100 km Average), Max speed, Maintenance Group, Fuel tank capacity.
 *
 * Notes:
 * - Defensive: gracefully shows "—" when a value is missing.
 * - Conservative big-truck detection: uses tonnage/GCW thresholds and common name/class hints.
 * - Small and focused component to allow reuse across Vehicle Market and Fleet pages.
 */

import React from 'react';
import { Cpu, ShieldCheck, Star, Zap, Wrench, Package, ArrowRight } from 'lucide-react';

/**
 * Props
 * @description Component props for BigTruckSpecsBox. 'specs' is the raw specs object from data.
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
 * formatGcw
 * @description Format GCW category display (string-friendly). Accepts value or returns '—'.
 */
function formatGcw(val: any): string {
  if (val === undefined || val === null || val === '') return '—';
  // common GCW forms: "1.0", "1", "A", "B", "Rigid / Articulated", numeric tonnes etc.
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return `${val}`;
  return String(val);
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
 * isBigTruck
 * @description Conservative heuristic to detect big trucks:
 *  - Checks tonnage/payload keys and treats >= 13 t as big.
 *  - Checks for GCW or textual hints in class/name/specs fields (artic, tractor, heavy, articulated, big).
 *  - Returns true only when detection is confident, unless forceShow is true.
 */
function isBigTruck(specs: { [key: string]: any } | null | undefined, forceShow = false): boolean {
  if (forceShow) return true;
  if (!specs) return false;

  // Numeric candidates
  const weightCandidates = [
    'tonnage', 'tons', 'gcw', 'maxGcW', 'gcwCategory', 'gcw_category',
    'grossCombinationWeight', 'gcw_t', 'max_gcw', 'max_gcw_t', 'gross_combination_weight',
    // common nested keys
    'specifications.tonnage', 'specs.tonnage', 'spec.tonnage'
  ];
  for (const key of weightCandidates) {
    const raw = getFirstExisting(specs, [key]);
    const n = parseFirstNumber(raw);
    if (Number.isFinite(n)) {
      // if value probably in kg (large number) convert to tonnes
      const tonnes = Math.abs(n) > 50 ? n / 1000 : n;
      if (tonnes >= 13) return true;
      // if small can treat as not-big
      if (tonnes < 13) return false;
    }
  }

  // Textual hints
  const textCandidates = ['vehicleClass', 'class', 'category', 'type', 'model', 'brand', 'name', 'description', 'notes', 'truckCategory'];
  const hintWords = ['artic', 'articulated', 'tractor', 'heavy', 'semi', 'rigid', 'long-haul', 'big', 'heavy-duty', 'combination'];
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
 * BigTruckSpecsBox
 * @description Present a two-column list of core technical specs for big trucks.
 *              Returns null for non-big vehicles (conservative detection).
 */
const BigTruckSpecsBox: React.FC<Props> = ({ specs, forceShow = false }) => {
  if (!isBigTruck(specs, forceShow)) return null;

  const s = specs ?? {};

  // Primary GCW field (replaces Capacity for big trucks)
  const gcwRaw = getFirstExisting(s, [
    'gcw',
    'gcwCategory',
    'gcw_category',
    'grossCombinationWeight',
    'maxGcW',
    'max_gcw',
    'specifications.gcw',
    'specs.gcw',
    'spec.gcw'
  ]) ?? null;

  const engine =
    getFirstExisting(s, ['engine', 'enginePower', 'engine_power', 'power', 'engineDesc', 'specs.engine', 'spec.engine', 'specifications.engine']) ??
    null;

  const reliability =
    getFirstExisting(s, ['reliability', 'reliabilityRating', 'reliability_rating', 'reliabilityCategory', 'specs.reliability', 'specifications.reliability']) ?? null;

  const durability = getFirstExisting(s, ['durability', 'durabilityScore', 'durability_score', 'specs.durability', 'specifications.durability']) ?? null;

  // Expanded fuel consumption candidates to match the dataset used in src/data/trucks/big.ts
  const fuelConsumption =
    getFirstExisting(s, [
      'fuelConsumption',
      'fuelConsumptionL100km',
      'fuelConsumptionL100Km',
      'fuel_consumption',
      'fuel_l100km',
      'fuelL100km',
      'fuel_l_100km',
      'fuelL100Km',
      'fuelConsumptionL/100km',
      'consumption',
      'specs.fuelConsumptionL100km',
      'specifications.fuelConsumptionL100km',
      'spec.fuelConsumptionL100km',
      'specs.fuelConsumption',
      'specifications.fuelConsumption',
      'spec.fuelConsumption'
    ]) ?? null;

  const maxSpeed = getFirstExisting(s, ['maxSpeed', 'topSpeed', 'speed', 'speed_kmh', 'speedKmH']) ?? null;

  const maintenanceGroup = getFirstExisting(s, ['maintenanceGroup', 'maintenance_group', 'maintenance']) ?? null;

  const fuelTank = getFirstExisting(s, ['fuelTank', 'fuelTankCapacity', 'tankCapacity', 'fuel_tank_capacity']) ?? null;

  return (
    <div className="bg-slate-700 border border-slate-600 rounded-lg p-4">
      <div className="text-sm text-slate-300 mb-2">Technical Specifications</div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* GCW (replaces Capacity for big trucks) */}
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded bg-slate-800 text-slate-300">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-400">GCW</div>
            <div className="text-sm text-white font-medium">{formatGcw(gcwRaw)}</div>
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
            <div className="text-xs text-slate-400">Fuel Consumption</div>
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

export default BigTruckSpecsBox;