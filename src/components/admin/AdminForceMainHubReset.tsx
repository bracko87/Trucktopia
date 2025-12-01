/**
 * AdminForceMainHubReset.tsx
 *
 * UI-less admin helper that forces the main hub(s) for the admin account to:
 *  - set level = 1
 *  - clear unlockedFacilities
 *  - set facilitiesLockedUntil = 999 (lock upgrades)
 *  - clear top-level company.facilities and infrastructure.facilities arrays
 *  - credit a 50% refund of the previous level's upgradeCost per-hub to company.capital
 *
 * Purpose:
 * - This component is intentionally non-visual. It runs side-effects when the
 *   admin account (bracko87@live.com) is active in-session and persists the
 *   normalized company state through createCompany. It is defensive and idempotent.
 */

import React, { useEffect, useRef } from 'react';
import { useGame } from '../../contexts/GameContext';
import { getHubLevel } from '../../data/hubLevels';

const ADMIN_EMAIL = 'bracko87@live.com';
const LOCK_SENTINEL = 999;

/**
 * normalizeHubsArray
 * @description Convert possible hub shapes into a consistent array of hub objects.
 *              Handles: company.hubs (array), company.hub (single object),
 *              company.infrastructure.hubs (object keyed by id), gameState.hubs (array).
 * @param raw any - source value
 * @returns any[] - normalized array
 */
function normalizeHubsArray(raw: any): any[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(r => ({ ...(r ?? {}) }));
  if (typeof raw === 'object') {
    // keyed object -> values
    try {
      return Object.values(raw).map(v => ({ ...(v ?? {}) }));
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * shapeBackToOriginal
 * @description Attempts to write the updated hubs back in the original shape so
 *              the application that expects a specific hub shape continues to work.
 *              Priority:
 *                1) if originalCompany.hubs was an array -> return { hubs: array }
 *                2) if originalCompany.hub was object -> return { hub: first }
 *                3) if originalCompany.infrastructure?.hubs was keyed object -> return keyed object
 *                4) fallback to hubs array
 * @param originalCompany any
 * @param updatedHubs any[]
 * @returns object with hubs/hub/infrastructure.hubs set appropriately
 */
function shapeBackToOriginal(originalCompany: any, updatedHubs: any[]) {
  const out: any = {};
  try {
    if (Array.isArray(originalCompany?.hubs)) {
      out.hubs = updatedHubs;
    } else if (originalCompany?.hub && typeof originalCompany.hub === 'object') {
      out.hub = updatedHubs[0] ?? null;
    } else if (originalCompany?.infrastructure && originalCompany.infrastructure.hubs && typeof originalCompany.infrastructure.hubs === 'object') {
      const keyed: Record<string, any> = {};
      updatedHubs.forEach((h: any) => {
        const id = String(h.id ?? h.name ?? Math.random());
        keyed[id] = h;
      });
      out.infrastructure = { ...(originalCompany.infrastructure || {}), hubs: keyed };
    } else {
      out.hubs = updatedHubs;
    }
  } catch {
    out.hubs = updatedHubs;
  }
  return out;
}

/**
 * AdminForceMainHubReset
 * @description React UI-less component that runs on mount. Detects the admin user
 *              and applies the main-hub reset transformation and persists it via
 *              createCompany. Falls back to localStorage persistence for resilience.
 */
