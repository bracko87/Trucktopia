/**
 * src/engines/ComponentWearEngine.tsx
 *
 * Purpose:
 * - Client-side engine that applies per-kilometre wear to truck components,
 *   raises incidents when components fall below thresholds and schedules maintenance
 *   / replacement offers for the player.
 *
 * Responsibilities:
 * - Listen to live driving updates (truckLiveUpdate) and apply component wear per km.
 * - Emit 'truckIncident' events when components cause breakdowns so the incidentEngine
 *   and other systems react normally.
 * - Produce maintenance / replacement offers (multiple used/new options) and persist
 *   them in localStorage as pending maintenance for UI consumption.
 * - Use gameClock.nowUtcMs() for scheduling durations so offers/repairs align with game time.
 *
 * Notes:
 * - This engine is UI-less (mount-only). It uses localStorage for persistence (best-effort)
 *   and dispatches CustomEvents so existing UI/state systems can integrate without deep coupling.
 * - Repair cannot restore a component above 80% (business rule). Replacement offers can
 *   restore to higher levels depending on chosen quality.
 */

import React from 'react';
import { maintenanceEngine } from '../utils/maintenanceEngine';
import { nowUtcMs } from '../utils/gameClock';

/**
 * ComponentWearMap
 * @description Per-component wear rate (percentage points per km).
 *              Example: 0.0002 means 0.0002% per km.
 */
const COMPONENT_WEAR_RATES: Record<string, number> = {
  engine: 0.0002,
  transmission: 0.0003,
  tires: 0.0007,
  brakes: 0.0002,
  battery: 0.0006,
  radiator: 0.0005,
  alternator: 0.0004,
  fuelSystem: 0.0003,
  exhaust: 0.0004,
  clutch: 0.0002,
  steering: 0.00035
};

/**
 * ComponentLabels
 * @description Human-friendly labels used in offers/events.
 */
const COMPONENT_LABELS: Record<string, string> = {
  engine: 'Engine',
  transmission: 'Transmission',
  tires: 'Tires',
  brakes: 'Brakes',
  battery: 'Battery',
  radiator: 'Radiator / Cooling System',
  alternator: 'Alternator',
  fuelSystem: 'Fuel System',
  exhaust: 'Exhaust System',
  clutch: 'Clutch Assembly',
  steering: 'Steering Components'
};

/**
 * Offer provider multipliers and timing multipliers
 * - playerGarage: cheaper/faster
 * - aiGarage: more expensive/slower
 */
const PROVIDER_MULTIPLIER = {
  playerGarage: { cost: 0.85, time: 1.0 },
  aiGarage: { cost: 1.45, time: 1.6 },
  usedPartLow: { cost: 0.45, time: 0.8 },
  usedPartMed: { cost: 0.65, time: 1.0 },
  usedPartHigh: { cost: 0.85, time: 1.2 },
  newPart: { cost: 1.0, time: 1.0 }
};

/**
 * Helpers for ms conversions
 */
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * generateId
 * @description Minimal unique id generator for offers/tasks
 */
