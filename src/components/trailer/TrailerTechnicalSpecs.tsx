/**
 * TrailerTechnicalSpecs.tsx
 *
 * Trailer-specific technical specifications component.
 *
 * Purpose:
 * - Render a compact two-column grid of trailer-only specs:
 *   GCW, Capacity (max payload), Reliability, Durability, Maintenance Group.
 * - Provide defensive rendering: missing values render as "—" (dash) and the component never reads properties
 *   that might be undefined without checks.
 * - Keep visual style consistent with existing specs UI (slate backgrounds, small icons, compact grid).
 */

import React from 'react';
import { Package, ShieldCheck, Star, Wrench } from 'lucide-react';

export interface TrailerSpecsProps {
  /**
   * Trailer specs object, may come from selectedVehicle.specifications or the vehicle object itself.
   * The component reads these fields defensively:
   * - gcw
   * - capacity (max payload)
   * - reliability
   * - durability
   * - maintenanceGroup
   */
  specs: Record<string, any> | null | undefined;
}

/**
 * formatSpecValue
 * @description Format a specification value for display. Use a dash for empty values.
 *              Numbers are localized. For capacity, if numeric we append ' kg' by default to
 *              make "max payload" clearer. This behavior is conservative and non-destructive.
 * @param keyKey label key (used for minor heuristics)
 * @param val raw value
 * @returns formatted string
 */
function formatSpecValue(keyKey: string, val: any): string {
  if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
    return '—';
  }

  // If it's a number, format with locale separators
  if (typeof val === 'number' && Number.isFinite(val)) {
    // For capacity, show in kg for clarity (common convention). If value already looks like a string with units, avoid adding.
    if (keyKey === 'capacity') {
      // If the number is large (>= 1000) we still show as kg but with separators
      return `${val.toLocaleString()} kg`;
    }
    return String(val.toLocaleString());
  }

  // If string that already contains unit characters, display as-is trimmed
  if (typeof val === 'string') {
    return val.trim();
  }

  // Fallback to JSON string
  try {
    return String(val);
  } catch {
    return '—';
  }
}

/**
 * TrailerTechnicalSpecs
 * @description Small, reusable component to render trailer-only technical fields.
 *              Matches existing visual style and is defensive against missing data.
 */
const TrailerTechnicalSpecs: React.FC<TrailerSpecsProps> = ({ specs }) => {
  // Defensive access of fields (allow top-level fallbacks too)
  const gcw =
    specs?.gcw ?? specs?.gcwCategory ?? specs?.grossCombinationWeight ?? specs?.maxGcW ?? specs?.gcw_t ?? null;

  const capacity =
    specs?.capacity ?? specs?.maxPayload ?? specs?.payload ?? specs?.payloadCapacity ?? specs?.max_payload ?? null;

  const reliability =
    specs?.reliability ?? specs?.reliabilityRating ?? specs?.reliability_category ?? null;

  const durability = specs?.durability ?? specs?.durabilityScore ?? specs?.durability_score ?? null;

  const maintenanceGroup = specs?.maintenanceGroup ?? specs?.maintenance_group ?? specs?.maintenance ?? null;

  return (
    <div className="bg-slate-700 border border-slate-600 rounded-lg p-4">
      {/* Header (kept minimal to match existing UI) */}
      <div className="text-sm text-slate-300 mb-2">Technical Specifications</div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* GCW */}
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded bg-slate-800 text-slate-300">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-400">GCW</div>
            <div className="text-sm text-white font-medium">{formatSpecValue('gcw', gcw)}</div>
          </div>
        </div>

        {/* Capacity (max payload) */}
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded bg-slate-800 text-slate-300">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Capacity (max payload)</div>
            <div className="text-sm text-white font-medium">{formatSpecValue('capacity', capacity)}</div>
          </div>
        </div>

        {/* Reliability */}
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded bg-slate-800 text-slate-300">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Reliability</div>
            <div className="text-sm text-white font-medium">{formatSpecValue('reliability', reliability)}</div>
          </div>
        </div>

        {/* Durability */}
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded bg-slate-800 text-slate-300">
            <Star className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Durability</div>
            <div className="text-sm text-white font-medium">{formatSpecValue('durability', durability)}</div>
          </div>
        </div>

        {/* Maintenance Group */}
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded bg-slate-800 text-slate-300">
            <Wrench className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Maintenance Group</div>
            <div className="text-sm text-white font-medium">{formatSpecValue('maintenanceGroup', maintenanceGroup)}</div>
          </div>
        </div>

        {/* filler for grid alignment when odd number of items */}
        <div />
      </div>
    </div>
  );
};

export default TrailerTechnicalSpecs;
