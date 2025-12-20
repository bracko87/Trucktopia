/**
 * PurchaseButton.tsx
 *
 * Small, reusable purchase button used by market listing cards.
 *
 * Responsibilities:
 * - Present a purchase CTA that opens a confirm dialog.
 * - Let the user pick a delivery hub (main or any company hub).
 * - Show a single dynamic line with hub capacity info (assigned / max and level)
 *   under the Deliver-to selector. This is kept live and recomputes when the
 *   company, selected hub, or hub level changes.
 * - Block confirmation when the chosen hub is at capacity.
 *
 * Note: This file keeps the UI and layout of the existing modal intact and only
 * adds required hub resolution logic and a robust capacity line.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useGame } from '../../contexts/GameContext';
import ConfirmPurchaseHubInfo from './ConfirmPurchaseHubInfo';
import { getHubCapacityInfo } from '../../engines/hubCapacityEngine';
import { readSelectedHub, writeSelectedHub } from '../../utils/selectedHubStorage';
import { assignPurchasedToCompany } from '../../utils/vehiclePurchaseUtils';

/**
 * VehicleKind
 * @description Vehicle kind override type
 */
export type VehicleKind = 'truck' | 'trailer' | undefined;

/**
 * Props
 * @description Component props for PurchaseButton.
 */
interface Props {
  item: any;
  label?: string;
  onDone?: (updatedCompany: any, item: any) => void;
  confirmPurchase?: (item: any) => Promise<any> | any;
  forceKind?: VehicleKind;
}

/**
 * PurchaseButton
 * @description Reusable purchase button that opens a confirmation modal which
 * shows a dynamic hub capacity line and prevents purchase if the target hub is full.
 *
 * Behavior details:
 * - The "main hub" option uses the sentinel 'main'. When resolving the hub reference,
 *   we map 'main' to company.hub (or first company.hubs entry). This ensures the
 *   hubCapacityEngine receives a hub object (not an empty string).
 */
