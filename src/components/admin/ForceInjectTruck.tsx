/**
 * ForceInjectTruck.tsx
 *
 * Background helper that injects a single realistic truck (Iveco Stralis AS 440)
 * into the active company if no such truck exists. Does NOT change page layout or UI.
 *
 * Responsibilities:
 * - Run once on mount for a given company and only insert once per-company (localStorage guard).
 * - Persist updated company via GameContext.createCompany or fallback persistence.
 * - Emit a visible in-app toast (app:toast event) for feedback.
 *
 * Notes:
 * - This is UI-less and defensive. It will no-op when no company is present.
 */

import React, { useEffect } from 'react';
import { useGame } from '../../contexts/GameContext';

/**
 * safeDispatchToast
 * @description Emit an app-level toast that the global Toaster listens to.
 * @param detail Toast detail object: { title?, message, variant?, ttl? }
 */
function safeDispatchToast(detail: { title?: string; message: string; variant?: 'info' | 'success' | 'error' | 'neutral'; ttl?: number }) {
  try {
    window.dispatchEvent(new CustomEvent('app:toast', { detail }));
  } catch {
    // noop if event not permitted
  }
}

/**
 * buildIvecoStralis
 * @description Construct a minimal truck object suitable for company.trucks.
 *              Kept small and compatible with TruckCard expectations.
 */
function buildIvecoStralis() {
  return {
    id: `truck-iveco-stralis-as-440-${Date.now()}`,
    brand: 'Iveco',
    model: 'Stralis AS 440',
    year: 2018,
    condition: 100,
    status: 'available',
    assignedTrailer: '',
    capacity: null,
    tonnage: 18,
    // friendly label consumed by some UI pieces
    displayName: 'Iveco Stralis AS 440',
  };
}

/**
 * ForceInjectTruck
 * @description React component that runs on mount and ensures a Stralis truck exists in the company.
 */
const ForceInjectTruck: React.FC = () => {
  const ctx: any = (() => {
    try {
      return useGame();
    } catch {
      return null;
    }
  })();

  useEffect(() => {
    if (!ctx) return;
    try {
      const { gameState, createCompany, setCurrentPage } = ctx as any;
      if (!gameState || !gameState.company) {
        // no company to inject into
        return;
      }

      const company = gameState.company;
      const companyId = String(company.id ?? gameState.currentUser ?? 'local');

      // guard: only inject once per company
      const doneKey = `force_inject_truck_done_${companyId}`;
      try {
        if (localStorage.getItem(doneKey) === '1') return;
      } catch {
        // if localStorage unavailable, continue but be defensive about duplicates
      }

      // Check if a Stralis already exists
      const hasStralis = Array.isArray(company.trucks) && company.trucks.some((t: any) => {
        try {
          const model = String(t.model ?? t.displayName ?? '').toLowerCase();
          return model.includes('stralis') || model.includes('iveco stralis');
        } catch {
          return false;
        }
      });

      if (hasStralis) {
        try { localStorage.setItem(doneKey, '1'); } catch { /* ignore */ }
        return;
      }

      // Build the truck and attach it
      const truck = buildIvecoStralis();
      const updatedCompany = {
        ...company,
        trucks: Array.isArray(company.trucks) ? [...company.trucks, truck] : [truck]
      };

      // Try preferred persistence methods. createCompany is expected to exist on GameContext.
      try {
        if (typeof createCompany === 'function') {
          // createCompany will persist and update in-memory state
          createCompany(updatedCompany);
          safeDispatchToast({ title: 'Truck injected', message: 'Iveco Stralis AS 440 added to your fleet', variant: 'success' });
          try { localStorage.setItem(doneKey, '1'); } catch { /* ignore */ }
          return;
        }
      } catch (err) {
        // fallback to trying a generic update function if present
        // eslint-disable-next-line no-console
        console.warn('[ForceInjectTruck] createCompany failed', err);
      }

      // Try updateCompany / saveCompany / updateUser style methods if present on context
      const backupNames = ['updateCompany', 'saveCompany', 'updateUser', 'saveUserGameState', 'setCompany'];
      for (const name of backupNames) {
        try {
          const fn = ctx?.[name];
          if (typeof fn === 'function') {
            // call it with updated company when possible
            // Some methods expect different signatures; attempt the most common one
            try {
              const res = fn(updatedCompany);
              if (res && typeof res.then === 'function') {
                // if it returns a promise, wait then notify
                res.then(() => {
                  safeDispatchToast({ title: 'Truck injected', message: 'Iveco Stralis AS 440 added to your fleet', variant: 'success' });
                  try { localStorage.setItem(doneKey, '1'); } catch { /* ignore */ }
                }).catch(() => { /* ignore */ });
              } else {
                safeDispatchToast({ title: 'Truck injected', message: 'Iveco Stralis AS 440 added to your fleet', variant: 'success' });
                try { localStorage.setItem(doneKey, '1'); } catch { /* ignore */ }
              }
              return;
            } catch {
              // if fn failed, continue with next fallback
            }
          }
        } catch {
          // ignore
        }
      }

      // Last resort: dispatch a global event other parts of the app listen to
      try {
        window.dispatchEvent(new CustomEvent('applyCompanyUpdate', { detail: { updatedCompany } }));
        safeDispatchToast({ title: 'Truck injected (pending)', message: 'Iveco Stralis AS 440 added locally. Persistence requested.', variant: 'info' });
        try { localStorage.setItem(doneKey, '1'); } catch { /* ignore */ }
        return;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[ForceInjectTruck] final fallback failed', err);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[ForceInjectTruck] unexpected error', err);
    }
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // no UI
  return null;
};

export default ForceInjectTruck;