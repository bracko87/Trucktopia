/**
 * HubsDowngradeFix.tsx
 *
 * UI-backed helper that replaces any native browser confirmation flow for
 * "Downgrade hub (refund 50%)" with an app-styled modal and performs a safe
 * fallback downgrade when the parent page/modal does not persist the change.
 *
 * Responsibilities:
 * - Intercept clicks on buttons titled "Downgrade hub (refund 50%)".
 * - Resolve the intended hub from the open HubDetailsModal DOM and in-memory state.
 * - Show a friendly in-app confirmation modal that performs a safe downgrade.
 * - Use a document-level portal so the modal always appears above other UI.
 *
 * Notes:
 * - This file renders the modal via PortalModal to avoid stacking context/z-index problems.
 */

import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useGame } from '../../contexts/GameContext';
import { getHubLevel } from '../../data/hubLevels';
import PortalModal from '../ui/PortalModal';

/**
 * findNearestDialog
 * @description Walk up the DOM from an element to find the nearest ancestor
 *              with role="dialog" or with common modal wrapper classes.
 * @param el HTMLElement | null
 * @returns HTMLElement | null
 */
function findNearestDialog(el: HTMLElement | null): HTMLElement | null {
  let cur: HTMLElement | null = el;
  while (cur) {
    const role = cur.getAttribute?.('role');
    if (role === 'dialog') return cur;
    if (cur.classList && (cur.classList.contains('fixed') || cur.classList.contains('z-50') || cur.classList.contains('modal-root'))) return cur;
    cur = cur.parentElement;
  }
  return null;
}

/**
 * extractHubNameFromDialog
 * @description Try to extract a short display name from the HubDetailsModal content.
 * @param dialog HTMLElement
 * @returns string | null
 */
