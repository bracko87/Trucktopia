/**
 * StaffActionButtons.tsx
 *
 * File-level:
 * Reusable set of action buttons for staff entries (Salary, Vacation, Skill,
 * Promote, Release, Stop Driving). This file restores and implements a full
 * Promote modal and handler so the Promote button opens a dialog and performs
 * canonical promotion via onPromote or fallback game state mutation.
 *
 * Responsibilities:
 * - Salary modal: set monthly salary (calls onSalaryAdjust or fallback update)
 * - Vacation modal: set availability days (calls onVacation or fallback update)
 * - Skill modal: delegates to SkillTrainingModal
 * - Promote modal: choose new role, validate, call onPromote or fallback
 * - Release opens StaffFireConfirmModal
 * - Stop Driving uses StopDrivingConfirmModal
 *
 * All exported types and functions include JSDoc comments.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { DollarSign, Calendar, Star, ArrowUp, Trash2 } from 'lucide-react';
import { useGame } from '../../contexts/GameContext';
import SkillTrainingModal from './SkillTrainingModal';
import StopDrivingConfirmModal from './StopDrivingConfirmModal';
import StaffFireConfirmModal from './StaffFireConfirmModal';

/**
 * StaffActionHandlers
 * @description Optional callbacks parent may provide for canonical actions.
 */