const AdminForceMainHubReset: React.FC = () => {
  const { gameState, createCompany } = useGame() as any;
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    try {
      if (!gameState) {
        // no game state yet
        return;
      }

      const currentUser = String(gameState.currentUser ?? '').toLowerCase();
      if (currentUser !== ADMIN_EMAIL) {
        // not admin; do nothing
        return;
      }

      const company = gameState.company;
      if (!company) {
        // eslint-disable-next-line no-console
        console.info('[AdminForceMainHubReset] admin active but no company present');
        return;
      }

      // Identify raw hubs in various places (respect application shapes)
      const rawSource =
        Array.isArray(company.hubs) ? company.hubs
        : company.hub && typeof company.hub === 'object' ? [company.hub]
        : company.infrastructure && Array.isArray(company.infrastructure.hubs) ? company.infrastructure.hubs
        : company.infrastructure && company.infrastructure.hubs && typeof company.infrastructure.hubs === 'object' ? Object.values(company.infrastructure.hubs)
        : Array.isArray(gameState.hubs) ? gameState.hubs
        : null;

      const hubsArr = normalizeHubsArray(rawSource);

      // Nothing to change? still clear top-level facilities if present
      if (hubsArr.length === 0 && !company.facilities && !company.infrastructure?.facilities) {
        // nothing to do
        // eslint-disable-next-line no-console
        console.info('[AdminForceMainHubReset] no hubs or facilities to reset');
        return;
      }

      // Build updated hubs and compute refund
      let totalRefund = 0;
      const updatedHubs = hubsArr.map((h: any) => {
        const copy = { ...(h ?? {}) };

        const prevLevel = typeof copy.level === 'number' ? Math.max(1, Math.round(copy.level)) : 1;

        // Compute 50% refund of the previous level's upgradeCost (defensive)
        try {
          const prevLevelInfo = getHubLevel(prevLevel);
          const refund = Math.round((prevLevelInfo?.upgradeCost ?? 0) * 0.5);
          totalRefund += refund;
        } catch {
          // ignore if getHubLevel fails
        }

        copy.previousLevelBeforeAdminReset = prevLevel;
        copy.level = 1;
        copy.unlockedFacilities = Array.isArray(copy.unlockedFacilities) ? [] : [];
        copy.facilitiesLockedUntil = LOCK_SENTINEL;

        return copy;
      });

      // Build updated company while preserving other fields
      const updatedCompany: any = {
        ...company,
        // credit refund (defensive numeric coercion)
        capital: (typeof company.capital === 'number' ? company.capital : Number(company.capital ?? 0)) + totalRefund
      };

      // Clear top-level facilities arrays to avoid UI showing upgradeable lists
      try {
        if ('facilities' in updatedCompany) updatedCompany.facilities = [];
      } catch {
        // ignore
      }
      try {
        if (updatedCompany.infrastructure && typeof updatedCompany.infrastructure === 'object') {
          updatedCompany.infrastructure = { ...(updatedCompany.infrastructure || {}), facilities: [] };
        }
      } catch {
        // ignore
      }

      // Put hubs back respecting original shape where possible
      const shaped = shapeBackToOriginal(company, updatedHubs);
      Object.assign(updatedCompany, shaped);

      // Persist using createCompany so normalization / storage is handled centrally
      (async () => {
        try {
          // If createCompany supports promises, await it; otherwise it's fine.
          const result = createCompany(updatedCompany);
          if (result instanceof Promise) {
            await result;
          }
          // eslint-disable-next-line no-console
          console.info('[AdminForceMainHubReset] Admin main hub reset applied. Total refund credited:', totalRefund);

          // For extra robustness: write fallback localStorage keys that the app sometimes reads.
          try {
            const userKey = 'tm_user_state_' + String(gameState.currentUser ?? 'local');
            const fallbackState = { isAuthenticated: true, company: updatedCompany, sidebarCollapsed: gameState.sidebarCollapsed ?? false };
            localStorage.setItem(userKey, JSON.stringify(fallbackState));
            localStorage.setItem('tm_admin_state', JSON.stringify(fallbackState));
          } catch (err) {
            // ignore localStorage failures
          }

          // Ensure UI reflects the change immediately. Reload once per session to avoid loops.
          try {
            const reloadedKey = 'adminForceMainHubReset:reloaded';
            if (!sessionStorage.getItem(reloadedKey)) {
              sessionStorage.setItem(reloadedKey, '1');
              // small delay to allow any state propagation before reload
              setTimeout(() => {
                window.location.reload();
              }, 250);
            }
          } catch {
            // ignore
          }
        } catch (err) {
          // fallback: try localStorage persistence then reload
          try {
            const fallbackState = { isAuthenticated: true, company: updatedCompany, sidebarCollapsed: gameState.sidebarCollapsed ?? false };
            const userKey = 'tm_user_state_' + String(gameState.currentUser ?? 'local');
            localStorage.setItem(userKey, JSON.stringify(fallbackState));
            localStorage.setItem('tm_admin_state', JSON.stringify(fallbackState));
            // eslint-disable-next-line no-console
            console.info('[AdminForceMainHubReset] fallback persistence applied. Total refund credited:', totalRefund);

            const reloadedKey = 'adminForceMainHubReset:reloaded';
            if (!sessionStorage.getItem(reloadedKey)) {
              sessionStorage.setItem(reloadedKey, '1');
              setTimeout(() => {
                window.location.reload();
              }, 250);
            }
          } catch (err2) {
            // eslint-disable-next-line no-console
            console.warn('[AdminForceMainHubReset] failed to persist admin reset', err2);
          }
        }
      })();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[AdminForceMainHubReset] unexpected error', err);
    }
  }, [gameState, createCompany]);

  return null;
};

export default AdminForceMainHubReset;