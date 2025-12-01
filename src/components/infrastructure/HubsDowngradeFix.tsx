/**
 * HubsDowngradeFix.tsx
 *
 * UI-less helper that wires the Downgrade button to a robust fallback downgrade
 * processor when the page/button does not execute the expected logic.
 *
 * Responsibilities:
 * - Intercept clicks on buttons titled "Downgrade hub (refund 50%)".
 * - Resolve the intended hub from the open HubDetailsModal DOM and the in-memory game state.
 * - Apply a safe downgrade fallback:
 *   - reduce hub.level by 1 (min 1)
 *   - clear unlockedFacilities
 *   - set facilitiesLockedUntil = previousLevel (blocks facility upgrades until re-upgrade)
 *   - clear top-level company.facilities and infrastructure.facilities
 *   - credit 50% refund of previous level's upgradeCost into company.capital
 * - Persist changes via createCompany and write a localStorage fallback so other systems read the updated state.
 *
 * This component is defensive and non-visual. It does not change layout/appearance.
 */

import React, { useEffect, useRef } from 'react';
import { useGame } from '../../contexts/GameContext';
import { getHubLevel } from '../../data/hubLevels';

/**
 * findNearestDialog
 * @description Walk up the DOM from an element to find the nearest ancestor with role="dialog" or with class indicating a modal.
 * @param el HTMLElement | null
 * @returns HTMLElement | null
 */
function findNearestDialog(el: HTMLElement | null): HTMLElement | null {
  let cur: HTMLElement | null = el;
  while (cur) {
    const role = cur.getAttribute?.('role');
    if (role === 'dialog') return cur;
    // fallback: common modal wrapper classes may include 'fixed' + 'z-50' for our modals
    if (cur.classList && (cur.classList.contains('fixed') || cur.classList.contains('z-50'))) return cur;
    cur = cur.parentElement;
  }
  return null;
}

/**
 * extractHubNameFromDialog
 * @description Attempt to extract the hub name shown inside the HubDetailsModal.
 *              The modal includes a heading "Hub Details" followed by a small text
 *              element showing the hub.name/title. We try to read a child text node
 *              that matches a known hub name.
 * @param dialog HTMLElement
 * @returns string | null - extracted hub name/title or null
 */
function extractHubNameFromDialog(dialog: HTMLElement): string | null {
  try {
    // Prefer the first .text-sm element after the header (HubDetailsModal structure)
    const header = dialog.querySelector('h2, h1, .text-lg, .text-xl');
    if (header) {
      // find sibling small text nodes under the same container
      const parent = header.parentElement ?? dialog;
      // attempt to locate any element that contains hub display text
      const possible = parent.querySelectorAll('div, span, p');
      for (const node of Array.from(possible)) {
        const txt = (node.textContent || '').trim();
        if (!txt) continue;
        // Skip generic labels
        if (/Hub Details/i.test(txt) || /Level\s*\d+/i.test(txt) || /Capacity/i.test(txt)) continue;
        // Usually the hub name/title is short (<= 100 chars) and not just punctuation
        if (txt.length > 0 && txt.length < 200) return txt;
      }
    }

    // Fallback: find any small text under dialog likely to be the hub name
    const smalls = dialog.querySelectorAll('div, span');
    for (const s of Array.from(smalls)) {
      const t = (s.textContent || '').trim();
      if (!t) continue;
      if (/Hub Details/i.test(t) || /Level\s*\d+/i.test(t) || /Capacity/i.test(t)) continue;
      if (t.length > 0 && t.length < 200) return t;
    }
  } catch {
    // ignore extraction errors
  }
  return null;
}

/**
 * normalizeHubsFromState
 * @description Return array of hubs from gameState/company in tolerant shapes.
 * @param gameState any
 */
