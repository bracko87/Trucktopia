/**
 * HubDetailsModal.tsx
 *
 * Presentational modal for hub details and level management.
 *
 * Responsibilities:
 * - Show hub title, level, capacity and upgrade/downgrade costs.
 * - Provide Upgrade flow and Downgrade flow with confirmation.
 * - If no onDowngrade handler is provided by the parent, perform a safe
 *   fallback downgrade via GameContext: reduce hub.level, apply 50% refund
 *   and keep facilities available but mark them blocked from further upgrades
 *   until the hub reaches the previously held level.
 *
 * Notes:
 * - All hooks are declared unconditionally at the top of the component to
 *   avoid invalid-hook-order runtime errors (React error #310).
 * - This component uses an in-place fallback updater that augments hub objects
 *   with a facilitiesLockedUntil property that other code can check when
 *   attempting facility upgrades.
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { getHubLevel } from '../../data/hubLevels';
import { useGame } from '../../contexts/GameContext';

interface Hub {
  id: string;
  name?: string;
  level?: number;
  capacity?: number;
  description?: string;
  // allow extra fields
  [key: string]: any;
}

interface HubDetailsModalProps {
  /** hub object to show (nullable) */
  hub: Hub | null;
  /** close handler */
  onClose?: () => void;
  /** upgrade handler (optional) - called with hubId */
  onUpgrade?: (hubId: string) => void | Promise<void>;
  /** downgrade handler (optional) - called with hubId */
  onDowngrade?: (hubId: string) => void | Promise<void>;
  /** explicit open flag (optional) */
  open?: boolean;
}

/**
 * formatCurrency
 * @description Format number into USD style string with thousands separator.
 * @param v number
 */
function formatCurrency(v: number) {
  try {
    return '$' + Number(v).toLocaleString();
  } catch {
    return '$' + String(v);
  }
}

/**
 * HubDetailsModal
 * @description Presentational modal component for hub details with safe hook usage.
 */