const PurchaseButton: React.FC<Props> = ({ item, label = 'Purchase', onDone, confirmPurchase, forceKind }) => {
  const { gameState, createCompany } = useGame() as any;
  const company = gameState?.company ?? null;

  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const defaultCompanyKey = useMemo(() => String(gameState?.company?.id ?? 'local'), [gameState?.company?.id]);

  const [selectedHubId, setSelectedHubId] = useState<string | null>(() => {
    try {
      return readSelectedHub(gameState?.company?.id ?? 'local') ?? null;
    } catch {
      return null;
    }
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * hubList
   * @description Returns array of hubs available to the company (main + company hubs).
   */
  const hubList = useMemo(() => {
    if (!company) return [];
    const hubsArr = Array.isArray(company.hubs)
      ? company.hubs
      : Array.isArray(company.infrastructure?.hubs)
      ? company.infrastructure.hubs
      : [];

    // Normalize hub entries to objects with stable id & label
    const normalized = hubsArr.map((h: any) => ({
      id: String(h?.id ?? h?.name ?? ''),
      label: `${h?.name ?? h?.id ?? 'Hub'}${h?.level ? ` (L${h.level})` : ''}`,
      raw: h
    }));

    return normalized;
  }, [company]);

  /**
   * getDefaultHubId
   * @description Determine the default hub id to select when nothing stored.
   * Uses company.hub if present, otherwise the first hub in hubList or 'main'.
   */
  function getDefaultHubId(): string {
    try {
      if (company?.hub) {
        const candidate = String(company.hub.id ?? company.hub.name ?? '');
        return candidate !== '' ? candidate : 'main';
      }
      if (hubList.length > 0) return hubList[0].id || 'main';
    } catch {
      // ignore
    }
    return 'main';
  }

  // Keep selectedHubId in sync whenever company changes
  useEffect(() => {
    try {
      const stored = readSelectedHub(defaultCompanyKey);
      setSelectedHubId(stored ?? getDefaultHubId());
    } catch {
      setSelectedHubId(getDefaultHubId());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultCompanyKey, company?.id]);

  /**
   * effectiveHubRef
   * @description Resolve what we will provide to getHubCapacityInfo.
   * - If selectedHubId is 'main' or falsy: use company.hub || first hub || null.
   * - Else, try find the hub object from hubList by id, else pass the raw id string.
   */
  const effectiveHubRef = useMemo(() => {
    if (!company) return null;

    // Main sentinel handling
    const sel = selectedHubId ?? 'main';

    if (!sel || sel === 'main' || sel === '') {
      // prefer explicit company.hub object if available
      if (company.hub) return company.hub;
      if (hubList.length > 0) return hubList[0].raw;
      // fallback to main hub id stored in company
      if (company.mainHubId) return { id: company.mainHubId, level: company.hub?.level ?? 1 };
      return null;
    }

    // Find object in known hubs
    const found = hubList.find((h) => String(h.id) === String(sel));
    if (found) return found.raw;

    // No object found - return the id string so engine will try to resolve
    return sel;
  }, [company, hubList, selectedHubId]);

  /**
   * hubInfo
   * @description Memoized hub capacity info for the resolved hub.
   */
  const hubInfo = useMemo(() => {
    try {
      return getHubCapacityInfo(company, effectiveHubRef);
    } catch {
      return { hubId: null, hubName: null, level: 1, maxAllowed: 0, assignedCount: 0, isFull: false };
    }
  }, [company, effectiveHubRef]);

  /**
   * openConfirm
   * @description Open confirm dialog and re-read persisted hub selection.
   */
  function openConfirm() {
    try {
      const stored = readSelectedHub(defaultCompanyKey);
      setSelectedHubId(stored ?? getDefaultHubId());
    } catch {
      setSelectedHubId(getDefaultHubId());
    }
    setErrorMessage(null);
    setConfirmOpen(true);
  }

  /**
   * closeConfirm
   * @description Close the confirm modal and clear errors.
   */
  function closeConfirm() {
    setConfirmOpen(false);
    setErrorMessage(null);
  }

  /**
   * handleConfirm
   * @description Validate capacity, perform optional server confirmPurchase, assign the item and persist.
   */
  async function handleConfirm() {
    if (!company) {
      setErrorMessage('No company present. Create a company first.');
      return;
    }

    // Recompute the hub info to be safe
    const info = getHubCapacityInfo(company, effectiveHubRef);

    if (info.assignedCount >= info.maxAllowed) {
      setErrorMessage('Cannot purchase: selected hub is at capacity.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      if (typeof confirmPurchase === 'function') {
        await confirmPurchase(item);
      }

      const itemToAssign = forceKind ? { ...item, vehicleKind: forceKind } : item;
      const updated = assignPurchasedToCompany(company, itemToAssign);

      if (typeof createCompany === 'function') {
        // Persist updated company to context/storage
        await Promise.resolve(createCompany(updated));
      } else {
        // eslint-disable-next-line no-console
        console.warn('PurchaseButton: createCompany not available; applied locally only.');
      }

      // persist chosen hub selection per-company for future purchases
      try {
        writeSelectedHub(defaultCompanyKey, selectedHubId ?? 'main');
      } catch {
        // ignore storage errors
      }

      if (typeof onDone === 'function') {
        onDone(updated, itemToAssign);
      }

      setConfirmOpen(false);
    } catch (err: any) {
      setErrorMessage(String(err?.message ?? 'Purchase failed.'));
      // eslint-disable-next-line no-console
      console.error('PurchaseButton: confirm error', err);
    } finally {
      setLoading(false);
    }
  }

  /**
   * handlePurchaseClick
   * @description Entry point for the Purchase CTA — open the confirm dialog.
   */
  function handlePurchaseClick() {
    openConfirm();
  }

  return (
    <>
      <button
        type="button"
        onClick={handlePurchaseClick}
        disabled={loading}
        className="inline-flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm transition-colors disabled:opacity-60"
      >
        <span>{loading ? 'Processing...' : label}</span>
      </button>

      {confirmOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              if (!loading) closeConfirm();
            }}
          />
          <div className="relative z-10 w-full max-w-xl bg-slate-800 rounded-xl border border-slate-700 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Confirm purchase</h2>
                <p className="text-sm text-slate-400">Verify delivery hub and hub capacity before confirming.</p>
              </div>

              <button
                aria-label="Close"
                onClick={() => {
                  if (!loading) closeConfirm();
                }}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                ×
              </button>
            </div>

            {/* Deliver to select */}
            <div className="mt-4">
              <label className="block text-sm text-slate-300 mb-2">Deliver to</label>
              <select
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                value={selectedHubId ?? 'main'}
                onChange={(e) => {
                  const v = e.target.value || 'main';
                  setSelectedHubId(v);
                  try {
                    writeSelectedHub(defaultCompanyKey, v);
                  } catch {
                    // ignore storage errors
                  }
                  setErrorMessage(null);
                }}
              >
                {/* Main hub sentinel value */}
                <option value="main">{company?.hub?.name ? `${company.hub.name} (main)` : '(main hub)'}</option>
                {hubList.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.label}
                  </option>
                ))}
              </select>

              <div className="text-xs text-slate-400 mt-2">
                Delivery in <span className="text-white font-semibold">1</span> day(s).
              </div>
            </div>

            {/* Dynamic hub capacity info - visible under the select */}
            <div className="mt-4">
              <ConfirmPurchaseHubInfo
                hubName={hubInfo.hubName ?? undefined}
                assignedCount={hubInfo.assignedCount}
                maxAllowed={hubInfo.maxAllowed}
                level={hubInfo.level}
              />
            </div>

            {/* Inline error message when full */}
            {errorMessage && <div className="mt-3 text-sm text-rose-300">{errorMessage}</div>}

            <div className="mt-6 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  if (!loading) closeConfirm();
                }}
                className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-md text-sm"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading || (hubInfo.maxAllowed > 0 && hubInfo.assignedCount >= hubInfo.maxAllowed)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm disabled:opacity-60"
              >
                {loading ? 'Processing…' : 'Confirm Purchase'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PurchaseButton;