/**
 * src/components/clientComponentWear.ts
 *
 * Client-side wrapper to make componentWear available as window.__componentWear.
 *
 * Purpose:
 * - Ensures a usable componentWear object is attached to window as soon as the client loads.
 * - Falls back to a minimal placeholder if the full engine hasn't mounted yet.
 *
 * Usage:
 * - Import this file as a side-effect from your top-level layout (App.tsx is updated).
 * - In browser console you can call window.__componentWear, getComponents, listPending, trigger.
 */

/* "use client" ensures this runs in Next.js / client-only environments. */
"use client";

/**
 * Import the placeholder implementation which itself reads/writes the same localStorage keys
 * used by the engine. The imported module is side-effectful and sets window.__componentWear when
 * available; here we ensure we attach a safe fallback object if needed.
 */
import './componentWear';

/**
 * Attach global reference (fallback) so callers always see window.__componentWear.
 * We do this defensively so the object exists even if the full React engine hasn't mounted.
 */
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globalAny: any = window;
  // Provide a minimal fallback implementation if the module didn't attach a richer API.
  globalAny.__componentWear = globalAny.__componentWear ?? {
    /**
     * getComponents
     * @description Read stored component state for a truckId from localStorage.
     * @param truckId string
     * @returns Record<string, number> | null
     */
    getComponents: (truckId: string) => {
      try {
        const raw = localStorage.getItem(`truck_components_${truckId}`);
        if (!raw) return null;
        return JSON.parse(raw);
      } catch {
        return null;
      }
    },
    /**
     * listPending
     * @description Read pending maintenance tasks from localStorage for a truck.
     * @param truckId string
     * @returns any[]
     */
    listPending: (truckId: string) => {
      try {
        const raw = localStorage.getItem(`pending_maintenance_${truckId}`);
        if (!raw) return [];
        return JSON.parse(raw);
      } catch {
        return [];
      }
    },
    /**
     * trigger
     * @description Convenience helper to dispatch a manual trigger event for QA.
     * @param truckId string
     * @param distanceKm number
     */
    trigger: (truckId: string, distanceKm = 1) => {
      try {
        window.dispatchEvent(new CustomEvent('componentWear:trigger', { detail: { truckId, distanceKm } }));
      } catch {
        // noop
      }
    }
  };
}

export {};