function extractHubNameFromDialog(dialog: HTMLElement): string | null {
  try {
    const header = dialog.querySelector('h2, h1, .text-lg, .text-xl') as HTMLElement | null;
    if (header) {
      const parent = header.parentElement ?? dialog;
      const possible = parent.querySelectorAll('div, span, p');
      for (const node of Array.from(possible)) {
        const txt = (node.textContent || '').trim();
        if (!txt) continue;
        if (/Hub Details/i.test(txt) || /Level\s*\d+/i.test(txt) || /Capacity/i.test(txt)) continue;
        if (txt.length > 0 && txt.length < 200) return txt;
      }
    }

    const smalls = dialog.querySelectorAll('div, span');
    for (const s of Array.from(smalls)) {
      const t = (s.textContent || '').trim();
      if (!t) continue;
      if (/Hub Details/i.test(t) || /Level\s*\d+/i.test(t) || /Capacity/i.test(t)) continue;
      if (t.length > 0 && t.length < 200) return t;
    }
  } catch {
    // ignore
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
  if (Array.isArray(company.hubs) && company.hubs.length > 0) return company.hubs.map((h: any) => ({ ...(h ?? {}) }));
  if (company.hub && typeof company.hub === 'object') return [{ ...(company.hub ?? {}) }];
  if (company.infrastructure && Array.isArray(company.infrastructure.hubs)) return company.infrastructure.hubs.map((h: any) => ({ ...(h ?? {}) }));
  if (company.infrastructure && typeof company.infrastructure.hubs === 'object') return Object.values(company.infrastructure.hubs).map((h: any) => ({ ...(h ?? {}) }));
  if (Array.isArray(gameState.hubs) && gameState.hubs.length > 0) return gameState.hubs.map((h: any) => ({ ...(h ?? {}) }));
  return [];
}

/**
 * HubsDowngradeFix
 * @description Visual helper that intercepts Downgrade button clicks and shows
 *              an in-app confirmation modal that performs a safe downgrade.
 */
const HubsDowngradeFix: React.FC = () => {
  const ranRef = useRef(false);
  const game = useGame() as any;
  const { gameState, createCompany } = game ?? {};

  const [modalOpen, setModalOpen] = useState(false);
  const [targetHub, setTargetHub] = useState<any | null>(null);
  const [refund, setRefund] = useState<number>(0);
  const [prevLevel, setPrevLevel] = useState<number>(1);
  const [newLevel, setNewLevel] = useState<number>(1);
  const [processing, setProcessing] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    /**
     * handleClick
     * @description Intercept clicks and prepare an in-app confirmation modal when
     *              the Downgrade button is clicked.
     */
    async function handleClick(e: MouseEvent) {
      try {
        const target = e.target as HTMLElement | null;
        if (!target) return;
        const btn = (target.closest && (target.closest('button[title="Downgrade hub (refund 50%)"]') as HTMLElement | null)) ?? null;
        if (!btn) return;

        // Prevent any native browser confirmation or other handlers
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
          // Show friendly modal message instead of native alert
          setMessage('No hubs available in current company state to downgrade.');
          setModalOpen(true);
          return;
        }

        // Resolve target hub using name matching or fallbacks
        let resolved: any = null;
        if (hubName) {
          const cleaned = hubName.trim();
          resolved = hubs.find((h: any) => {
            const nameCandidates = [
              String(h.name ?? '').trim(),
              String(h.title ?? '').trim(),
              String(h.city ?? '').trim(),
              String(h.id ?? '').trim()
            ].filter(Boolean);
            return nameCandidates.some((c: string) => c && c === cleaned);
          });
        }

        if (!resolved && hubName) {
          const cleaned = hubName.trim().toLowerCase();
          resolved = hubs.find((h: any) => {
            const nameCandidates = [
              String(h.name ?? ''),
              String(h.title ?? ''),
              String(h.city ?? ''),
              String(h.id ?? '')
            ];
            return nameCandidates.some((c: string) => typeof c === 'string' && c.toLowerCase().includes(cleaned));
          });
        }

        if (!resolved && hubs.length === 1) resolved = hubs[0];
        if (!resolved && gameState?.company?.mainHubId) {
          resolved = hubs.find((h: any) => String(h.id) === String(gameState.company.mainHubId));
        }

        if (!resolved) {
          setMessage('Could not resolve which hub to downgrade. Please close the modal and try again.');
          setModalOpen(true);
          return;
        }

        // Prepare modal with computed levels and refund
        const previousLevel = typeof resolved.level === 'number' ? Math.max(1, Math.round(resolved.level)) : 1;
        const nextNewLevel = Math.max(1, previousLevel - 1);
        const prevLevelInfo = getHubLevel(previousLevel);
        const computedRefund = Math.round(((prevLevelInfo?.upgradeCost ?? 0) * 0.5) || 0);

        // Open our modal with resolved hub info (do not mutate immediately)
        setTargetHub(resolved);
        setPrevLevel(previousLevel);
        setNewLevel(nextNewLevel);
        setRefund(computedRefund);
        setMessage(null);
        setModalOpen(true);
      } catch (err) {
        // Fail quietly but show a friendly message
        setMessage('Unexpected error while preparing downgrade. Please try again.');
        setModalOpen(true);
      }
    }

    document.addEventListener('click', handleClick, true);
    return () => {
      document.removeEventListener('click', handleClick, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, createCompany]);

  /**
   * performDowngrade
   * @description Execute the downgrade mutation and persist via createCompany.
   */
  async function performDowngrade() {
    if (!targetHub) return;
    setProcessing(true);
    setMessage(null);

    try {
      const hubs = normalizeHubsFromState(gameState);
      const updatedHubs = hubs.map((h: any) => {
        if (String(h.id ?? h.name ?? '') !== String(targetHub.id ?? targetHub.name ?? '')) return h;
        const previousLevel = prevLevel;
        const newLvl = newLevel;
        const updated = { ...(h ?? {}) };
        updated.previousLevelBeforeDowngrade = previousLevel;
        updated.level = newLvl;
        updated.unlockedFacilities = Array.isArray(updated.unlockedFacilities) ? [] : [];
        updated.facilitiesLockedUntil = Math.max(previousLevel, newLvl);
        return updated;
      });

      const company = gameState?.company ?? {};
      const updatedCompany: any = { ...company };
      const currentCapital = typeof updatedCompany.capital === 'number' ? updatedCompany.capital : Number(updatedCompany.capital ?? 0);
      updatedCompany.capital = currentCapital + refund;

      try { updatedCompany.facilities = Array.isArray(updatedCompany.facilities) ? [] : updatedCompany.facilities; } catch {}
      try {
        if (updatedCompany.infrastructure && typeof updatedCompany.infrastructure === 'object') {
          updatedCompany.infrastructure = { ...(updatedCompany.infrastructure || {}), facilities: Array.isArray(updatedCompany.infrastructure.facilities) ? [] : updatedCompany.infrastructure.facilities };
        }
      } catch {}

      // Re-shape hubs into company's original shape
      if (Array.isArray(company.hubs)) {
        updatedCompany.hubs = updatedHubs;
      } else if (company.hub && typeof company.hub === 'object') {
        updatedCompany.hub = updatedHubs[0] ?? null;
      } else if (company.infrastructure && company.infrastructure.hubs && typeof company.infrastructure.hubs === 'object') {
        const keyed: Record<string, any> = {};
        updatedHubs.forEach((h: any) => {
          const id = String(h.id ?? h.name ?? Math.random().toString(36).slice(2, 9));
          keyed[id] = h;
        });
        updatedCompany.infrastructure = { ...(updatedCompany.infrastructure || {}), hubs: keyed };
      } else {
        updatedCompany.hubs = updatedHubs;
      }

      // Persist changes via createCompany if available
      let persisted = false;
      try {
        const res = createCompany(updatedCompany);
        if (res instanceof Promise) await res;
        persisted = true;
      } catch {
        persisted = false;
      }

      // localStorage fallback so the app reads the changed state
      try {
        const userKey = gameState?.currentUser ? 'tm_user_state_' + String(gameState.currentUser) : 'tm_user_state_local';
        const safe = { isAuthenticated: true, company: updatedCompany, sidebarCollapsed: gameState?.sidebarCollapsed ?? false };
        localStorage.setItem(userKey, JSON.stringify(safe));
        try { localStorage.setItem('tm_admin_state', JSON.stringify(safe)); } catch {}
      } catch {
        // ignore storage fails
      }

      setMessage(`Downgrade applied for \"${String(targetHub.name ?? targetHub.title ?? targetHub.id)}\". Refund: ${refund} USD.`);
      setProcessing(false);

      // Auto-close modal after short delay to show success message
      setTimeout(() => {
        setModalOpen(false);
        setTargetHub(null);
        setMessage(null);
      }, 900);
    } catch (err) {
      setProcessing(false);
      setMessage('Downgrade failed: unexpected error.');
    }
  }

  if (!modalOpen) return null;

  return (
    <PortalModal
      open={modalOpen}
      onClose={() => {
        if (!processing) {
          setModalOpen(false);
          setTargetHub(null);
          setMessage(null);
        }
      }}
      dialogClassName="max-w-xl w-full"
    >
      <div className="relative max-w-xl w-full bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Confirm Hub Downgrade</h3>
            <div className="text-sm text-slate-400 mt-1">This action will downgrade the selected hub and apply a refund.</div>
          </div>
          <button
            aria-label="Close downgrade modal"
            onClick={() => {
              if (!processing) {
                setModalOpen(false);
                setTargetHub(null);
                setMessage(null);
              }
            }}
            className="text-slate-400 hover:text-white p-1 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4">
          <div className="text-sm text-slate-400">Hub</div>
          <div className="text-white font-medium">{String(targetHub?.name ?? targetHub?.title ?? targetHub?.id ?? '—')}</div>

          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-slate-400">Current level</div>
              <div className="text-white font-medium">Level {prevLevel}</div>
            </div>

            <div>
              <div className="text-sm text-slate-400">After downgrade</div>
              <div className="text-white font-medium">Level {newLevel}</div>
            </div>
          </div>

          <div className="mt-3 text-sm text-slate-400">
            Refund: <span className="text-white font-medium">{refund ? `$${refund.toLocaleString()}` : '—'}</span> (50% of current level upgrade cost)
          </div>

          <div className="mt-6 flex items-center space-x-3">
            <button
              onClick={performDowngrade}
              disabled={processing}
              className={`bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-medium ${processing ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {processing ? 'Processing…' : 'Confirm Downgrade'}
            </button>

            <button
              onClick={() => {
                if (!processing) {
                  setModalOpen(false);
                  setTargetHub(null);
                  setMessage(null);
                }
              }}
              className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-md text-sm"
            >
              Cancel
            </button>
          </div>

          {message && <div className="mt-4 text-sm text-slate-200">{message}</div>}
        </div>
      </div>
    </PortalModal>
  );
};

export default HubsDowngradeFix;