function normalizeHubsFromState(gameState: any): any[] {
  if (!gameState) return [];
  const company = gameState.company ?? {};
  // various possible shapes
  if (Array.isArray(company.hubs) && company.hubs.length > 0) return company.hubs.map((h: any) => ({ ...(h ?? {}) }));
  if (company.hub && typeof company.hub === 'object') return [{ ...(company.hub ?? {}) }];
  if (company.infrastructure && Array.isArray(company.infrastructure.hubs)) return company.infrastructure.hubs.map((h: any) => ({ ...(h ?? {}) }));
  if (company.infrastructure && typeof company.infrastructure.hubs === 'object') return Object.values(company.infrastructure.hubs).map((h: any) => ({ ...(h ?? {}) }));
  if (Array.isArray(gameState.hubs) && gameState.hubs.length > 0) return gameState.hubs.map((h: any) => ({ ...(h ?? {}) }));
  return [];
}

/**
 * HubsDowngradeFix
 * @description Non-visual background component to ensure Downgrade buttons perform a safe fallback downgrade.
 */
const HubsDowngradeFix: React.FC = () => {
  const ranRef = useRef(false);
  const game = useGame() as any;
  const { gameState, createCompany } = game ?? {};

  useEffect(() => {
    if (ranRef.current) return; // harmless guard
    ranRef.current = true;

    /**
     * handleClick
     * @description Intercept clicks and, for the Downgrade button title, perform fallback downgrade.
     */
    async function handleClick(e: MouseEvent) {
      try {
        const target = e.target as HTMLElement | null;
        if (!target) return;
        // Check the clicked element or its ancestors for the button with the specific title
        const btn = (target.closest && (target.closest('button[title="Downgrade hub (refund 50%)"]') as HTMLElement | null)) ?? null;
        if (!btn) return;

        // Prevent duplicate native handlers if any
        e.preventDefault();
        e.stopPropagation();

        // Attempt to find modal/dialog with hub info
        const dialog = findNearestDialog(btn);
        let hubName: string | null = null;
        if (dialog) {
          hubName = extractHubNameFromDialog(dialog);
        }

        // Normalize hubs from state and attempt to match by name/title/city/id
        const hubs = normalizeHubsFromState(gameState);
        if (!hubs || hubs.length === 0) {
          window.alert('No hubs available in current company state to downgrade.');
          return;
        }

        // Attempt to find hub by exact name match first
        let targetHub: any = null;
        if (hubName) {
          const cleaned = hubName.trim();
          targetHub = hubs.find((h: any) => {
            const nameCandidates = [
              String(h.name ?? '').trim(),
              String(h.title ?? '').trim(),
              String(h.city ?? '').trim(),
              String(h.id ?? '').trim()
            ].filter(Boolean);
            return nameCandidates.some((c: string) => c && c === cleaned);
          });
        }

        // If not found and dialog exists, attempt looser contains match
        if (!targetHub && hubName) {
          const cleaned = hubName.trim().toLowerCase();
          targetHub = hubs.find((h: any) => {
            const nameCandidates = [
              String(h.name ?? ''),
              String(h.title ?? ''),
              String(h.city ?? ''),
              String(h.id ?? '')
            ];
            return nameCandidates.some((c: string) => typeof c === 'string' && c.toLowerCase().includes(cleaned));
          });
        }

        // Fallback: if only one hub present, pick it
        if (!targetHub && hubs.length === 1) targetHub = hubs[0];

        // Fallback: if company.mainHubId present, find it
        if (!targetHub && gameState?.company?.mainHubId) {
          targetHub = hubs.find((h: any) => String(h.id) === String(gameState.company.mainHubId));
        }

        if (!targetHub) {
          window.alert('Could not resolve which hub to downgrade. Please close the modal and try again.');
          return;
        }

        // Perform downgrade fallback mutation
        const prevLevel = typeof targetHub.level === 'number' ? Math.max(1, Math.round(targetHub.level)) : 1;
        const newLevel = Math.max(1, prevLevel - 1);
        const prevLevelInfo = getHubLevel(prevLevel);
        const refund = Math.round(((prevLevelInfo?.upgradeCost ?? 0) * 0.5) || 0);

        // Build updated hubs array preserving original shapes where possible
        const updatedHubs = hubs.map((h: any) => {
          if (String(h.id ?? h.name ?? '') !== String(targetHub.id ?? targetHub.name ?? '')) return h;
          const copy = { ...(h ?? {}) };
          copy.previousLevelBeforeDowngrade = prevLevel;
          copy.level = newLevel;
          copy.unlockedFacilities = Array.isArray(copy.unlockedFacilities) ? [] : [];
          copy.facilitiesLockedUntil = Math.max(prevLevel, newLevel);
          return copy;
        });

        // Build updated company object
        const company = gameState?.company ?? {};
        const updatedCompany: any = { ...company };

        // Add refund to capital defensively
        const currentCapital = typeof updatedCompany.capital === 'number' ? updatedCompany.capital : Number(updatedCompany.capital ?? 0);
        updatedCompany.capital = currentCapital + refund;

        // Clear top-level facilities arrays if present
        try { updatedCompany.facilities = Array.isArray(updatedCompany.facilities) ? [] : updatedCompany.facilities; } catch {}
        try {
          if (updatedCompany.infrastructure && typeof updatedCompany.infrastructure === 'object') {
            updatedCompany.infrastructure = { ...(updatedCompany.infrastructure || {}), facilities: Array.isArray(updatedCompany.infrastructure.facilities) ? [] : updatedCompany.infrastructure.facilities };
          }
        } catch {}

        // Shape hubs back into company respecting common shapes
        if (Array.isArray(company.hubs)) {
          updatedCompany.hubs = updatedHubs;
        } else if (company.hub && typeof company.hub === 'object') {
          updatedCompany.hub = updatedHubs[0] ?? null;
        } else if (company.infrastructure && company.infrastructure.hubs && typeof company.infrastructure.hubs === 'object') {
          // convert to keyed object
          const keyed: Record<string, any> = {};
          updatedHubs.forEach((h: any) => {
            const id = String(h.id ?? h.name ?? Math.random().toString(36).slice(2, 9));
            keyed[id] = h;
          });
          updatedCompany.infrastructure = { ...(updatedCompany.infrastructure || {}), hubs: keyed };
        } else {
          // fallback to array
          updatedCompany.hubs = updatedHubs;
        }

        // Persist via createCompany when available (centralized)
        let persisted = false;
        try {
          const res = createCompany(updatedCompany);
          if (res instanceof Promise) await res;
          persisted = true;
        } catch {
          persisted = false;
        }

        // localStorage fallback (ensure the app reads the changed state)
        try {
          const userKey = gameState?.currentUser ? 'tm_user_state_' + String(gameState.currentUser) : 'tm_user_state_local';
          const safe = { isAuthenticated: true, company: updatedCompany, sidebarCollapsed: gameState?.sidebarCollapsed ?? false };
          localStorage.setItem(userKey, JSON.stringify(safe));
          // also write admin fallback key for admin
          try { localStorage.setItem('tm_admin_state', JSON.stringify(safe)); } catch {}
        } catch {
          // ignore storage failures
        }

        // Notify user and optionally reload if persisted false (we avoid forced reload by default)
        window.alert(`Downgrade applied for hub "${String(targetHub.name ?? targetHub.title ?? targetHub.id)}". Refund: ${refund} USD.`);

        // Let any other handlers run if needed (we prevented default earlier)
        return;
      } catch (err) {
        // Show a generic message; do not expose internals
        try { window.alert('Downgrade failed: unexpected error.'); } catch {}
      }
    }

    document.addEventListener('click', handleClick, true);
    return () => {
      document.removeEventListener('click', handleClick, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, createCompany]);

  return null;
};

export default HubsDowngradeFix;
