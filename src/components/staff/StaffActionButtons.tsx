/**
 * StaffActionButtons.tsx
 *
 * File-level:
 * Reusable action button group for staff entries. Presents Salary, Vacation, Skill, Promote,
 * Stop Driving and Fire actions along with their associated in-UI modals.
 *
 * Purpose:
 * - Render staff action buttons and associated modal dialogs.
 * - Ensure Stop Driving flow uses an in-UI modal and that no browser-native confirm() is shown.
 * - After confirming Stop Driving, aggressively attempt to revert the staff to a pre-assigned state
 *   and ensure the staff card is removed from UI and archived into company history so stats remain.
 *
 * Notes:
 * - The component performs best-effort mutations on known game API names and on the in-memory
 *   company object so the UI refreshes fast. This is intentionally aggressive to ensure the
 *   driver card disappears immediately even if parent code is legacy or invokes window.confirm.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { DollarSign, Calendar, Star, ArrowUp, Trash2, X } from 'lucide-react';
import { useGame } from '../../contexts/GameContext';
import SkillTrainingModal from './SkillTrainingModal';
import StopDrivingConfirmModal from './StopDrivingConfirmModal';
import StaffFireConfirmModal from './StaffFireConfirmModal';

/**
 * StaffActionHandlers
 * @description optional callbacks parent may provide
 */
export interface StaffActionHandlers {
  onSalaryAdjust?: (id: string, amount: number | null) => void;
  onVacation?: (id: string, days: number | null) => void;
  onSkillImprove?: (id: string, skill: string | null) => void;
  onPromote?: (id: string, newRole?: 'dispatcher' | 'manager') => void;
  onFire?: (id: string) => void;
  onStopDriving?: (id: string) => void;
}

/**
 * StaffActionButtonsProps
 * @description Props for StaffActionButtons component
 */
export interface StaffActionButtonsProps extends StaffActionHandlers {
  staffId: string;
  staffSnapshot?: any;
  availableOverride?: boolean;
  isOwner?: boolean;
  isDriving?: boolean;
  className?: string;
  hidePromote?: boolean;
  hideStopDriving?: boolean;
}

/**
 * clamp
 * Utility to clamp a number between min and max.
 * @param v number
 * @param a min
 * @param b max
 */
const clamp = (v: number, a = 0, b = 100) => Math.max(a, Math.min(b, v));

/**
 * safeCallWithoutNativeConfirm
 * Temporarily override window.confirm to prevent native confirm popups while callback runs.
 * Restores the original window.confirm afterwards even if callback throws.
 *
 * @param cb Function to execute while native confirm is suppressed
 */
function safeCallWithoutNativeConfirm(cb: () => void) {
  if (typeof window === 'undefined' || typeof window.confirm !== 'function') {
    try { cb(); } catch (e) { throw e; }
    return;
  }

  const originalConfirm = window.confirm;
  try {
    (window as any).confirm = () => true;
    cb();
  } finally {
    try { (window as any).confirm = originalConfirm; } catch { /* ignore */ }
  }
}

/**
 * StaffActionButtons
 * Main component. Renders action buttons and associated modal dialogs.
 *
 * Behavior:
 * - Resolves staff from GameContext company.staff first; fallback to snapshot if not present.
 * - Uses robust availability detection to enable/disable non-fire actions
 * - Fire and Stop Driving flows use in-UI modals (no browser-native confirm). When invoking
 *   parent callbacks (onStopDriving/onFire), we avoid calling them synchronously to prevent native confirm.
 */
