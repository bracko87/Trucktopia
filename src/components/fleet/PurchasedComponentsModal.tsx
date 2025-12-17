/**
 * PurchasedComponentsModal.tsx
 *
 * Modal that displays per-component condition values for a purchased truck.
 *
 * Responsibilities:
 * - Render a components-only popup listing key truck components and their current values.
 * - Initialize component values so the overall condition is a computed average of the components.
 * - Ensure components are not all the same value by introducing small deterministic variations
 *   (seeded by truckId when available) and normalizing so the average equals overallCondition.
 * - Provide accessible close behaviour and keep layout pixel-precise based on product targets.
 */

import React from 'react';

/**
 * Props for PurchasedComponentsModal
 * @property isOpen Whether the modal is visible.
 * @property onClose Called when the modal requests to close.
 * @property overallCondition Overall condition value (0-100). Used to initialize component values.
 * @property truckId Optional truck identifier (used as RNG seed so component distributions are stable per truck).
 */
interface PurchasedComponentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  overallCondition: number;
  truckId?: string | null;
}

/**
 * ComponentDefinition
 * @description Shape for each truck component shown in the modal.
 */
interface ComponentDefinition {
  key: string;
  label: string;
  description?: string;
}

/**
 * COMPONENTS_LIST
 * @description Canonical list of components to display for condition tracking.
 */
const COMPONENTS_LIST: ComponentDefinition[] = [
  { key: 'engine', label: 'Engine', description: 'Core power unit' },
  { key: 'transmission', label: 'Transmission', description: 'Gearbox & drivetrain' },
  { key: 'tires', label: 'Tires', description: 'Tires and rims' },
  { key: 'brakes', label: 'Brakes (Pads/Rotors/Drums/Calipers)', description: 'Braking system components' },
  { key: 'battery', label: 'Battery', description: 'Main battery & connections' },
  { key: 'cooling', label: 'Radiator / Cooling System', description: 'Radiator, water pump, cooling fan' },
  { key: 'alternator', label: 'Alternator', description: 'Charging system' },
  { key: 'fuel', label: 'Fuel System', description: 'Pump, injectors, filters' },
  { key: 'exhaust', label: 'Exhaust System', description: 'Muffler, catalytic converter, DPF' },
  { key: 'clutch', label: 'Clutch Assembly', description: 'Clutch & related parts' },
  { key: 'steering', label: 'Steering Components', description: 'Power steering pump, tie rods, steering box' }
];

/**
 * clampPercentage
 * @description Ensure a numeric value fits the 0..100 range and is an integer.
 * @param n value
 */
function clampPercentage(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * createSeededRng
 * @description Create a small deterministic RNG based on a string seed. If seed is falsy,
 *              Math.random is used instead.
 * @param seedStr string seed (truckId recommended)
 * @returns function that returns a uniform [0,1) number
 */
function createSeededRng(seedStr?: string | null): () => number {
  if (!seedStr) {
    return () => Math.random();
  }

  // simple xorshift-ish hash to produce a numeric seed from string
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 16777619) >>> 0;
  }
  // convert to float seed in (0,1)
  let state = h || 1;

  return () => {
    // xorshift32
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    // normalize to [0,1)
    return (state >>> 0) / 4294967296;
  };
}

/**
 * generateComponentValues
 * @description Generate per-component values so their arithmetic mean equals overallCondition.
 *              Introduces small deterministic variation (seeded by truckId when provided)
 *              so components are not all identical.
 * @param overall overall condition (0-100)
 * @param seed optional string seed (truckId)
 * @returns record mapping component key -> percentage (0..100)
 */