export interface StaffActionHandlers {
  onSalaryAdjust?: (id: string, amount: number | null) => void;
  onVacation?: (id: string, days: number | null) => void;
  onSkillImprove?: (id: string, skill: string | null) => void;
  onPromote?: (id: string, newRole?: 'dispatcher' | 'manager') => void;
  onFire?: (id: string) => void | Promise<void>;
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
 * StaffActionButtons
 * Main component. Renders action buttons and associated modal dialogs.
 *
 * Behavior notes:
 * - Promote modal: choose between 'dispatcher' and 'manager'. The modal will
 *   ask for confirmation and call canonical onPromote or fallback to game APIs.
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
  onStopDriving,
  isOwner = false,
  isDriving = false,
  className = '',
  hidePromote = false,
  hideStopDriving = false,
}) => {
  const game: any = useGame();

  // Modal and UI state
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [salaryInput, setSalaryInput] = useState<number | ''>('');
  const [salarySaving, setSalarySaving] = useState(false);
  const [salaryError, setSalaryError] = useState<string | null>(null);

  const [showVacationModal, setShowVacationModal] = useState(false);
  const [vacationDays, setVacationDays] = useState<number>(7);
  const [vacationSaving, setVacationSaving] = useState(false);
  const [vacationError, setVacationError] = useState<string | null>(null);

  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [promoteTargetRole, setPromoteTargetRole] = useState<'dispatcher' | 'manager' | ''>('');
  const [promoteLoading, setPromoteLoading] = useState(false);
  const [promoteError, setPromoteError] = useState<string | null>(null);

  const [showSkillModal, setShowSkillModal] = useState(false);
  const [showStopDrivingModal, setShowStopDrivingModal] = useState(false);
  const [stopDrivingLoading, setStopDrivingLoading] = useState(false);
  const [showFireModal, setShowFireModal] = useState(false);
  const [fireLoading, setFireLoading] = useState(false);

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

  const prevSalary = typeof resolvedStaff?.salary === 'number' ? resolvedStaff.salary : 0;

  /**
   * isAvailable
   * Determine whether non-fire actions should be enabled.
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
    } catch { /* ignore parse errors */ }
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
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.debug('[StaffActionButtons] resolved:', { staffId, resolved: !!resolvedStaff, isAvailable, effectiveOwner });
    }
  }, [resolvedStaff, isAvailable, effectiveOwner, staffId]);

  /**
   * confirmFire
   * - Exposed here so Fire confirmation modal can call the canonical removal flow.
   * - Prefer the canonical game.fireStaff if available; fall back to onFire if provided.
   */
  const confirmFire = async (months?: number) => {
    setFireLoading(true);
    try {
      if (game && typeof game.fireStaff === 'function') {
        await Promise.resolve(game.fireStaff(staffId));
      } else if (onFire) {
        await Promise.resolve(onFire(staffId));
      } else {
        try {
          const comp = game?.gameState?.company;
          if (comp && Array.isArray(comp.staff)) {
            comp.staff = comp.staff.filter((s: any) => s.id !== staffId);
            try { game.setCompany?.(comp); } catch {}
            try { game.save?.(); } catch {}
          }
        } catch (e) {
          // ignore
        }
      }
      return true;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[StaffActionButtons] confirmFire error', err);
      throw err;
    } finally {
      setFireLoading(false);
    }
  };

  /**
   * performStopDriving
   * Calls parent or game API to stop driving, with simple optimistic UI removal.
   */
  const performStopDriving = async () => {
    setStopDrivingLoading(true);
    try {
      if (onStopDriving) {
        await Promise.resolve(onStopDriving(staffId));
      } else {
        try { game.stopDriving?.(staffId); } catch {}
      }

      try {
        const comp = game?.gameState?.company;
        if (comp && Array.isArray(comp.staff)) {
          const idx = comp.staff.findIndex((s: any) => s.id === staffId);
          if (idx >= 0) {
            const s = comp.staff[idx];
            comp.archivedStaff = comp.archivedStaff || [];
            if (!comp.archivedStaff.find((a: any) => a.id === s.id)) {
              comp.archivedStaff.push({ ...s, archivedAt: new Date().toISOString(), archivedReason: 'stoppedDriving' });
            }
            comp.staff = comp.staff.filter((x: any) => x.id !== staffId);
            try { game.setCompany?.(comp); } catch {}
          }
        }
      } catch {}

      try { window.dispatchEvent(new CustomEvent('staff:stoppedDriving', { detail: { staffId } })); } catch {}
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[StaffActionButtons] performStopDriving failed', err);
    } finally {
      setStopDrivingLoading(false);
      setShowStopDrivingModal(false);
    }
  };

  /**
   * applySalaryChange
   * @description Apply salary change using onSalaryAdjust if provided or fallback to game state mutation.
   * @param amount number | null
   */
  const applySalaryChange = async (amount: number | null) => {
    setSalarySaving(true);
    setSalaryError(null);
    try {
      if (onSalaryAdjust) {
        await Promise.resolve(onSalaryAdjust(staffId, amount));
      } else {
        // Fallback: update company.staff in game context
        try {
          const comp = game?.gameState?.company;
          if (comp && Array.isArray(comp.staff)) {
            const updated = comp.staff.map((s: any) => (s.id === staffId ? { ...s, salary: amount === null ? 0 : amount } : s));
            const newComp = { ...comp, staff: updated };
            try { game.setCompany?.(newComp); } catch {}
            try { game.save?.(); } catch {}
          } else {
            throw new Error('Company or staff not available in game state');
          }
        } catch (e: any) {
          throw e;
        }
      }
      // Close modal on success
      setShowSalaryModal(false);
      try {
        window.dispatchEvent(new CustomEvent('app:toast', {
          detail: { title: 'Salary Updated', message: `Salary updated for ${resolvedStaff?.name || 'staff'}.`, variant: 'success', ttl: 2500 }
        }));
      } catch {}
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('[StaffActionButtons] applySalaryChange failed', err);
      setSalaryError(err?.message ? String(err.message) : 'Failed to apply salary change.');
    } finally {
      setSalarySaving(false);
    }
  };

  /**
   * applyVacation
   * @description Apply vacation using onVacation if provided, otherwise mutate company.staff and persist.
   * @param days number
   */
  const applyVacation = async (days: number) => {
    setVacationSaving(true);
    setVacationError(null);
    try {
      if (onVacation) {
        await Promise.resolve(onVacation(staffId, days));
      } else {
        // Fallback: update company.staff in game context
        const comp = game?.gameState?.company;
        if (!comp || !Array.isArray(comp.staff)) {
          throw new Error('Company or staff not available in game state');
        }

        const newDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
        const updatedStaff = comp.staff.map((s: any) =>
          s.id === staffId
            ? { ...s, availabilityDate: newDate, status: 'on_vacation', lastVacationAt: new Date().toISOString() }
            : s
        );

        const newComp = { ...comp, staff: updatedStaff };
        try { game.setCompany?.(newComp); } catch {}
        try { game.save?.(); } catch {}
      }

      // Notify listeners (UI toasts / sanitizers)
      try {
        window.dispatchEvent(new CustomEvent('staff:vacation', { detail: { staffId, days } }));
        window.dispatchEvent(new CustomEvent('app:toast', {
          detail: { title: 'Vacation Set', message: `Vacation set for ${resolvedStaff?.name || 'staff'}.`, variant: 'success', ttl: 2500 }
        }));
      } catch {}

      setShowVacationModal(false);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('[StaffActionButtons] applyVacation failed', err);
      setVacationError(err?.message ? String(err.message) : 'Failed to set vacation. Please try again.');
    } finally {
      setVacationSaving(false);
    }
  };

  /**
   * performPromote
   * @description Execute promotion. Uses onPromote if provided; otherwise prefer game.promoteStaff; fallback to safe local mutation.
   * @param target 'dispatcher' | 'manager'
   */
  const performPromote = async (target: 'dispatcher' | 'manager') => {
    setPromoteLoading(true);
    setPromoteError(null);
    try {
      // Prevent promoting owner or to same role
      if (effectiveOwner) {
        throw new Error('Owner cannot be promoted via this action.');
      }
      if (!resolvedStaff) {
        throw new Error('Staff not found in company.');
      }
      if (resolvedStaff.role === target) {
        throw new Error(`Staff is already a ${target}.`);
      }

      // Delegate to parent if provided
      if (onPromote) {
        await Promise.resolve(onPromote(staffId, target));
      } else if (game && typeof game.promoteStaff === 'function') {
        // canonical engine
        await Promise.resolve(game.promoteStaff(staffId, target));
      } else {
        // Fallback: local mutation with sensible side-effects
        const comp = game?.gameState?.company;
        if (!comp || !Array.isArray(comp.staff)) {
          throw new Error('Company or staff not available in game state');
        }

        const updated = comp.staff.map((s: any) => {
          if (s.id !== staffId) return s;
          // reset training/progress fields safely
          const copy = { ...s, role: target };
          // cancel any promoted/training flags that might be present
          copy.training = undefined;
          copy.trainingProgress = undefined;
          // Reset happiness to 100 on promotion
          copy.happiness = 100;
          // Optionally adjust salary (no automatic changes here)
          return copy;
        });

        const newComp = { ...comp, staff: updated };
        try { game.setCompany?.(newComp); } catch {}
        try { game.save?.(); } catch {}
      }

      // Notify listeners and close modal
      try {
        window.dispatchEvent(new CustomEvent('staff:promoted', { detail: { staffId, newRole: target } }));
        window.dispatchEvent(new CustomEvent('app:toast', { detail: { title: 'Promotion', message: `${resolvedStaff?.name || 'Staff'} promoted to ${target}`, variant: 'success', ttl: 3000 } }));
      } catch {}

      setShowPromoteModal(false);
      setPromoteTargetRole('');
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('[StaffActionButtons] performPromote failed', err);
      setPromoteError(err?.message ? String(err.message) : 'Failed to promote staff.');
    } finally {
      setPromoteLoading(false);
    }
  };

  /**
   * UI helper: classes for button disabled/enabled states.
   */
  const buttonClass = (enabled: boolean, extra = '') =>
    `${enabled ? '' : 'bg-slate-600 cursor-not-allowed opacity-75'} ${extra}`.trim();

  /**
   * handleOpenSalaryModal
   * @description Prepare and open salary modal with current salary prefilled
   */
  const handleOpenSalaryModal = () => {
    setSalaryError(null);
    setSalaryInput(typeof prevSalary === 'number' ? prevSalary : '');
    setShowSalaryModal(true);
  };

  /**
   * handleOpenVacationModal
   * @description Prepare and open vacation modal with sensible defaults
   */
  const handleOpenVacationModal = () => {
    setVacationError(null);
    // default to 7 days
    setVacationDays(7);
    setShowVacationModal(true);
  };

  return (
    <>
      <div className={`flex flex-col sm:flex-row gap-2 ${className}`}>
        {/* Salary */}
        <button
          onClick={handleOpenSalaryModal}
          disabled={!isAvailable}
          className={`flex-1 ${buttonClass(isAvailable, 'bg-slate-700 hover:bg-slate-600')} text-white py-2 px-3 rounded-md text-sm flex items-center justify-center gap-2`}
          aria-label="Salary Adjustment"
          title="Salary Adjustment"
        >
          <DollarSign className="w-4 h-4" />
          Salary
        </button>

        {/* Vacation */}
        <button
          onClick={handleOpenVacationModal}
          disabled={!isAvailable}
          className={`flex-1 ${buttonClass(isAvailable, 'bg-slate-700 hover:bg-slate-600')} text-white py-2 px-3 rounded-md text-sm flex items-center justify-center gap-2`}
          aria-label="Vacation"
          title="Vacation"
        >
          <Calendar className="w-4 h-4" />
          Vacation
        </button>

        {/* Skill */}
        <button
          onClick={() => setShowSkillModal(true)}
          disabled={!isAvailable}
          className={`flex-1 ${buttonClass(isAvailable, 'bg-slate-700 hover:bg-slate-600')} text-white py-2 px-3 rounded-md text-sm flex items-center justify-center gap-2`}
          aria-label="Improve Skill"
          title="Improve Skill"
        >
          <Star className="w-4 h-4" />
          Skill
        </button>

        {/* Promote */}
        {!hidePromote && (
          <button
            onClick={() => {
              setPromoteError(null);
              setPromoteTargetRole('');
              setShowPromoteModal(true);
            }}
            disabled={!isAvailable || effectiveOwner}
            className={`flex-1 ${buttonClass(isAvailable && !effectiveOwner, 'bg-slate-700 hover:bg-slate-600')} text-white py-2 px-3 rounded-md text-sm flex items-center justify-center gap-2`}
            aria-label="Promote"
            title="Promote"
          >
            <ArrowUp className="w-4 h-4" />
            Promote
          </button>
        )}

        {/* Release (opens modal) */}
        {!(effectiveOwner && isDriving) ? (
          <button
            onClick={() => setShowFireModal(true)}
            className={`flex-1 ${buttonClass(true, 'bg-rose-600 hover:bg-rose-700')} text-white py-2 px-3 rounded-md text-sm flex items-center justify-center gap-2`}
            aria-label="Release (confirm)"
            title="Release (confirm)"
          >
            <Trash2 className="w-4 h-4" />
            Release
          </button>
        ) : null}

        {/* Stop Driving (conditional) */}
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
        ) : null}
      </div>

      {/* Skill modal (delegates to SkillTrainingModal) */}
      {showSkillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
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
                    // eslint-disable-next-line no-console
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

      {/* Promote Modal */}
      {showPromoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md bg-slate-800 rounded-lg border border-slate-700 shadow-lg overflow-hidden">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-white font-medium">Promote Staff Member</div>
                <button
                  onClick={() => { if (!promoteLoading) setShowPromoteModal(false); }}
                  className="text-slate-400"
                  aria-label="Close promote modal"
                  title="Close"
                >
                  ✕
                </button>
              </div>

              <div className="text-sm text-slate-400 mb-3">
                Promote <span className="text-white font-medium">{resolvedStaff?.name ?? 'this staff member'}</span> to a higher role.
                Promotion will cancel training and reset some progress. This action is irreversible.
              </div>

              <div className="space-y-3">
                <fieldset>
                  <legend className="sr-only">Choose role</legend>
                  <div className="flex flex-col gap-2">
                    <label className={`p-3 rounded border ${promoteTargetRole === 'dispatcher' ? 'border-blue-500 bg-slate-700' : 'border-slate-600'}`}>
                      <input
                        type="radio"
                        name="promoteRole"
                        value="dispatcher"
                        checked={promoteTargetRole === 'dispatcher'}
                        onChange={() => setPromoteTargetRole('dispatcher')}
                        className="mr-2"
                      />
                      <span className="font-medium text-white">Promote to Dispatcher</span>
                      <div className="text-xs text-slate-400 mt-1">Dispatcher manages routes and dispatch; keeps operational focus.</div>
                    </label>

                    <label className={`p-3 rounded border ${promoteTargetRole === 'manager' ? 'border-blue-500 bg-slate-700' : 'border-slate-600'}`}>
                      <input
                        type="radio"
                        name="promoteRole"
                        value="manager"
                        checked={promoteTargetRole === 'manager'}
                        onChange={() => setPromoteTargetRole('manager')}
                        className="mr-2"
                      />
                      <span className="font-medium text-white">Promote to Manager</span>
                      <div className="text-xs text-slate-400 mt-1">Manager gains admin responsibilities; suitable for leadership and admin positions.</div>
                    </label>
                  </div>
                </fieldset>

                {promoteError && <div className="text-sm text-rose-400">{promoteError}</div>}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => { if (!promoteLoading) setShowPromoteModal(false); }}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded"
                  disabled={promoteLoading}
                >
                  Cancel
                </button>

                <button
                  onClick={async () => {
                    // validate
                    if (!promoteTargetRole) {
                      setPromoteError('Please choose a role to promote to.');
                      return;
                    }
                    // additionally prevent promoting owner or to same role
                    const currentRole = resolvedStaff?.role;
                    if (effectiveOwner) {
                      setPromoteError('Owner cannot be promoted using this action.');
                      return;
                    }
                    if (currentRole === promoteTargetRole) {
                      setPromoteError(`This staff is already a ${promoteTargetRole}.`);
                      return;
                    }
                    setPromoteError(null);
                    await performPromote(promoteTargetRole as 'dispatcher' | 'manager');
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-medium"
                  disabled={promoteLoading}
                >
                  {promoteLoading ? 'Promoting…' : 'Confirm Promotion'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stop Driving Modal */}
      <StopDrivingConfirmModal
        open={showStopDrivingModal}
        staffName={resolvedStaff?.name ?? 'Unknown'}
        loading={stopDrivingLoading}
        resultMessage={null}
        onConfirm={performStopDriving}
        onCancel={() => setShowStopDrivingModal(false)}
      />

      {/* Fire confirmation modal */}
      <StaffFireConfirmModal
        open={showFireModal}
        staffId={staffId}
        staffName={resolvedStaff?.name ?? 'Unknown'}
        monthlySalary={prevSalary}
        companyCapital={game?.gameState?.company?.capital ?? 0}
        onConfirm={confirmFire}
        onCancel={() => setShowFireModal(false)}
        loading={fireLoading}
        resultMessage={null}
      />

      {/* Salary Modal */}
      {showSalaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md bg-slate-800 rounded-lg border border-slate-700 shadow-lg overflow-hidden">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-white font-medium">Salary Adjustment</div>
                <button
                  onClick={() => { if (!salarySaving) setShowSalaryModal(false); }}
                  className="text-slate-400"
                  aria-label="Close salary modal"
                  title="Close"
                >
                  ✕
                </button>
              </div>

              <div className="text-sm text-slate-400 mb-4">
                Adjust the monthly salary for <span className="text-white font-medium">{resolvedStaff?.name ?? 'this staff member'}</span>.
                Current: <span className="text-amber-400 font-medium">€{(prevSalary ?? 0).toLocaleString()}</span>
              </div>

              <div className="space-y-3">
                <label className="block text-sm text-slate-300">New Monthly Salary (€)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={salaryInput === '' ? '' : salaryInput}
                    onChange={(e) => {
                      setSalaryError(null);
                      const v = e.target.value;
                      if (v === '') { setSalaryInput(''); return; }
                      const n = Math.max(0, Math.round(Number(v)));
                      setSalaryInput(isNaN(n) ? '' : n);
                    }}
                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 2500"
                  />
                </div>

                <div className="flex gap-2 text-xs text-slate-400">
                  <button
                    onClick={() => setSalaryInput(Math.max(0, Math.round(prevSalary * 0.75)))}
                    className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded"
                    type="button"
                  >
                    -25% preset
                  </button>
                  <button
                    onClick={() => setSalaryInput(Math.round(prevSalary))}
                    className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded"
                    type="button"
                  >
                    Current
                  </button>
                  <button
                    onClick={() => setSalaryInput(Math.round(prevSalary * 1.25))}
                    className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded"
                    type="button"
                  >
                    +25% preset
                  </button>
                  <button
                    onClick={() => setSalaryInput(0)}
                    className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded"
                    type="button"
                  >
                    Set 0
                  </button>
                </div>

                {salaryError && <div className="text-sm text-rose-400">{salaryError}</div>}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => { if (!salarySaving) setShowSalaryModal(false); }}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded"
                  disabled={salarySaving}
                >
                  Cancel
                </button>

                <button
                  onClick={async () => {
                    // Validate
                    const amount = salaryInput === '' ? null : Number(salaryInput);
                    if (amount !== null && (!Number.isFinite(amount) || amount < 0)) {
                      setSalaryError('Please enter a valid non-negative number.');
                      return;
                    }
                    setSalaryError(null);
                    await applySalaryChange(amount);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-medium"
                  disabled={salarySaving}
                >
                  {salarySaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vacation Modal */}
      {showVacationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md bg-slate-800 rounded-lg border border-slate-700 shadow-lg overflow-hidden">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-white font-medium">Set Vacation</div>
                <button
                  onClick={() => { if (!vacationSaving) setShowVacationModal(false); }}
                  className="text-slate-400"
                >
                  ✕
                </button>
              </div>

              <div className="text-sm text-slate-400 mb-4">
                Put <span className="text-white font-medium">{resolvedStaff?.name ?? 'this staff member'}</span> on vacation.
                Choose how many days they will be unavailable.
              </div>

              <div className="space-y-3">
                <label className="block text-sm text-slate-300">Vacation Length (days)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={365}
                    step={1}
                    value={vacationDays}
                    onChange={(e) => {
                      setVacationError(null);
                      const v = Number(e.target.value);
                      if (Number.isNaN(v)) return;
                      setVacationDays(Math.max(1, Math.min(365, Math.round(v))));
                    }}
                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 7"
                  />
                </div>

                <div className="flex gap-2 text-xs text-slate-400">
                  <button
                    onClick={() => setVacationDays(7)}
                    className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded"
                    type="button"
                  >
                    7 days
                  </button>
                  <button
                    onClick={() => setVacationDays(14)}
                    className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded"
                    type="button"
                  >
                    14 days
                  </button>
                  <button
                    onClick={() => setVacationDays(30)}
                    className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded"
                    type="button"
                  >
                    30 days
                  </button>
                </div>

                {vacationError && <div className="text-sm text-rose-400">{vacationError}</div>}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => { if (!vacationSaving) setShowVacationModal(false); }}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded"
                  disabled={vacationSaving}
                >
                  Cancel
                </button>

                <button
                  onClick={async () => {
                    // Validate days
                    const days = Math.round(Number(vacationDays) || 0);
                    if (!Number.isInteger(days) || days < 1 || days > 365) {
                      setVacationError('Please enter a valid number of days between 1 and 365.');
                      return;
                    }
                    setVacationError(null);
                    await applyVacation(days);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-medium"
                  disabled={vacationSaving}
                >
                  {vacationSaving ? 'Applying…' : `Set ${vacationDays} day(s)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StaffActionButtons;