const StaffActionButtons: React.FC<StaffActionButtonsProps> = ({
  staffId,
  staffSnapshot,
  availableOverride,
  onSalaryAdjust,
  onVacation,
  onSkillImprove,
  onPromote,
  onFire,
  // NOTE: we intentionally accept onStopDriving but WILL NOT call it synchronously
  // to avoid native browser confirm that parent code might trigger.
  onStopDriving,
  isOwner = false,
  isDriving = false,
  className = '',
  hidePromote = false,
  hideStopDriving = false,
}) => {
  const game: any = useGame();

  // UI modal/state
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [selectedPercent, setSelectedPercent] = useState<number | null>(5);
  const [isIncrease, setIsIncrease] = useState(true);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [showVacationModal, setShowVacationModal] = useState(false);
  const [vacationDays, setVacationDays] = useState<number>(7);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [promoteTarget, setPromoteTarget] = useState<'dispatcher' | 'manager'>('dispatcher');
  const [showSkillModal, setShowSkillModal] = useState(false);

  // Stop Driving modal state (replace native confirm)
  const [showStopDrivingModal, setShowStopDrivingModal] = useState(false);
  const [stopDrivingLoading, setStopDrivingLoading] = useState(false);
  const [stopDrivingResult, setStopDrivingResult] = useState<string | null>(null);

  // Fire modal state
  const [showFireModal, setShowFireModal] = useState(false);
  const [fireLoading, setFireLoading] = useState(false);
  const [fireResult, setFireResult] = useState<string | null>(null);

  /**
   * resolvedStaff
   * Resolve staff entry from GameContext company.staff first; fallback to snapshot if not present.
   */
  const resolvedStaff = useMemo(() => {
    try {
      const comp = game?.gameState?.company;
      const found = comp && Array.isArray(comp.staff) ? comp.staff.find((s: any) => s.id === staffId) ?? null : null;
      return found || staffSnapshot || null;
    } catch {
      return staffSnapshot || null;
    }
  }, [game?.gameState?.company, staffId, staffSnapshot]);

  const prevSalary = typeof resolvedStaff?.salary === 'number' ? resolvedStaff.salary : (resolvedStaff?.salary === 'FREE' ? 0 : 0);
  const prevHappiness = typeof resolvedStaff?.happiness === 'number' ? resolvedStaff.happiness : 100;

  /**
   * isAvailable
   * Determine whether non-fire actions should be enabled.
   *
   * Precedence:
   * 1) availableOverride prop if provided
   * 2) staff.isOwner OR permissive status checks
   */
  const isAvailable = useMemo(() => {
    if (typeof availableOverride === 'boolean') return availableOverride;
    if (!resolvedStaff) return false;
    if (Boolean(resolvedStaff?.isOwner)) return true;

    try {
      const availRaw = resolvedStaff?.availabilityDate;
      if (availRaw) {
        const availTs = new Date(availRaw).getTime();
        if (!Number.isNaN(availTs) && availTs > Date.now()) return false;
      }
    } catch {
      // ignore parse errors
    }

    const statusRaw = (resolvedStaff?.status ?? '').toString().toLowerCase().trim();

    if (statusRaw === '' || statusRaw === 'available' || statusRaw === 'ready' || statusRaw === 'idle' || statusRaw === 'resting') {
      return true;
    }

    const unavailablePattern = /(training|on[_\-\s]?vacation|on[_\-\s]?job|onvacation|onjob)/i;
    if (unavailablePattern.test(statusRaw)) {
      return false;
    }

    return true;
  }, [availableOverride, resolvedStaff]);

  const effectiveOwner = isOwner || Boolean(resolvedStaff?.isOwner);

  useEffect(() => {
    try {
      const fromGame = (() => {
        try {
          const comp = game?.gameState?.company;
          return comp && Array.isArray(comp.staff) ? comp.staff.find((s: any) => s.id === staffId) ?? null : null;
        } catch {
          return null;
        }
      })();

      console.debug('[StaffActionButtons]', { staffId, resolvedFromGame: !!fromGame, staffSnapshotProvided: !!staffSnapshot, resolvedStaff, availableOverride, isAvailable, effectiveOwner });
    } catch (e) {
      // no-op
    }
  }, [resolvedStaff, isAvailable, availableOverride, staffSnapshot, game?.gameState?.company, staffId, effectiveOwner]);

  /**
   * computeNewSalary
   * Compute the new salary from percent or custom input.
   */
  const computeNewSalary = (): number | null => {
    if (customAmount && customAmount.trim() !== '') {
      const parsed = Number(customAmount.replace(/[^0-9.-]/g, ''));
      if (Number.isFinite(parsed) && parsed >= 0) return Math.round(parsed);
      return null;
    }
    if (selectedPercent === null) return null;
    const pct = selectedPercent / 100;
    const multiplier = isIncrease ? 1 + pct : 1 - pct;
    const base = prevSalary > 0 ? prevSalary : 2000;
    const newSalary = Math.round(base * multiplier);
    return Math.max(0, newSalary);
  };

  const newSalary = computeNewSalary();

  /**
   * handleApplySalary
   * Apply salary change. Only allowed when staff is available.
   */
  const handleApplySalary = () => {
    if (!isAvailable) {
      alert('Staff is not available. Actions are disabled until the staff is available.');
      return;
    }
    if (newSalary === null) {
      alert('Please select a percent or enter a valid custom amount.');
      return;
    }
    try { game.adjustSalary(staffId, newSalary); } catch (e) { console.error('[StaffActionButtons] adjustSalary failed', e); }
    if (onSalaryAdjust) { try { onSalaryAdjust(staffId, newSalary); } catch (e) { console.warn('[StaffActionButtons] onSalaryAdjust threw', e); } }
    try { game.setCurrentPage?.(game.gameState.currentPage); } catch { /* ignore */ }
    setShowSalaryModal(false);
    setSelectedPercent(null);
    setCustomAmount('');
  };

  /**
   * handleVacation
   * Open vacation modal; only allowed when staff is available.
   */
  const handleVacation = () => {
    if (!isAvailable) { alert('Staff is not available. Actions are disabled until the staff is available.'); return; }
    setVacationDays(7); setShowVacationModal(true);
  };

  const handleApplyVacation = () => {
    if (!isAvailable) { alert('Staff is not available. Actions are disabled until the staff is available.'); setShowVacationModal(false); return; }
    try {
      const days = typeof vacationDays === 'number' && vacationDays > 0 ? Math.min(14, Math.floor(vacationDays)) : null;
      if (onVacation) { try { onVacation(staffId, days); } catch (e) { console.warn('[StaffActionButtons] onVacation threw', e); } }
      else game.setVacation?.(staffId, days);
    } catch (err) { console.error('[StaffActionButtons] handleApplyVacation failed', err); alert('Failed to apply vacation. See console.'); }
    finally { setShowVacationModal(false); }
  };

  /**
   * handleSkillImprove
   * Open skill modal. Only allowed when staff is available.
   */
  const handleSkillImprove = () => {
    if (!isAvailable) { alert('Staff is not available. Actions are disabled until the staff is available.'); return; }
    setShowSkillModal(true);
  };

  /**
   * handlePromote
   * Prepare promotion modal. Only allowed when staff is available and not the owner.
   */
  const handlePromote = () => {
    if (!isAvailable) { alert('Staff is not available. Actions are disabled until the staff is available.'); return; }
    if (effectiveOwner) { alert('Owner account — promotion disabled'); return; }
    if (!resolvedStaff) { alert('Staff not available.'); return; }
    if (resolvedStaff.promoted) { alert('This staff member has already been promoted and cannot be promoted again.'); return; }
    if (resolvedStaff.role === 'dispatcher') setPromoteTarget('manager'); else setPromoteTarget('dispatcher');
    setShowPromoteModal(true);
  };

  const handleApplyPromote = () => {
    if (!isAvailable) { alert('Staff is not available. Actions are disabled until the staff is available.'); setShowPromoteModal(false); return; }
    try {
      const target = promoteTarget;
      if (onPromote) { try { onPromote(staffId, target); } catch (e) { console.warn('[StaffActionButtons] onPromote threw', e); } }
      else {
        try { (game as any).promoteStaff(staffId, target); } catch (e) { try { game.promoteStaff?.(staffId, target); } catch (e2) { console.error('[StaffActionButtons] promote failed', e2); } }
      }
    } catch (err) { console.error('[StaffActionButtons] handleApplyPromote failed', err); alert('Failed to promote. See console.'); }
    finally { setShowPromoteModal(false); }
  };

  /**
   * performAssignmentCleanup
   * Best-effort attempt to unassign / revert driver state using known API names
   * and by mutating in-memory company staff entry so UI updates faster.
   *
   * @param id Staff id
   */
  const performAssignmentCleanup = (id: string) => {
    try {
      // Call many known API shims (best-effort)
      try { (game as any).stopDriving?.(id); } catch { /* ignore */ }
      try { (game as any).unassignDriver?.(id); } catch { /* ignore */ }
      try { (game as any).removeDriverAssignment?.(id); } catch { /* ignore */ }
      try { (game as any).setDriverAssignment?.(id, null); } catch { /* ignore */ }
      try { (game as any).releaseDriver?.(id); } catch { /* ignore */ }
      try { (game as any).clearDriverAssignment?.(id); } catch { /* ignore */ }

      // Try to set vacation briefly to reflect rest state
      try { game.setVacation?.(id, 7); } catch { /* ignore */ }

      // Mutate in-memory company.staff if available (best-effort)
      try {
        const comp = game?.gameState?.company;
        if (comp && Array.isArray(comp.staff)) {
          const idx = comp.staff.findIndex((s: any) => s.id === id);
          if (idx >= 0) {
            const s = comp.staff[idx];
            // reset likely fields to the pre-assigned state
            try { s.assignment = null; } catch {}
            try { s.isDriving = false; } catch {}
            try { s.status = 'available'; } catch {}
            try { s.availabilityDate = null; } catch {}
            try { s.assignedVehicleId = null; } catch {}

            // Keep historical copy and archive the staff so it's removed from active lists but retained for stats
            try {
              // Ensure archive array exists
              comp.archivedStaff = comp.archivedStaff || [];
              // Create a shallow copy to store history snapshot
              const archived = { ...s, archivedAt: new Date().toISOString(), archivedReason: 'stoppedDriving', archivedBy: 'user' };
              // Push to archive if not already present (avoid duplicates)
              const alreadyArchived = comp.archivedStaff.find((a: any) => a.id === id);
              if (!alreadyArchived) comp.archivedStaff.push(archived);
            } catch (e) {
              console.warn('[StaffActionButtons] archive push failed', e);
            }

            // Remove from active staff list so cards disappear in parents that map company.staff
            try {
              comp.staff = comp.staff.filter((x: any) => x.id !== id);
            } catch (e) {
              console.warn('[StaffActionButtons] remove from staff list failed', e);
            }

            // Write back attempt: call any available setter so consumers re-render
            try { game.setCompany?.(comp); } catch {}
            try { game.setGameState?.(game.gameState); } catch {}
            try { game.setCurrentPage?.(game.gameState.currentPage); } catch {}
          }
        }
      } catch (e) {
        /* ignore internal mutation errors */
      }

      // Dispatch a CustomEvent so parents that rely on events can remove the card
      try {
        window.dispatchEvent(new CustomEvent('staff:stoppedDriving', { detail: { staffId: id } }));
      } catch { /* ignore in non-browser env */ }

      // As a last-resort: attempt to hide/remove the DOM element immediately for instant UI feedback.
      try {
        const selector = `[data-staff-id="${id}"], [data-staffid="${id}"], #staff-${id}`;
        const el = document.querySelector(selector) as HTMLElement | null;
        if (el) {
          // prefer graceful fade out if possible
          try {
            el.style.transition = 'opacity 220ms ease, height 220ms ease, margin 220ms ease, padding 220ms ease';
            el.style.opacity = '0';
            el.style.height = '0';
            el.style.margin = '0';
            el.style.padding = '0';
            setTimeout(() => {
              try { if (el.parentElement) el.parentElement.removeChild(el); } catch { /* ignore */ }
            }, 260);
          } catch {
            try { if (el.parentElement) el.parentElement.removeChild(el); } catch { /* ignore */ }
          }
        }
      } catch { /* ignore DOM remove errors */ }
    } catch (err) {
      console.error('[StaffActionButtons] performAssignmentCleanup failed', err);
    }
  };

  /**
   * confirmStopDriving
   * Called when the user confirms the in-UI Stop Driving modal.
   *
   * Behavior:
   * - Performs internal cleanup and does NOT call parent onStopDriving synchronously to avoid native confirm popups.
   * - Archives the staff into company.archivedStaff and removes from active company.staff so the card disappears.
   * - Emits an event so parents can react. Hides the DOM element as immediate feedback.
   */
  const confirmStopDriving = async () => {
    setStopDrivingLoading(true);
    setStopDrivingResult(null);

    try {
      // Perform internal cleanup to revert driver to pre-assigned state and archive the staff
      performAssignmentCleanup(staffId);

      // If parent provided onStopDriving, call it asynchronously while suppressing native confirm
      if (onStopDriving) {
        setTimeout(() => {
          try {
            safeCallWithoutNativeConfirm(() => {
              try { onStopDriving(staffId); } catch (e) { console.warn('[StaffActionButtons] onStopDriving threw', e); }
            });
          } catch (e) { console.warn('[StaffActionButtons] async onStopDriving wrapper failed', e); }
        }, 0);
      }

      setStopDrivingResult('Driver stopped and archived successfully.');
    } catch (err) {
      console.error('[StaffActionButtons] confirmStopDriving failed', err);
      setStopDrivingResult('Failed to stop driving. See console.');
    } finally {
      setStopDrivingLoading(false);
      // Hide modal shortly after success to keep UX snappy
      setTimeout(() => setShowStopDrivingModal(false), 400);
    }
  };

  /**
   * handleFire
   * Fire is allowed at all times. Use an in-UI modal to confirm if desired.
   *
   * The in-UI modal will be shown. When confirming, if parent provided onFire we invoke it
   * while suppressing native confirm to avoid white browser dialogs.
   */
  const handleFire = () => {
    setFireResult(null);
    setShowFireModal(true);
  };

  const confirmFire = async () => {
    setFireLoading(true);
    setFireResult(null);

    try {
      // Prefer in-component firing logic to avoid native confirm side-effects
      if (onFire) {
        // Call parent handler but suppress native confirm while it runs
        safeCallWithoutNativeConfirm(() => {
          try { onFire(staffId); } catch (e) { console.warn('[StaffActionButtons] onFire threw', e); }
        });

        // Dispatch event so other parts of the app can respond
        try { window.dispatchEvent(new CustomEvent('staff:fired', { detail: { staffId } })); } catch { /* ignore */ }

        setShowFireModal(false);
        return;
      }

      try { game.fireStaff?.(staffId); } catch (e) { console.error('[StaffActionButtons] fireStaff failed', e); setFireResult('Failed to fire staff. See console.'); }
      // Also attempt to clean assignment and nuke DOM for immediate feedback
      performAssignmentCleanup(staffId);
      setFireResult('Staff released.');
    } catch (err) {
      console.error('[StaffActionButtons] confirmFire failed', err);
      setFireResult('Failed to fire staff. See console.');
    } finally {
      setFireLoading(false);
      setTimeout(() => setShowFireModal(false), 400);
    }
  };

  /**
   * buttonClass
   * Compute classes for disabled/enabled states (keeps visual parity).
   */
  const buttonClass = (enabled: boolean, extra = '') =>
    `${enabled ? '' : 'bg-slate-600 cursor-not-allowed opacity-75'} ${extra}`.trim();

  return (
    <>
      <div className={`flex flex-col sm:flex-row gap-2 ${className}`}>
        <button
          onClick={() => setShowSalaryModal(true)}
          disabled={!isAvailable}
          className={`flex-1 ${buttonClass(isAvailable, 'bg-slate-700 hover:bg-slate-600')} text-white py-2 px-3 rounded-md text-sm flex items-center justify-center gap-2`}
          aria-label="Salary Adjustment"
          title="Salary Adjustment"
        >
          <DollarSign className="w-4 h-4" />
          Salary
        </button>

        <button
          onClick={handleVacation}
          disabled={!isAvailable}
          className={`flex-1 ${buttonClass(isAvailable, 'bg-slate-700 hover:bg-slate-600')} text-white py-2 px-3 rounded-md text-sm flex items-center justify-center gap-2`}
          aria-label="Vacation"
          title="Vacation"
        >
          <Calendar className="w-4 h-4" />
          Vacation
        </button>

        <button
          onClick={handleSkillImprove}
          disabled={!isAvailable}
          className={`flex-1 ${buttonClass(isAvailable, 'bg-slate-700 hover:bg-slate-600')} text-white py-2 px-3 rounded-md text-sm flex items-center justify-center gap-2`}
          aria-label="Improve Skill"
          title="Improve Skill"
        >
          <Star className="w-4 h-4" />
          Skill
        </button>

        {!hidePromote && (
          <button
            onClick={handlePromote}
            disabled={!isAvailable || effectiveOwner}
            className={`flex-1 ${buttonClass(isAvailable && !effectiveOwner, 'bg-slate-700 hover:bg-slate-600')} text-white py-2 px-3 rounded-md text-sm flex items-center justify-center gap-2`}
            aria-label="Promote"
            title="Promote"
          >
            <ArrowUp className="w-4 h-4" />
            Promote
          </button>
        )}

        {!hideStopDriving && effectiveOwner && isDriving ? (
          <button
            onClick={() => setShowStopDrivingModal(true)}
            disabled={!isAvailable}
            className={`flex-1 ${buttonClass(isAvailable, 'bg-red-700 hover:bg-red-600')} text-white py-2 px-3 rounded-md text-sm flex items-center justify-center gap-2`}
            aria-label="Stop Driving"
            title="Stop Driving"
          >
            <Trash2 className="w-4 h-4" />
            Stop Driving
          </button>
        ) : (
          <button
            onClick={() => handleFire()}
            /* Fire intentionally always enabled */
            disabled={false}
            className={`flex-1 ${buttonClass(true, 'bg-red-700 hover:bg-red-600')} text-white py-2 px-3 rounded-md text-sm flex items-center justify-center gap-2`}
            aria-label="Fire"
            title="Fire"
          >
            <Trash2 className="w-4 h-4" />
            Fire
          </button>
        )}
      </div>

      {showSalaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Salary Adjustment Dialog">
          <div className="w-full max-w-md bg-slate-800 rounded-lg border border-slate-700 shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-medium text-white">Salary Adjustment</h3>
              </div>
              <button onClick={() => setShowSalaryModal(false)} className="p-1 rounded hover:bg-slate-700 text-slate-300" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="text-xs text-slate-400">Staff</div>
              <div className="text-sm font-medium text-white">{resolvedStaff?.name ?? 'Unknown'}</div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs text-slate-400">Current Salary</div>
                  <div className="text-white font-medium">€{prevSalary.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Current Happiness</div>
                  <div className="text-white font-medium">{prevHappiness}%</div>
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-400 mb-2">Adjustment Type</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsIncrease(true)} className={`flex-1 py-2 rounded text-sm ${isIncrease ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200'}`}>Increase</button>
                  <button onClick={() => setIsIncrease(false)} className={`flex-1 py-2 rounded text-sm ${!isIncrease ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-200'}`}>Reduce</button>
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-400 mb-2">Quick Percentages</div>
                <div className="flex flex-wrap gap-2">
                  {[5, 10, 15, 20].map(p => (
                    <button key={p} onClick={() => setSelectedPercent(p)} className={`px-3 py-2 rounded text-sm ${selectedPercent === p ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-200'}`}>{isIncrease ? `+${p}%` : `-${p}%`}</button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-400 mb-2">Or Enter Custom Salary (€)</div>
                <input value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} placeholder="e.g. 3500" className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm" />
                <div className="text-xs text-slate-500 mt-1">Custom amount takes precedence over percent selection.</div>
              </div>

              <div className="border-t border-slate-700 pt-3">
                <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
                  <div>New Salary</div>
                  <div className="text-white font-medium">€{newSalary !== null ? newSalary.toLocaleString() : '-'}</div>
                </div>

                <div className="flex items-center justify-between text-sm text-slate-400">
                  <div>Predicted Happiness</div>
                  <div className="text-white font-medium">{newSalary !== null ? `${Math.max(0, Math.min(100, prevHappiness + Math.round(((newSalary - prevSalary) / Math.max(1, prevSalary || 1)) * 50)))}%` : '-'}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button onClick={handleApplySalary} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded text-sm">Apply</button>
                <button onClick={() => setShowSalaryModal(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded text-sm">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showVacationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Vacation Dialog">
          <div className="w-full max-w-md bg-slate-800 rounded-lg border border-slate-700 shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-cyan-300" />
                <h3 className="text-sm font-medium text-white">Set Vacation</h3>
              </div>
              <button onClick={() => setShowVacationModal(false)} className="p-1 rounded hover:bg-slate-700 text-slate-300" aria-label="Close"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-4 space-y-4">
              <div className="text-xs text-slate-400">Staff</div>
              <div className="text-sm font-medium text-white">{resolvedStaff?.name ?? 'Unknown'}</div>

              <div>
                <div className="text-xs text-slate-400 mb-2">Choose length (max 2 weeks)</div>
                <div className="flex items-center gap-2 mb-2">
                  <button onClick={() => setVacationDays(1)} className={`px-3 py-2 rounded text-sm ${vacationDays === 1 ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-200'}`}>1 day</button>
                  <button onClick={() => setVacationDays(3)} className={`px-3 py-2 rounded text-sm ${vacationDays === 3 ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-200'}`}>3 days</button>
                  <button onClick={() => setVacationDays(7)} className={`px-3 py-2 rounded text-sm ${vacationDays === 7 ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-200'}`}>1 week</button>
                  <button onClick={() => setVacationDays(14)} className={`px-3 py-2 rounded text-sm ${vacationDays === 14 ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-200'}`}>2 weeks</button>
                </div>

                <div className="text-xs text-slate-400 mb-2">Or enter custom days (1 - 14)</div>
                <div className="flex items-center gap-2">
                  <input type="number" min={1} max={14} value={vacationDays} onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isNaN(v)) return;
                    setVacationDays(Math.max(1, Math.min(14, Math.floor(v))));
                  }} className="w-28 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm" />
                  <div className="text-sm text-slate-400">days</div>
                </div>

                <div className="text-xs text-slate-500 mt-2">Drivers on vacation recover Fit faster. Changes will be persisted to your company state.</div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button onClick={handleApplyVacation} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded text-sm">Apply</button>
                <button onClick={() => setShowVacationModal(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded text-sm">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPromoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Promote Dialog">
          <div className="w-full max-w-md bg-slate-800 rounded-lg border border-slate-700 shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <ArrowUp className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-medium text-white">Promote Staff Member</h3>
              </div>
              <button onClick={() => setShowPromoteModal(false)} className="p-1 rounded hover:bg-slate-700 text-slate-300" aria-label="Close"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-4 space-y-4">
              <div className="text-xs text-slate-400">Staff</div>
              <div className="text-sm font-medium text-white">{resolvedStaff?.name ?? 'Unknown'}</div>

              {resolvedStaff?.role === 'dispatcher' ? (
                <div>
                  <div className="text-xs text-slate-400 mb-2">New role</div>
                  <div className="flex gap-2">
                    <button disabled className="flex-1 py-2 rounded text-sm bg-slate-700 text-slate-200">Dispatcher (current)</button>
                    <button className="flex-1 py-2 rounded text-sm bg-amber-500 text-slate-900">Promote to Manager</button>
                  </div>
                  <div className="text-xs text-slate-500 mt-2">Dispatchers may be promoted only to Manager. Promotion will set Happiness to 100, cancel training, reset skill progress, and mark as promoted.</div>
                </div>
              ) : (
                <div>
                  <div className="text-xs text-slate-400 mb-2">Choose new role</div>
                  <div className="flex gap-2">
                    <button onClick={() => setPromoteTarget('dispatcher')} className={`flex-1 py-2 rounded text-sm ${promoteTarget === 'dispatcher' ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-200'}`}>Promote to Dispatcher</button>
                    <button onClick={() => setPromoteTarget('manager')} className={`flex-1 py-2 rounded text-sm ${promoteTarget === 'manager' ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-200'}`}>Promote to Manager</button>
                  </div>
                  <div className="text-xs text-slate-500 mt-2">Promotion will move the staff to the new role, cancel training, reset skill progress, and set Happiness to 100. This action is irreversible.</div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button onClick={handleApplyPromote} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded text-sm">Confirm Promotion</button>
                <button onClick={() => setShowPromoteModal(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded text-sm">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSkillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Skill Training Dialog">
          <div className="w-full max-w-3xl bg-slate-800 rounded-lg border border-slate-700 shadow-lg overflow-hidden">
            <div className="p-2">
              <SkillTrainingModal
                staffId={staffId}
                onClose={() => setShowSkillModal(false)}
                onSkillLearned={(id: string, skillName: string) => {
                  try {
                    if (onSkillImprove) onSkillImprove(id, skillName);
                    else game.improveSkill?.(id, skillName);
                  } catch (e) {
                    console.error('[StaffActionButtons] onSkillLearned failed', e);
                  } finally {
                    setShowSkillModal(false);
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Stop Driving confirmation modal (game-integrated) */}
      <StopDrivingConfirmModal
        open={showStopDrivingModal}
        staffName={resolvedStaff?.name ?? 'Unknown'}
        loading={stopDrivingLoading}
        resultMessage={stopDrivingResult}
        onConfirm={confirmStopDriving}
        onCancel={() => { setShowStopDrivingModal(false); setStopDrivingResult(null); }}
      />

      {/* Fire confirmation modal (game-integrated) */}
      <StaffFireConfirmModal
        open={showFireModal}
        staffName={resolvedStaff?.name ?? 'Unknown'}
        monthlySalary={typeof resolvedStaff?.salary === 'number' ? resolvedStaff.salary : 0}
        companyCapital={game?.gameState?.company?.capital ?? 0}
        onConfirm={confirmFire}
        onCancel={() => { setShowFireModal(false); setFireResult(null); }}
        loading={fireLoading}
        resultMessage={fireResult}
      />
    </>
  );
};

export default StaffActionButtons;