const HubDetailsModal: React.FC<HubDetailsModalProps> = ({ hub, onClose, onUpgrade, onDowngrade, open }) => {
  /**
   * All hooks declared unconditionally to avoid invalid hook-call order errors.
   */
  const [visible, setVisible] = useState<boolean>(false);
  const [confirmingUpgrade, setConfirmingUpgrade] = useState(false);
  const [confirmingDowngrade, setConfirmingDowngrade] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Game context fallback updater (used when onDowngrade is not provided)
  const { gameState, createCompany } = useGame();

  /**
   * currentLevel / nextLevel / prevLevel / cost infos
   * computed synchronously (no conditional hooks)
   */
  const currentLevel = typeof hub?.level === 'number' ? Math.max(1, Math.round(hub.level)) : 1;
  const nextLevel = Math.min(10, currentLevel + 1);
  const prevLevel = Math.max(1, currentLevel - 1);

  const nextLevelInfo = hub ? getHubLevel(nextLevel) : null;
  const currentLevelInfo = hub ? getHubLevel(currentLevel) : null;

  const upgradeCost = nextLevelInfo?.upgradeCost ?? null;
  const downgradeRefund = currentLevel > 1 ? Math.round((currentLevelInfo?.upgradeCost ?? 0) * 0.5) : 0;

  /**
   * synchronize visible state from props (open || hub)
   */
  useEffect(() => {
    const shouldBeVisible = typeof open === 'boolean' ? open : Boolean(hub);
    setVisible(shouldBeVisible);
    if (!shouldBeVisible) {
      setConfirmingDowngrade(false);
      setConfirmingUpgrade(false);
      setProcessing(false);
      setMessage(null);
    }
  }, [open, hub]);

  /**
   * handleUpgradeConfirm
   * @description Trigger upgrade flow, call handler if provided.
   */
  async function handleUpgradeConfirm() {
    if (!hub) return;
    setProcessing(true);
    setMessage(null);

    try {
      if (onUpgrade) {
        // If parent provided an upgrade handler, use it.
        await Promise.resolve(onUpgrade(hub.id));
        setMessage('Upgrade successful.');
      } else {
        // Fallback upgrade behavior (symmetric to the downgrade fallback).
        const company = gameState?.company;
        if (!company) {
          setMessage('No company context available.');
          return;
        }

        const cost = upgradeCost ?? nextLevelInfo?.upgradeCost ?? 0;
        if ((company.capital ?? 0) < cost) {
          setMessage(`Insufficient funds. ${formatCurrency(cost)} required to upgrade.`);
          return;
        }

        // Find hubs (preserve original shape: array or keyed object)
        const rawHubs = Array.isArray(company.hubs)
          ? company.hubs
          : company.hubs && typeof company.hubs === 'object'
          ? Object.values(company.hubs)
          : [];

        const updatedHubs = rawHubs.map((h: any) => {
          if (String(h.id) !== String(hub.id)) return h;
          // perform level bump
          return {
            ...h,
            level: Math.max(1, Math.round(nextLevel)),
            // ensure unlockedFacilities exists so other code can reference it
            unlockedFacilities: Array.isArray(h.unlockedFacilities) ? h.unlockedFacilities : [],
          };
        });

        const updatedCompany = {
          ...company,
          capital: (company.capital ?? 0) - cost,
          hubs: Array.isArray(company.hubs)
            ? updatedHubs
            : // convert back to keyed object if original was keyed
              updatedHubs.reduce((acc: any, h: any) => {
                acc[h.id] = h;
                return acc;
              }, {}),
        };

        // Persist change via context updater
        createCompany(updatedCompany);
        setMessage('Upgrade successful.');
      }

      setConfirmingUpgrade(false);
      // Close after a short delay to show success
      setTimeout(() => {
        setVisible(false);
        onClose?.();
      }, 400);
    } catch (err: any) {
      setMessage(String(err?.message ?? 'Upgrade failed'));
    } finally {
      setProcessing(false);
    }
  }

  /**
   * performDowngradeFallback
   * @description If parent did not provide onDowngrade, safely mutate company state:
   * - Reduce hub.level by 1 (to prevLevel)
   * - Add refund (50% of current level upgrade cost) to company.capital
   * - Keep facilities present, but mark them blocked from being upgraded until
   *   hub reaches the previously held level. This is done by setting
   *   `facilitiesLockedUntil` on the hub to the previous level.
   *
   * This keeps facilities available for use but prevents further upgrades until
   * the hub has been re-upgraded to the original level.
   */
  function performDowngradeFallback() {
    if (!hub) return;
    const company = gameState.company;
    if (!company) {
      setMessage('No company context available.');
      return;
    }

    // Find hub in company.hubs (fallback: company.hubs may be an object or array)
    const hubs = Array.isArray(company.hubs) ? company.hubs : company.hubs ? Object.values(company.hubs) as any[] : [];

    const updatedHubs = hubs.map((h: any) => {
      if (String(h.id) !== String(hub.id)) return h;
      const previousLevel = currentLevel;
      const newLevel = Math.max(1, previousLevel - 1);

      // Copy hub and update level
      const updated = {
        ...h,
        level: newLevel,
        // Keep facilities present but block further facility *upgrades*
        // until hub reaches the previously-held level again.
        facilitiesLockedUntil: Math.max(previousLevel, newLevel)
      };

      return updated;
    });

    // build updatedCompany: preserve structure, but attempt to set hubs in same shape
    const updatedCompany = {
      ...company,
      // credit refund to company capital
      capital: (company.capital ?? 0) + downgradeRefund,
      // If company.hubs was array, set it; otherwise keep object keyed by id if possible
      hubs: Array.isArray(company.hubs)
        ? updatedHubs
        : // convert back to keyed object based on id if original was object-like
          updatedHubs.reduce((acc: any, h: any) => {
            acc[h.id] = h;
            return acc;
          }, {})
    };

    // Persist via context updater
    try {
      createCompany(updatedCompany);
      setMessage(`Downgraded to level ${Math.max(1, currentLevel - 1)}. Refund ${formatCurrency(downgradeRefund)} applied.`);
    } catch (err: any) {
      setMessage(String(err?.message ?? 'Downgrade failed (fallback).'));
    }
  }

  /**
   * handleDowngradeConfirm
   * @description Trigger downgrade flow, prefer parent onDowngrade handler.
   */
  async function handleDowngradeConfirm() {
    if (!hub) return;
    setProcessing(true);
    setMessage(null);
    try {
      if (onDowngrade) {
        await Promise.resolve(onDowngrade(hub.id));
        setMessage('Downgrade completed — refund applied.');
      } else {
        // fallback behaviour performed here
        performDowngradeFallback();
      }

      setConfirmingDowngrade(false);
      // keep modal open briefly to show message then close
      setTimeout(() => {
        setVisible(false);
        onClose?.();
      }, 500);
    } catch (err: any) {
      setMessage(String(err?.message ?? 'Downgrade failed'));
    } finally {
      setProcessing(false);
    }
  }

  if (!visible || !hub) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={() => { setConfirmingDowngrade(false); setConfirmingUpgrade(false); onClose?.(); }} />
      <div className="relative max-w-2xl w-full bg-slate-800 rounded-xl border border-slate-700 p-6 z-10">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Hub Details</h2>
            <div className="text-sm text-slate-400">{hub.name ?? hub.title ?? `Hub ${hub.id ?? ''}`}</div>
          </div>

          <button
            aria-label="Close hub details"
            onClick={() => { setConfirmingDowngrade(false); setConfirmingUpgrade(false); onClose?.(); }}
            className="text-slate-400 hover:text-white p-1 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-slate-400">Level</div>
            <div className="text-lg font-bold text-white">Level {currentLevel}</div>

            <div className="mt-3 text-sm text-slate-400">Capacity</div>
            <div className="text-white">
              {getHubLevel(currentLevel).vehicleLimit} vehicles • {getHubLevel(currentLevel).officeSpots} office spots
            </div>

            {hub.description && (
              <div className="mt-3">
                <div className="text-sm text-slate-400">Description</div>
                <div className="text-slate-200 text-sm mt-1">{hub.description}</div>
              </div>
            )}
          </div>

          <div>
            <div className="text-sm text-slate-400">Upgrade to Level {nextLevel}</div>
            <div className="text-2xl font-bold text-rose-400 mt-1">
              {upgradeCost !== null ? formatCurrency(upgradeCost) : '—'}
            </div>

            <div className="mt-3 text-sm text-slate-400">What you get</div>
            <ul className="list-disc ml-5 mt-2 text-slate-300 text-sm">
              {nextLevelInfo?.unlocks && nextLevelInfo.unlocks.length > 0 ? (
                nextLevelInfo.unlocks.map((f: string) => <li key={f}>{f}</li>)
              ) : (
                <li>No new facilities</li>
              )}
            </ul>

            <div className="mt-6">
              {!confirmingDowngrade && !confirmingUpgrade ? (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setConfirmingUpgrade(true)}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Upgrade
                  </button>

                  {currentLevel > 1 && (
                    <button
                      onClick={() => setConfirmingDowngrade(true)}
                      className="bg-yellow-600 hover:bg-yellow-700 text-black px-4 py-2 rounded-md text-sm font-medium"
                      title="Downgrade hub (refund 50%)"
                    >
                      Downgrade
                    </button>
                  )}

                  <button
                    onClick={() => { setConfirmingDowngrade(false); setConfirmingUpgrade(false); onClose?.(); }}
                    className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-md text-sm"
                  >
                    Close
                  </button>
                </div>
              ) : confirmingUpgrade ? (
                <div className="bg-slate-700 rounded-md p-4 border border-slate-600">
                  <div className="text-sm text-slate-300 mb-3">
                    Are you sure you want to upgrade this hub to level {nextLevel}?
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handleUpgradeConfirm}
                      disabled={processing}
                      className={`bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-md text-sm font-medium ${processing ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      {processing ? 'Upgrading…' : 'Confirm Upgrade'}
                    </button>

                    <button
                      onClick={() => setConfirmingUpgrade(false)}
                      className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-md text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // confirmingDowngrade
                <div className="bg-slate-700 rounded-md p-4 border border-slate-600">
                  <div className="text-sm text-slate-300 mb-3">
                    You are about to downgrade this hub from level {currentLevel} to level {prevLevel}.
                  </div>

                  <div className="text-sm text-slate-400 mb-4">
                    Refund: <span className="text-white font-medium">{formatCurrency(downgradeRefund)}</span> (50% of Level {currentLevel} upgrade cost)
                  </div>

                  <div className="text-xs text-slate-400 mb-2">
                    Facilities will remain available after the downgrade, but further facility
                    upgrades will be blocked until the hub reaches level {currentLevel} again.
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handleDowngradeConfirm}
                      disabled={processing}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                    >
                      {processing ? 'Processing…' : 'Confirm Downgrade'}
                    </button>

                    <button
                      onClick={() => setConfirmingDowngrade(false)}
                      className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-md text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {message && <div className="mt-4 text-sm text-slate-200">{message}</div>}
      </div>
    </div>
  );
};

export default HubDetailsModal;