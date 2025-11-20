/**
 * src/data/trailer-cleanup.ts
 *
 * Purpose:
 * - Remove unwanted trailer entries from the exported TRAILERS array at runtime.
 * - This file performs an in-place mutation so existing imports keep the same array reference.
 *
 * Rationale:
 * - Safer than performing large automated edits on the original data file.
 * - Ensures all parts of the app that import TRAILERS see the filtered list immediately.
 *
 * Change summary:
 * - Removed "container-chassis" from the removal list so Container Chassis trailers remain visible.
 */

/**
 * Classes that should be removed from the TRAILERS listing.
 * @description Case-insensitive list of trailerClass values to remove.
 *
 * Note: "container-chassis" was intentionally removed to keep Container Chassis entries visible.
 */
export const REMOVED_TRAILER_CLASSES = [
  "flatbed",
  "dump",
  "curtainside",
  "flatbed-heavy"
] as const;

/**
 * Import the canonical TRAILERS array. This import is for side-effect mutation only.
 * Note: Keep the import a live reference so we can mutate the exported array in-place.
 */
import { TRAILERS } from "./trailers";

/**
 * removeUnwantedTrailers
 * @description Remove trailers from the shared TRAILERS array whose trailerClass
 *              matches any value in REMOVED_TRAILER_CLASSES (case-insensitive).
 *
 * Implementation notes:
 * - We iterate backwards and splice to mutate the array in-place. This preserves
 *   references to the original array object (safe for other modules).
 * - The function is an IIFE so it runs as soon as this module is imported.
 */
(function removeUnwantedTrailers() {
  try {
    const toRemove = REMOVED_TRAILER_CLASSES.map((c) => c.toLowerCase());
    let removedCount = 0;
    for (let i = TRAILERS.length - 1; i >= 0; i--) {
      const trailer = TRAILERS[i];
      if (!trailer) continue;
      const cls = (trailer.trailerClass || "").toString().toLowerCase();
      if (toRemove.includes(cls)) {
        // Remove the entry in-place
        TRAILERS.splice(i, 1);
        removedCount++;
      }
    }
    // Optional debug in development
    // console.debug(`trailer-cleanup: removed ${removedCount} trailers`);
  } catch (err) {
    // Keep errors silent to avoid breaking the app; log in dev.
    // eslint-disable-next-line no-console
    console.error("trailer-cleanup: failed to remove unwanted trailers", err);
  }
})();