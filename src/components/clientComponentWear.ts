/**
 * src/components/clientComponentWear.ts
 *
 * Client-side wrapper to ensure window.__componentWear is available in the browser.
 *
 * Responsibilities:
 * - Try to dynamically import the real ComponentWear engine (if present) and attach it to window.__componentWear.
 * - Provide a robust fallback shim that reads the same localStorage keys the engine uses so basic QA/inspection works immediately.
 * - Run as a client-side side-effect module (imported from the frontend entry) and avoid blowing up the build if the engine path is missing or incorrectly cased.
 *
 * Notes:
 * - On Linux-based CI (Netlify) imports are case-sensitive. The dynamic import below will silently fail if the filename/path casing doesn't match.
 * - Keep this file small and side-effectful so a simple `import './components/clientComponentWear'` from src/main.tsx or app layout is sufficient.
 */

/* "use client" marks this module as client-only for frameworks like Next.js app-router. */
"use client";

/**
 * Import a very small placeholder module that ensures a minimal API exists early.
 * This side-effect module is intentionally lightweight and safe to import in any environment.
 * The placeholder sets window.__componentWear when nothing else does.
 */
import './componentWear';

/**
 * attachRealEngine
 * @description Attempt to dynamically import the real engine implementation and attach it to window.
 *              If that fails (missing file / wrong casing / build not including engine), we keep the existing placeholder.
 *              The dynamic import is wrapped in an async IIFE to avoid top-level await requirements.
 */
if (typeof window !== 'undefined') {
  (async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const globalAny: any = window;

    try {
      /**
       * Try to load the engine implementation.
       *
       * IMPORTANT:
       * - Ensure the engine file name and path EXACTLY match the import below on disk (case-sensitive).
       * - Common path candidates:
       *   - ../engines/ComponentWearEngine
       *   - ../../engines/ComponentWearEngine
       *   - ../engines/ComponentWearEngine.tsx (no extension in import)
       *
       * If your engine file lives in a different folder, update the path accordingly.
       */
      const mod = await import('../engines/ComponentWearEngine');

      // Prefer a named export `componentWear`, fall back to default export if present.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const engine: any = mod?.componentWear ?? mod?.default ?? null;

      // Basic validation: ensure the imported object looks like the engine API we expect.
      if (engine && (typeof engine.getComponents === 'function' || typeof engine.trigger === 'function')) {
        globalAny.__componentWear = engine;
        return;
      }
    } catch (err) {
      // Silent catch: dynamic import failed (likely wrong path/casing or engine not included in build).
      // We intentionally do not throw so the site keeps working with the placeholder.
      // console.debug('ComponentWear engine import failed:', err);
    }

    /**
     * Ensure a minimal fallback exists if neither placeholder nor engine attached anything.
     * This fallback reads/writes the same localStorage keys the engine expects so basic QA/console checks work.
     */
    if (!globalAny.__componentWear) {
      globalAny.__componentWear = {
        /**
         * getComponents
         * @description Read per-truck components state from localStorage key `truck_components_{truckId}`.
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
         * @description Read pending maintenance tasks saved in localStorage key `pending_maintenance_{truckId}`.
         * @param truckId string
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
         * @description Dispatch a manual trigger event so engines listening on 'componentWear:trigger' receive the payload.
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
  })();
}

export {};