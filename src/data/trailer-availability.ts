/**
 * Ensure new trailers have a delivery availability between 1 and 4 days.
 *
 * File purpose:
 * - This module runs for side-effects at app startup and updates the TRAILERS
 *   dataset in-place so every trailer with category === 'new' (and type === 'trailer')
 *   gets:
 *     - availability: human friendly string (e.g. "3 days")
 *     - deliveryDays: numeric days (1..4)
 *     - estimatedDeliveryDate: ISO string of the expected delivery date
 *
 * Rationale:
 * - Keeps UI/layout unchanged (no markup updates).
 * - Adds data fields that the VehicleMarket page can display or use for sorting.
 *
 * Notes:
 * - This is intentionally a side-effect module. It mutates the exported TRAILERS array
 *   so every consumer of TRAILERS will immediately observe the availability properties.
 */

import { TRAILERS } from './trailers';

/**
 * Generate an integer in the range [min, max] inclusive.
 *
 * @param min - minimum integer
 * @param max - maximum integer
 * @returns random integer between min and max
 */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Assign delivery availability to each new trailer.
 *
 * - For trailers where t.type === 'trailer' && t.category === 'new'
 *   we set:
 *     t.deliveryDays = <1..4>
 *     t.availability = "<n> days"
 *     t.estimatedDeliveryDate = ISO date n days from now
 *
 * This keeps things deterministic per page load but still meets "between 1 and 4 days".
 */
(function applyAvailabilityToNewTrailers() {
  try {
    TRAILERS.forEach((t) => {
      if (t && t.type === 'trailer' && t.category === 'new') {
        const days = randInt(1, 4);
        // @ts-ignore - allow new properties if they don't exist on the type
        t.deliveryDays = days;
        // human readable availability string
        // e.g. "1 day" or "3 days"
        // pluralize properly
        // @ts-ignore
        t.availability = `${days} day${days === 1 ? '' : 's'}`;
        // ISO estimated delivery date
        // @ts-ignore
        t.estimatedDeliveryDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      }
    });
  } catch (err) {
    // Fail silently to avoid breaking the app if TRAILERS shape changes.
    // Intentional: this file only enriches data and must never crash startup.
    // eslint-disable-next-line no-console
    console.error('trailer-availability: failed to apply availability', err);
  }
})();