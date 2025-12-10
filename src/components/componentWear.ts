/**
 * src/components/componentWear.ts
 *
 * Client-side helper that ensures window.__componentWear exists for quick testing and
 * integration. Lightweight fallback behaviour is provided so test events work even
 * before the React engine mounts.
 *
 * Usage:
 * - Import this module as a side-effect in your main layout or entry file:
 *     import './components/componentWear';
 *
 * - After importing, in the browser console you can call:
 *     window.__componentWear.getComponents(truckId)
 *     window.__componentWear.listPending(truckId)
 *     window.__componentWear.trigger(truckId, distanceKm)
 *
 * Note:
 * - This file is intentionally small and purely client-side.
 * - It will not substitute the full engine; when the engine mounts it may override
 *   window.__componentWear with a richer implementation. The fallbacks here read
 *   the same localStorage keys the engine uses so basic inspection works immediately.
 */

/**
 * Ensure this file runs as a client-only module. This token is used by Next.js app folders,
 * and is harmless in other React setups where it will simply be ignored as a string literal.
 */
"use client";

/**
 * createPlaceholder
 * @description Create a minimal placeholder object exposing helper methods that:
 * - read per-truck component state from localStorage
 * - read pending maintenance offers from localStorage
 * - dispatch the manual trigger event used by the engine for QA
 *
 * @returns placeholder object
 */
function createPlaceholder() {
  return {
    /**
     * getComponents
     * @description Read stored component values for a truck from localStorage key `truck_components_{truckId}`.
     * @param truckId string truck identifier
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
     * @description Read pending maintenance tasks saved in localStorage key `pending_maintenance_{truckId}`.
     * @param truckId string truck identifier
     * @returns any[] array of pending tasks (may be empty)
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
     * @description Convenience: dispatch a manual trigger event so engines listening
     *              on 'componentWear:trigger' receive the payload. Useful for QA.
     * @param truckId truck id
     * @param distanceKm distance to simulate (default 1)
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

/**
 * Attach placeholder if missing.
 * If engine mounts later it may replace window.__componentWear with a richer API.
 */
if (typeof window !== "undefined") {
  // Only set if not yet defined to avoid overwriting a real engine implementation.
  // We intentionally provide simple fallback implementations.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globalAny: any = window;
  if (!globalAny.__componentWear) {
    globalAny.__componentWear = createPlaceholder();
  }
}

export {};