function generateComponentValues(overall: number, seed?: string | null): Record<string, number> {
  const rng = createSeededRng(seed);
  const n = COMPONENTS_LIST.length;
  const base = clampPercentage(overall ?? 100);

  // 1) produce raw values around base with small random deviations
  // deviation range +/- 6 (tunable); small so clamping rarely triggers
  const devRange = 6;
  const raws: number[] = [];
  for (let i = 0; i < n; i++) {
    const deviation = (rng() * 2 - 1) * devRange; // [-devRange, devRange)
    raws.push(base + deviation);
  }

  // 2) normalize raws so arithmetic mean equals base
  const sumRaw = raws.reduce((s, v) => s + v, 0);
  const meanRaw = sumRaw / n;
  const correction = base - meanRaw;
  let adjusted = raws.map((v) => v + correction);

  // 3) clamp to 0..100
  adjusted = adjusted.map((v) => Math.max(0, Math.min(100, v)));

  // 4) If clamping changed the mean significantly, distribute residual to non-clamped items
  //    We iterate a few times to converge.
  for (let iter = 0; iter < 10; iter++) {
    const sum = adjusted.reduce((s, v) => s + v, 0);
    const mean = sum / n;
    const delta = base - mean;

    if (Math.abs(delta) < 0.25) break; // close enough

    // Identify flexible indices (not 0 or 100)
    const flexibleIndices = adjusted
      .map((v, idx) => ({ v, idx }))
      .filter((x) => x.v > 0.001 && x.v < 99.999)
      .map((x) => x.idx);

    if (flexibleIndices.length === 0) break;

    const share = delta / flexibleIndices.length;
    flexibleIndices.forEach((idx) => {
      adjusted[idx] = Math.max(0, Math.min(100, adjusted[idx] + share));
    });
  }

  // 5) Final rounding and build result object. Ensure final mean equals base (rounded).
  let rounded = adjusted.map((v) => clampPercentage(v));
  // final adjustment to match overall exactly (by integer rounding): distribute small difference
  const roundedSum = rounded.reduce((s, v) => s + v, 0);
  const targetSum = base * n;
  let diff = targetSum - roundedSum;

  // distribute diff by adding/subtracting 1 to some items that are within bounds
  let safety = 0;
  while (diff !== 0 && safety < 200) {
    safety++;
    if (diff > 0) {
      // need to add
      const idx = rounded.findIndex((v) => v < 100);
      if (idx === -1) break;
      rounded[idx] = rounded[idx] + 1;
      diff--;
    } else {
      // need to subtract
      const idx = rounded.findIndex((v) => v > 0);
      if (idx === -1) break;
      rounded[idx] = rounded[idx] - 1;
      diff++;
    }
  }

  const result: Record<string, number> = {};
  COMPONENTS_LIST.forEach((c, idx) => {
    result[c.key] = rounded[idx];
  });

  return result;
}

/**
 * PurchasedComponentsModal
 * @description Modal that displays a grid of components with percentage values.
 *
 * Layout specifics:
 * - Container padding: 22px top & bottom (p-[22px])
 * - Header area targeted to ~32px visual height
 * - Gap between header and grid: 22px (mt-[22px])
 * - Components grid height locked to 502px and set to overflow-y-auto
 * - Spacer before footer: 20px (mt-[20px])
 * - Footer button height ~34px (h-[34px])
 */
const PurchasedComponentsModal: React.FC<PurchasedComponentsModalProps> = ({
  isOpen,
  onClose,
  overallCondition,
  truckId = null
}) => {
  /**
   * values
   * @description Local UI state for component values (initialized deterministically from overallCondition + truckId)
   */
  const [values, setValues] = React.useState<Record<string, number>>(() =>
    generateComponentValues(overallCondition ?? 100, truckId)
  );

  /**
   * Recompute component values whenever overallCondition or truckId changes.
   * This keeps the component distribution stable per truck while reflecting updated overall value.
   */
  React.useEffect(() => {
    const next = generateComponentValues(overallCondition ?? 100, truckId);
    setValues(next);
  }, [overallCondition, truckId]);

  /**
   * close on Escape key
   */
  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Compute displayed overall as the arithmetic mean of the component values
  const computedOverall = clampPercentage(
    Math.round(
      COMPONENTS_LIST.reduce((s, c) => s + (values[c.key] ?? 0), 0) / COMPONENTS_LIST.length
    )
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Truck components condition"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        /* Exact width locked to 718px max, padding set to 22px, border remains 1px */
        className="relative w-full max-w-[718px] bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-[22px] text-slate-100 z-10"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Component Condition</h2>
            <div className="text-sm text-slate-400 mt-1">
              Truck components and current values{truckId ? ` — ${truckId}` : ''}
            </div>
          </div>

          <div className="ml-4 flex items-center space-x-2">
            <div className="text-sm text-slate-300">Overall</div>
            <div className="text-2xl font-bold text-amber-400">{computedOverall}%</div>
            <button
              aria-label="Close component details"
              onClick={onClose}
              className="text-slate-300 hover:text-white ml-3"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Spacer between header and grid: 22px */}
        <div className="mt-[22px]">
          {/* Components grid: fixed height 502px and scrollable */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-[502px] overflow-y-auto pr-2">
            {COMPONENTS_LIST.map((comp) => {
              const val = clampPercentage(values[comp.key] ?? overallCondition ?? 100);
              return (
                <div key={comp.key} className="bg-slate-700 rounded p-3 border border-slate-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-white">{comp.label}</div>
                      {comp.description ? <div className="text-xs text-slate-400 mt-1">{comp.description}</div> : null}
                    </div>
                    <div className="text-sm font-semibold text-amber-400">{val}%</div>
                  </div>

                  <div className="mt-3">
                    <div className="w-full bg-slate-600 h-2 rounded overflow-hidden">
                      <div
                        style={{ width: `${val}%` }}
                        className="h-2 bg-gradient-to-r from-amber-400 to-amber-600"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Spacer before footer: 20px */}
        <div className="mt-[20px] flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 h-[34px] rounded bg-slate-700 border border-slate-600 text-sm text-slate-200 hover:bg-slate-600 flex items-center justify-center"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PurchasedComponentsModal;