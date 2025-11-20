/**
 * src/utils/incidentEngine.ts
 *
 * Purpose:
 * - Calculate incident (breakdown / defect) probability for trucks in transit.
 * - Provide a simple evaluation function suitable for integration with driving engines.
 *
 * Behavior:
 * - Use truck reliability (A/B/C), durability (1-10), current condition (0-100),
 *   driver working state (hoursDrivenToday, isOnBrake) and distance covered to
 *   compute a per-update incident probability.
 * - When an incident occurs, the engine dispatches a 'truckIncident' CustomEvent
 *   on window with details for the listening systems (game context, UI, logs).
 *
 * Notes:
 * - This engine is deterministic/randomized with seeded-like randomness using Math.random.
 * - It is designed to be called repeatedly per small distance/time step.
 */

/**
 * IncidentDetail
 * @description Details provided when an incident occurs.
 */
export interface IncidentDetail {
  truckId: string;
  type: 'breakdown' | 'minor' | 'major' | 'tire' | 'engine' | 'brake';
  severity: number; // 1-100
  distanceCovered: number;
  timestamp: number;
  reason: string;
}

/**
 * TruckMinimal
 * @description Minimal truck shape required by the incident engine.
 */
export interface TruckMinimal {
  id: string;
  reliability?: 'A' | 'B' | 'C';
  durability?: number; // 1-10
  condition?: number; // 0-100
}

/**
 * DriverMinimal
 * @description Minimal driver state needed to evaluate incidents
 */
export interface DriverMinimal {
  id?: string;
  name?: string;
  hoursDrivenToday?: number;
  isOnBrake?: boolean;
  isFit?: boolean; // if available; true = fit, false = tired
}

/**
 * IncidentEngine
 * @description Encapsulates incident probability logic and triggers events on window.
 */
class IncidentEngine {
  /**
   * Evaluate incident chance for the given truck & driver over a distance segment.
   * If a random roll passes, emits a 'truckIncident' event on window.
   *
   * @param truck - minimal truck object
   * @param driver - minimal driver object
   * @param distanceKm - distance covered in this update (km)
   * @returns probability value (0..1) and whether incident occurred
   */
  evaluateAndMaybeTrigger(truck: TruckMinimal, driver: DriverMinimal | null, distanceKm: number) {
    // Safety checks
    if (!truck || distanceKm <= 0) {
      return { probability: 0, triggered: false };
    }

    // Base chance per km
    let basePerKm = 0.0006; // baseline 0.06% per km

    // Reliability multiplier
    let reliabilityMultiplier = 1;
    switch (truck.reliability) {
      case 'A':
        reliabilityMultiplier = 0.6;
        break;
      case 'B':
        reliabilityMultiplier = 1.0;
        break;
      case 'C':
        reliabilityMultiplier = 1.6;
        break;
      default:
        reliabilityMultiplier = 1.0;
    }

    // Durability effect (lower durability increases chance)
    const durability = typeof truck.durability === 'number' ? truck.durability : 5;
    const durabilityMultiplier = 1 + Math.max(0, (5 - durability) * 0.08); // each point below 5 adds +8%

    // Condition effect: below 50% increases risk linearly
    const cond = typeof truck.condition === 'number' ? truck.condition : 100;
    const conditionMultiplier = cond < 50 ? (1 + (50 - cond) / 50) : 1; // e.g. 40 => 1.2

    // Driver fatigue / fitness effect
    let driverMultiplier = 1;
    if (driver) {
      if (driver.isFit === false) driverMultiplier += 0.6; // not fit increases risk
      const hours = typeof driver.hoursDrivenToday === 'number' ? driver.hoursDrivenToday : 0;
      if (hours >= 6) driverMultiplier += 0.6; // exceeded safe hours
      else if (hours >= 4) driverMultiplier += 0.25;
      if (driver.isOnBrake) {
        // If driver is currently on a brake state (unexpected), small increase
        driverMultiplier += 0.15;
      }
    }

    // Distance scaling: chance = basePerKm * distanceKm * multipliers
    const probability = Math.min(1, basePerKm * distanceKm * reliabilityMultiplier * durabilityMultiplier * conditionMultiplier * driverMultiplier);

    // Roll
    const roll = Math.random();

    if (roll < probability) {
      // Pick severity & type by weighted random based on condition/durability
      const severityBase = Math.min(90, Math.round((100 - cond) * 0.8 + (11 - durability) * 2 + (truck.reliability === 'C' ? 8 : 0)));
      const severity = Math.min(100, Math.max(10, severityBase + Math.round(Math.random() * 20 - 10)));

      // Type selection
      const types: Array<{ t: IncidentDetail['type']; w: number }> = [
        { t: 'minor', w: 50 },
        { t: 'breakdown', w: 25 },
        { t: 'tire', w: 12 },
        { t: 'engine', w: 8 },
        { t: 'brake', w: 5 }
      ];
      const totalW = types.reduce((s, it) => s + it.w, 0);
      let pick = Math.random() * totalW;
      let chosen: IncidentDetail['type'] = 'minor';
      for (const it of types) {
        if (pick <= it.w) {
          chosen = it.t;
          break;
        }
        pick -= it.w;
      }

      const reasonParts: string[] = [];
      reasonParts.push(`Reliability=${truck.reliability || 'N/A'}`);
      reasonParts.push(`Durability=${durability}`);
      reasonParts.push(`Condition=${cond}`);
      if (driver) reasonParts.push(`DriverHours=${driver.hoursDrivenToday ?? 'N/A'}`);

      const detail: IncidentDetail = {
        truckId: truck.id,
        type: chosen,
        severity,
        distanceCovered: distanceKm,
        timestamp: Date.now(),
        reason: reasonParts.join(' | ')
      };

      // Emit event for game to handle (repair cost, delay, penalties)
      try {
        window.dispatchEvent(new CustomEvent('truckIncident', { detail }));
      } catch (e) {
        // ignore
      }

      return { probability, triggered: true, detail };
    }

    return { probability, triggered: false };
  }
}

/** Singleton instance */
export const incidentEngine = new IncidentEngine();
export default incidentEngine;