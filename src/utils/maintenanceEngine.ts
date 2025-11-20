/**
 * src/utils/maintenanceEngine.ts
 *
 * Purpose:
 * - Simple Truck/Trailer maintenance engine.
 * - Provides cost and duration estimates based on truck maintenanceGroup,
 *   and utility functions to schedule/apply maintenance effects.
 *
 * Notes:
 * - This engine is intentionally lightweight and deterministic so it can be
 *   extended later. All functions accept plain objects so integration with
 *   different state systems (GameContext etc.) is flexible.
 */

/**
 * MaintenanceEstimate
 * @description Estimated cost (USD) and duration (days) for a maintenance action.
 */
export interface MaintenanceEstimate {
  /** Estimated USD cost */
  cost: number;
  /** Estimated duration in whole days */
  durationDays: number;
  /** Group used for estimate */
  group: 1 | 2 | 3;
}

/**
 * TruckLike
 * @description Minimal truck shape used by the maintenance engine.
 */
export interface TruckLike {
  id: string;
  brand?: string;
  model?: string;
  price?: number;
  condition?: number; // 0-100
  maintenanceGroup?: 1 | 2 | 3;
}

/**
 * MaintenanceEngine
 * @description Simple engine to estimate and apply maintenance for trucks/trailers.
 */
class MaintenanceEngine {
  /** Base multiplier for maintenance cost derived from vehicle price */
  private readonly BASE_COST_FACTOR = 0.02; // 2% of price for group 1

  /**
   * Estimate maintenance cost & duration for a truck-like object.
   * Group semantics:
   *  - Group 1: baseline cost, 1 day
   *  - Group 2: mid cost (~1.6x), 1-2 days
   *  - Group 3: expensive (2x baseline), 2-4 days
   *
   * @param truck - vehicle data (should include price and maintenanceGroup)
   * @returns MaintenanceEstimate
   */
  estimateMaintenance(truck: TruckLike): MaintenanceEstimate {
    const price = (truck && typeof truck.price === 'number') ? truck.price : 30000;
    const group = truck.maintenanceGroup || 1;

    const base = price * this.BASE_COST_FACTOR;

    let multiplier = 1;
    let durationDays = 1;
    switch (group) {
      case 1:
        multiplier = 1;
        durationDays = 1;
        break;
      case 2:
        multiplier = 1.6;
        durationDays = 1 + Math.round(Math.random()); // 1-2 days
        break;
      case 3:
        multiplier = 2.0;
        durationDays = 2 + Math.round(Math.random() * 2); // 2-4 days
        break;
      default:
        multiplier = 1;
        durationDays = 1;
    }

    const cost = Math.round(base * multiplier);

    return {
      cost,
      durationDays,
      group: group as 1 | 2 | 3
    };
  }

  /**
   * Apply maintenance to a truck object in-place (mutates).
   * - Restores truck condition based on group and durability.
   *
   * @param truck - truck-like object that will be mutated
   * @param durability - optional durability (1-10) to weight the restore amount
   * @returns Updated truck object reference
   */
  applyMaintenance(truck: TruckLike & { durability?: number }) {
    const estimate = this.estimateMaintenance(truck);
    const durability = (truck.durability && typeof truck.durability === 'number') ? truck.durability : 5;

    // Determine restore ratio: higher durability -> better restoration per maintenance
    const restoreBase = 20; // base % restored for group 1
    let restoreMultiplier = 1;
    if (estimate.group === 2) restoreMultiplier = 1.2;
    if (estimate.group === 3) restoreMultiplier = 1.45;

    // Durability modifies restore: (durability/10)
    const restorePct = Math.min(100, Math.round(restoreBase * restoreMultiplier * (durability / 6))); // scale to avoid overfill

    truck.condition = Math.min(100, (truck.condition || 50) + restorePct);

    return truck;
  }
}

/** Export singleton engine instance */
export const maintenanceEngine = new MaintenanceEngine();

export default maintenanceEngine;