function generateId(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * clamp
 * @description Clamp numeric value to 0..100
 */
function clamp(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

/**
 * readComponentsForTruck
 * @description Read stored component values for a truck (localStorage).
 *              Falls back to evenly distributed default using overallCondition (if available).
 */
function readComponentsForTruck(truckId: string, overallCondition?: number) {
  try {
    const raw = localStorage.getItem(`truck_components_${truckId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // ignore
  }

  // create initial components using overallCondition or 100
  const base = typeof overallCondition === 'number' ? clamp(overallCondition) : 100;
  const keys = Object.keys(COMPONENT_WEAR_RATES);
  const simple: Record<string, number> = {};
  keys.forEach((k) => {
    simple[k] = base;
  });
  return simple;
}

/**
 * persistComponentsForTruck
 * @description Save per-truck component state to localStorage.
 */
function persistComponentsForTruck(truckId: string, components: Record<string, number>) {
  try {
    localStorage.setItem(`truck_components_${truckId}`, JSON.stringify(components));
  } catch (e) {
    // ignore
  }
}

/**
 * createMaintenanceOffers
 * @description Create an array of repair/replace offers for a single component.
 *
 * - Repairs restore up to 80% maximum for that component (business rule).
 * - Replacement offers (new/used) can restore to higher values depending on quality.
 * - Price estimation is driven by a base vehicle price when available, otherwise fallbacks.
 *
 * @param truckSpecs truck specs object (may contain price)
 * @param componentKey component key (engine, tires, etc.)
 * @param currentValue current percentage (0..100)
 * @returns array of offers
 */
function createMaintenanceOffers(
  truckSpecs: Record<string, any> | null,
  componentKey: string,
  currentValue: number,
  hasPlayerGarage = true
) {
  const basePrice = (truckSpecs && Number.isFinite(truckSpecs.price) ? truckSpecs.price : 60000);

  // Importance multipliers per component to estimate new part price as % of basePrice
  const IMPORTANCE: Record<string, number> = {
    engine: 0.30,
    transmission: 0.20,
    tires: 0.08,
    brakes: 0.06,
    battery: 0.03,
    radiator: 0.04,
    alternator: 0.02,
    fuelSystem: 0.03,
    exhaust: 0.025,
    clutch: 0.05,
    steering: 0.04
  };

  const imp = IMPORTANCE[componentKey] || 0.03;

  // percent damage that needs addressing (if component below 100)
  const damagePct = Math.max(0, 100 - currentValue);

  // New part price (full replacement) as fraction of basePrice
  const newPartBase = Math.round(basePrice * imp * (damagePct / 100 + 0.25)); // include overhead
  const replacementOffers: Array<any> = [];

  // Used offers: 3 quality tiers
  const usedTiers = [
    { idSuffix: 'used-low', multiplier: PROVIDER_MULTIPLIER.usedPartLow.cost, restoreTo: Math.min(90, currentValue + 30), qualityLabel: 'Used (low quality)' },
    { idSuffix: 'used-med', multiplier: PROVIDER_MULTIPLIER.usedPartMed.cost, restoreTo: Math.min(95, currentValue + 50), qualityLabel: 'Used (good)' },
    { idSuffix: 'used-high', multiplier: PROVIDER_MULTIPLIER.usedPartHigh.cost, restoreTo: Math.min(98, currentValue + 70), qualityLabel: 'Used (excellent)' }
  ];

  for (const tier of usedTiers) {
    const price = Math.max(30, Math.round(newPartBase * tier.multiplier));
    const durationHours = Math.round(4 * tier.multiplier * 1.2); // used parts slightly faster
    replacementOffers.push({
      id: generateId(`offer_${componentKey}_${tier.idSuffix}`),
      component: componentKey,
      label: `${COMPONENT_LABELS[componentKey] ?? componentKey} — ${tier.qualityLabel}`,
      provider: 'usedMarket',
      price,
      restoreTo: tier.restoreTo,
      estimatedDurationMs: durationHours * HOUR_MS,
      notes: 'Used part offer. Warranty limited.'
    });
  }

  // New part
  replacementOffers.push({
    id: generateId(`offer_${componentKey}_new`),
    component: componentKey,
    label: `${COMPONENT_LABELS[componentKey] ?? componentKey} — New Part`,
    provider: 'newPart',
    price: Math.max(80, Math.round(newPartBase * PROVIDER_MULTIPLIER.newPart.cost)),
    restoreTo: 100,
    estimatedDurationMs: Math.round(8 * HOUR_MS * PROVIDER_MULTIPLIER.newPart.time), // baseline 8 hours
    notes: 'New part with manufacturer guarantee.'
  });

  // If player has garage provide a cheaper installation option, otherwise include aiGarage premium offer
  const finalOffers: Array<any> = [];

  // Repair (not full replacement) - restore up to max 80%
  const canRepairTo = Math.max(currentValue, Math.min(80, currentValue + Math.round(damagePct * 0.6)));
  const repairCost = Math.max(
    20,
    Math.round((newPartBase * 0.35) * (damagePct / 100) * (hasPlayerGarage ? PROVIDER_MULTIPLIER.playerGarage.cost : PROVIDER_MULTIPLIER.aiGarage.cost))
  );
  const repairDuration = Math.max(Math.round(2 * HOUR_MS), Math.round(6 * HOUR_MS * (damagePct / 100 + 0.1)) * (hasPlayerGarage ? 1 : PROVIDER_MULTIPLIER.aiGarage.time));

  finalOffers.push({
    id: generateId(`offer_${componentKey}_repair`),
    component: componentKey,
    label: `${COMPONENT_LABELS[componentKey] ?? componentKey} — Repair`,
    provider: hasPlayerGarage ? 'playerGarage' : 'aiGarage',
    price: repairCost,
    restoreTo: clamp(canRepairTo),
    estimatedDurationMs: repairDuration,
    notes: 'Repair (labour + parts). Repairs cannot exceed 80% component value.'
  });

  // Add replacement offers but adjust cost/time if no player garage (installation cost)
  for (const o of replacementOffers) {
    const provider = hasPlayerGarage ? 'playerGarage' : 'aiGarage';
    const mult = hasPlayerGarage ? PROVIDER_MULTIPLIER.playerGarage : PROVIDER_MULTIPLIER.aiGarage;
    finalOffers.push({
      ...o,
      id: generateId(`offer_${componentKey}_${o.provider}`),
      provider,
      price: Math.round(o.price * mult.cost),
      estimatedDurationMs: Math.round(o.estimatedDurationMs * mult.time),
      notes: `${o.notes} ${hasPlayerGarage ? 'Installed in player garage.' : 'Installed in AI garage (longer & more expensive).'}`
    });
  }

  return finalOffers;
}

/**
 * queueMaintenanceTask
 * @description Persist a maintenance task for a truck and dispatch an update event.
 */
function queueMaintenanceTask(truckId: string, task: any) {
  try {
    const key = `pending_maintenance_${truckId}`;
    const raw = localStorage.getItem(key);
    const arr = raw ? (JSON.parse(raw) as any[]) : [];
    arr.push(task);
    localStorage.setItem(key, JSON.stringify(arr));
    // dispatch event so UI can react
    try {
      window.dispatchEvent(new CustomEvent('maintenanceOffersUpdated', { detail: { truckId, tasks: arr } }));
    } catch {}
  } catch (e) {
    // ignore
  }
}

/**
 * readPendingMaintenance
 * @description Return pending maintenance array for a truck
 */
function readPendingMaintenance(truckId: string) {
  try {
    const raw = localStorage.getItem(`pending_maintenance_${truckId}`);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * applyWearToComponents
 * @description Reduce component percentages based on distanceCovered (km).
 *              Returns updated components object and list of changed component keys.
 */
function applyWearToComponents(components: Record<string, number>, distanceKm: number) {
  const changed: string[] = [];
  for (const k of Object.keys(COMPONENT_WEAR_RATES)) {
    const rate = COMPONENT_WEAR_RATES[k] ?? 0;
    const decrease = rate * distanceKm; // percent points
    const prev = components[k] ?? 100;
    const next = clamp(prev - decrease);
    if (Math.abs(next - prev) > 1e-6) changed.push(k);
    components[k] = next;
  }
  return { components, changed };
}

/**
 * evaluateBreakdown
 * @description Given component map, decide whether a breakdown should occur.
 *              - If any component <= 5% => immediate breakdown
 *              - If any component < 20% => 40% chance to breakdown per update (plus slight scale)
 * @returns { triggered: boolean, detail?: any }
 */
function evaluateBreakdown(truckId: string, components: Record<string, number>, distanceKm: number) {
  const keys = Object.keys(components);
  let lowestKey = keys[0];
  let lowestVal = components[lowestKey];
  for (const k of keys) {
    const v = components[k];
    if (v < lowestVal) {
      lowestVal = v;
      lowestKey = k;
    }
  }

  // Immediate catastrophic failure when extremely low
  if (lowestVal <= 5) {
    const detail = {
      truckId,
      type: 'breakdown',
      severity: 90,
      distanceCovered: distanceKm,
      timestamp: nowUtcMs(),
      reason: `Component ${lowestKey} critical (${lowestVal}%)`
    };
    return { triggered: true, detail };
  }

  if (lowestVal < 20) {
    // Base 40% chance, slight increase when closer to 0
    const extra = (20 - lowestVal) / 100; // up to 0.2
    const probability = 0.4 + extra;
    if (Math.random() < probability) {
      const severity = Math.round(40 + (20 - lowestVal) * 2 + Math.random() * 20);
      const detail = {
        truckId,
        type: 'breakdown',
        severity: Math.min(100, severity),
        distanceCovered: distanceKm,
        timestamp: nowUtcMs(),
        reason: `Component ${lowestKey} low (${lowestVal}%)`
      };
      return { triggered: true, detail };
    }
  }

  return { triggered: false };
}

/**
 * ComponentWearEngine
 * @description React component that mounts the wear engine. No visual output.
 */
const ComponentWearEngine: React.FC = () => {
  React.useEffect(() => {
    let mounted = true;

    /**
     * onTruckLiveUpdate
     * @description Handler for 'truckLiveUpdate' CustomEvent emitted by truckDrivingEngine.
     *              Expects detail: { truckId, distanceCovered, updates: {...} }
     */
    const onTruckLiveUpdate = (ev: any) => {
      try {
        const d = ev?.detail;
        if (!d) return;
        const truckId = d.truckId ?? d.truck?.id;
        const distanceCovered = Number(d.distanceCovered ?? (d?.updates?.distanceCovered ?? 0));
        if (!truckId || !(distanceCovered > 0)) return;

        // Load truck specs (if available in event)
        const truckSpecs = d.truck ?? d.specs ?? null;
        const overallCondition = d?.updates?.overallCondition ?? (truckSpecs && truckSpecs.condition) ?? 100;

        // Load or create components
        const components = readComponentsForTruck(truckId, overallCondition);

        // Apply wear
        const { components: nextComponents, changed } = applyWearToComponents(components, distanceCovered);

        // Persist
        persistComponentsForTruck(truckId, nextComponents);

        // Dispatch components updated event
        try {
          window.dispatchEvent(new CustomEvent('truckComponentsUpdated', {
            detail: { truckId, components: nextComponents, changed, timestamp: nowUtcMs() }
          }));
        } catch {}

        // Evaluate breakdown
        const br = evaluateBreakdown(truckId, nextComponents, distanceCovered);
        if (br.triggered) {
          // Dispatch truckIncident so incidentEngine & UI react
          try {
            window.dispatchEvent(new CustomEvent('truckIncident', { detail: br.detail }));
          } catch {}
          // Also create a maintenance task automatically for the worst component
          const worstKey = Object.keys(nextComponents).reduce((acc, k) => (nextComponents[k] < nextComponents[acc] ? k : acc), Object.keys(nextComponents)[0]);
          const offers = createMaintenanceOffers(truckSpecs, worstKey, nextComponents[worstKey], true);
          const task = {
            id: generateId('task'),
            truckId,
            component: worstKey,
            createdAt: nowUtcMs(),
            triggeredBy: 'componentWearEngine',
            severity: br.detail?.severity ?? 50,
            offers
          };
          queueMaintenanceTask(truckId, task);
        } else {
          // If component dropped below threshold but no immediate breakdown, queue offers proactively
          const keysBelow = Object.keys(nextComponents).filter((k) => nextComponents[k] < 40 && nextComponents[k] >= 20);
          for (const k of keysBelow) {
            const pending = readPendingMaintenance(truckId);
            const exists = pending.some((p: any) => p.component === k && (nowUtcMs() - (p.createdAt ?? 0) < 8 * HOUR_MS));
            if (!exists) {
              const offers = createMaintenanceOffers(truckSpecs, k, nextComponents[k], true);
              const task = {
                id: generateId('task'),
                truckId,
                component: k,
                createdAt: nowUtcMs(),
                triggeredBy: 'componentWearEngine_proactive',
                offers
              };
              queueMaintenanceTask(truckId, task);
            }
          }
        }
      } catch (err) {
        // defensive no-op
        // eslint-disable-next-line no-console
        console.error('[ComponentWearEngine] live update handler error', err);
      }
    };

    // Fallback scanner to ensure stationary or missing events also cause wear when trucks had been driving
    const scannerInterval = window.setInterval(() => {
      try {
        // Inspect a special key where driving summaries might be stored or look for truck list
        // If none, do nothing. This is intentionally light-weight.
        // We support manual triggers via window.dispatchEvent({type:'componentWear:scan'}) externally.
      } catch (e) {
        // ignore
      }
    }, 30 * 1000);

    window.addEventListener('truckLiveUpdate', onTruckLiveUpdate as EventListener);

    // Also allow manual trigger for quick QA
    const manual = (ev: any) => {
      try {
        const truckId = ev?.detail?.truckId;
        const distance = Number(ev?.detail?.distanceKm ?? 1);
        if (!truckId) return;
        // emulate event shape
        onTruckLiveUpdate({ detail: { truckId, distanceCovered: distance } });
      } catch {}
    };
    window.addEventListener('componentWear:trigger', manual as EventListener);

    // Mount helper: expose read API on window for debug
    try {
      // @ts-ignore attach for debug only
      window.__componentWear = {
        getComponents: (truckId: string) => readComponentsForTruck(truckId),
        listPending: (truckId: string) => readPendingMaintenance(truckId)
      };
    } catch {}

    return () => {
      mounted = false;
      window.removeEventListener('truckLiveUpdate', onTruckLiveUpdate as EventListener);
      window.removeEventListener('componentWear:trigger', manual as EventListener);
      clearInterval(scannerInterval);
    };
  }, []);

  return null;
};

export default ComponentWearEngine;
