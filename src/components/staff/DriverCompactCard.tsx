/**
 * DriverCompactCard.tsx
 *
 * File-level:
 * Compact staff card used for drivers, mechanics, managers and dispatchers.
 * This component also contains logic for a "Stop Driving" -> "archived" flow.
 * When a user stops driving their own driver entry the UI shows an archived replacement
 * (Driver (archived)) which must persist until the user restores it via "Drive as User"
 * or permanently removes the archived record.
 *
 * Behavior:
 * - Prefer persisting archive into company.archivedStaff (via GameContext.createCompany).
 * - As a resilience measure we also persist an archived snapshot into localStorage so the
 *   archived UI remains visible across reloads even if central persistence isn't available.
 *
 * Notes:
 * - This file follows jsdoc comment rules (file/component/function/interface).
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Truck, Calendar, Wrench, Users, UserCog } from 'lucide-react';
import { useGame } from '../../contexts/GameContext';
import StaffActionButtons from './StaffActionButtons';
import { SkillChipsList } from './SmallSkillCard';
import PositionBlock from './RolePanels/PositionBlock';
import StaffFireConfirmModal from './StaffFireConfirmModal';
import { toast } from 'sonner';

/**
 * CompactStaff
 * @description Data passed to the card
 */
export interface CompactStaff {
  id: string;
  name: string;
  role?: string;
  experience?: number;
  salary?: number | 'FREE';
  hiredDate?: string;
  status?: string;
  isOwner?: boolean;
  availabilityDate?: string | undefined;
  skills?: string[];
  nationality?: string;
  age?: number;
  kilometers?: number;
  tours?: number;
  happiness?: number;
  fit?: number;
}

/**
 * DriverCompactCardProps
 * @description Props for DriverCompactCard
 */
export interface DriverCompactCardProps {
  staff: CompactStaff;
  onRemove?: (id: string) => void;
  onAssign?: (id: string) => void;
  fullWidth?: boolean;
  onSalaryAdjust?: (id: string, amount: number | null) => void;
  onVacation?: (id: string, days: number | null) => void;
  onSkillImprove?: (id: string, skill: string | null) => void;
  onPromote?: (id: string, role?: 'dispatcher' | 'manager') => void;
  onFire?: (id: string) => void;
}

/**
 * buildProgressKey
 * @description Local helper (kept for compatibility with existing logic)
 */
function buildProgressKey(staffId: string, skill: string): string {
  return `tm_skill_progress_${staffId}_${encodeURIComponent(skill)}`;
}

/**
 * DriverCompactCard
 * @description Small card representing a staff member. Enhanced for the current-user
 * "Stop Driving" flow: when the logged-in user stops driving, the card is archived and
 * replaced with a persistent "Driver (archived)" UI until the user chooses to restore it.
 */
const DriverCompactCard: React.FC<DriverCompactCardProps> = ({
  staff,
  onRemove,
  onAssign,
  fullWidth = false,
  onSalaryAdjust,
  onVacation,
  onSkillImprove,
  onPromote,
  onFire,
}) => {
  const game = useGame();
  const [expanded, setExpanded] = useState(false);
  const [showFireConfirm, setShowFireConfirm] = useState(false);
  const [fireProcessing, setFireProcessing] = useState(false);
  const [fireResultMessage, setFireResultMessage] = useState<string | null>(null);

  /**
   * stoppedDriving
   * @description Whether this specific staff entry has been archived for the current company.
   * When true (and this is the current user's driver) we render the Drive-as-User UI instead of the card.
   */
  const [stoppedDriving, setStoppedDriving] = useState<boolean>(false);

  /**
   * archivedSnapshot
   * @description Keep a shallow snapshot of the archived staff so we can restore it later.
   */
  const [archivedSnapshot, setArchivedSnapshot] = useState<CompactStaff | null>(null);

  const wrapperClasses = fullWidth
    ? 'w-full bg-slate-800 rounded-xl border border-slate-700 hover:border-slate-600 transition-shadow duration-150'
    : 'min-w-[260px] max-w-[340px] bg-slate-800 rounded-xl border border-slate-700 hover:border-slate-600 transition-shadow duration-150';

  const availabilityText = staff.availabilityDate ? new Date(staff.availabilityDate).toLocaleDateString() : undefined;
  const kilometers = typeof staff.kilometers === 'number' ? staff.kilometers : 0;
  const tours = typeof staff.tours === 'number' ? staff.tours : 0;
  const happiness = typeof staff.happiness === 'number' ? staff.happiness : 100;
  const fit = typeof staff.fit === 'number' ? staff.fit : 100;

  /**
   * isCurrentUserDriver
   * @description Heuristic to detect whether this staff entry belongs to the signed-in user.
   * We rely on:
   *  - staff.isOwner (most reliable for owner-as-driver)
   *  - fallback: staff.id containing currentUser (legacy or fallback)
   */
  const isCurrentUserDriver = useMemo(() => {
    try {
      const g = game.gameState;
      if (!g) return false;
      const cu = g.currentUser;
      if (!cu) return false;
      if (staff.isOwner) return true;
      try {
        if (String(staff.id).toLowerCase().includes(String(cu).toLowerCase())) return true;
      } catch {}
      return false;
    } catch {
      return false;
    }
  }, [game.gameState, staff]);

  /**
   * archivedLocalKey
   * @description Create a deterministic localStorage key for archived snapshot fallback
   */
  const archivedLocalKey = (companyUser?: string, staffId?: string) => {
    const user = (companyUser || game.gameState?.currentUser || 'local').toString().toLowerCase();
    const id = String(staffId || staff.id);
    return `tm_archived_staff_${user}_${id}`;
  };

  /**
   * initialize stoppedDriving from company.archivedStaff or localStorage when component mounts or company changes
   * If the staff is already archived, show the "Drive-as-User" UI immediately and persist the local snapshot.
   */
  useEffect(() => {
    try {
      const comp = game.gameState?.company;
      // 1) Try company.archivedStaff
      if (comp && Array.isArray(comp.archivedStaff)) {
        const found = comp.archivedStaff.find((a: any) => String(a.id) === String(staff.id));
        if (found) {
          setStoppedDriving(true);
          const snap: CompactStaff = {
            id: found.id,
            name: found.name,
            role: found.role,
            experience: found.experience,
            salary: found.salary === 0 ? 'FREE' : found.salary,
            hiredDate: found.hiredDate,
            status: found.status,
            isOwner: found.isOwner,
            availabilityDate: found.availabilityDate,
            skills: found.skills,
            nationality: found.nationality,
            kilometers: found.kilometers,
            tours: found.tours,
            happiness: found.happiness,
            fit: found.fit,
          };
          setArchivedSnapshot(snap);

          // Ensure local persistence for resilience
          try {
            localStorage.setItem(archivedLocalKey(game.gameState?.currentUser, staff.id), JSON.stringify(found));
          } catch {}

          return;
        }
      }

      // 2) Fallback: check localStorage key persisted earlier
      try {
        const key = archivedLocalKey(game.gameState?.currentUser, staff.id);
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.id && String(parsed.id) === String(staff.id)) {
            setStoppedDriving(true);
            const snap: CompactStaff = {
              id: parsed.id,
              name: parsed.name,
              role: parsed.role,
              experience: parsed.experience,
              salary: parsed.salary === 0 ? 'FREE' : parsed.salary,
              hiredDate: parsed.hiredDate,
              status: parsed.status,
              isOwner: parsed.isOwner,
              availabilityDate: parsed.availabilityDate,
              skills: parsed.skills,
              nationality: parsed.nationality,
              kilometers: parsed.kilometers,
              tours: parsed.tours,
              happiness: parsed.happiness,
              fit: parsed.fit,
            };
            setArchivedSnapshot(snap);
            return;
          }
        }
      } catch {
        // ignore
      }

      // Default: not archived
      setStoppedDriving(false);
      setArchivedSnapshot(null);
    } catch {
      setStoppedDriving(false);
      setArchivedSnapshot(null);
    }
  }, [game.gameState?.company, staff.id]);

  /**
   * handleStopDriving
   * @description Archive the staff in company.archivedStaff, remove from company.staff,
   * persist via createCompany and immediately update UI to show "Drive as User".
   * Also writes a localStorage fallback so the archived replacement persists across reloads
   * even if central persistence fails.
   */
  const handleStopDriving = (id: string) => {
    try {
      const comp = game.gameState?.company;
      const currentUser = game.gameState?.currentUser ?? 'user';
      // Local-only UX update when company is missing
      if (!comp) {
        const snap: CompactStaff = { ...staff };
        setArchivedSnapshot(snap);
        setStoppedDriving(true);
        try { localStorage.setItem(archivedLocalKey(currentUser, id), JSON.stringify(snap)); } catch {}
        try { toast.success('You stopped driving — UI updated locally.'); } catch {}
        return;
      }

      // clone to avoid mutations
      const clone: any = JSON.parse(JSON.stringify(comp));

      const idx = (clone.staff || []).findIndex((s: any) => String(s.id) === String(id));
      // If not found, still transition to Drive-as-User UI and persist an archived snapshot
      if (idx === -1) {
        const snap: CompactStaff = { ...staff };
        setArchivedSnapshot(snap);
        setStoppedDriving(true);
        try { localStorage.setItem(archivedLocalKey(currentUser, id), JSON.stringify(snap)); } catch {}
        try { toast.success('Driver archived.'); } catch {}
        return;
      }

      const staffObj = clone.staff[idx];

      // Create archive array if missing
      clone.archivedStaff = Array.isArray(clone.archivedStaff) ? clone.archivedStaff : [];

      // Shallow archive snapshot with metadata
      const archived = {
        ...staffObj,
        archivedAt: new Date().toISOString(),
        archivedReason: 'stoppedDriving',
        archivedBy: currentUser,
      };

      // Avoid duplicates
      const already = clone.archivedStaff.find((a: any) => String(a.id) === String(id));
      if (!already) clone.archivedStaff.push(archived);

      // Remove from active staff
      clone.staff = clone.staff.filter((s: any) => String(s.id) !== String(id));

      // Persist change using createCompany so app-level persistence + effects run
      try {
        if (typeof game.createCompany === 'function') {
          game.createCompany?.(clone);
        } else if ((game as any).setGameState) {
          // best-effort fallback
          (game as any).setGameState({ ...game.gameState, company: clone });
        }
      } catch (err) {
        // ignore persistence errors (we still keep local fallback)
      }

      // Keep a snapshot locally so we can restore later
      const snap: CompactStaff = {
        id: archived.id,
        name: archived.name,
        role: archived.role,
        experience: archived.experience,
        salary: archived.salary === 0 ? 'FREE' : archived.salary,
        hiredDate: archived.hiredDate,
        status: archived.status,
        isOwner: archived.isOwner,
        availabilityDate: archived.availabilityDate,
        skills: archived.skills,
        nationality: archived.nationality,
        kilometers: archived.kilometers,
        tours: archived.tours,
        happiness: archived.happiness,
        fit: archived.fit,
      };

      setArchivedSnapshot(snap);
      setStoppedDriving(true);

      // Persist local fallback to ensure the Drive-as-User UI remains across reloads
      try {
        localStorage.setItem(archivedLocalKey(currentUser, id), JSON.stringify(archived));
      } catch {}

      // Notify other listeners
      try { window.dispatchEvent(new CustomEvent('staff:stoppedDriving', { detail: { staffId: id } })); } catch {}

      try { toast.success('You stopped driving — your driver card was archived.'); } catch {}
    } catch (err) {
      // Log and notify user
      // eslint-disable-next-line no-console
      console.error('[DriverCompactCard] handleStopDriving error', err);
      try { toast.error('Failed to stop driving. See console.'); } catch {}
    }
  };

  /**
   * handleDriveAsUser
   * @description Reverse the archive: restore the archivedSnapshot back into company.staff
   * and remove it from company.archivedStaff. Persist via createCompany. Also remove localStorage fallback.
   */
  const handleDriveAsUser = () => {
    try {
      if (!archivedSnapshot) {
        setStoppedDriving(false);
        try { toast.success('You can now drive again.'); } catch {}
        return;
      }

      const comp = game.gameState?.company;
      const currentUser = game.gameState?.currentUser ?? 'user';

      // If no central company: simply unhide the UI card using local snapshot and remove local fallback
      if (!comp) {
        setStoppedDriving(false);
        setArchivedSnapshot(null);
        try { localStorage.removeItem(archivedLocalKey(currentUser, archivedSnapshot.id)); } catch {}
        try { toast.success('Drive reactivated locally.'); } catch {}
        return;
      }

      const clone: any = JSON.parse(JSON.stringify(comp));
      clone.staff = Array.isArray(clone.staff) ? clone.staff : [];
      clone.archivedStaff = Array.isArray(clone.archivedStaff) ? clone.archivedStaff : [];

      // Remove archived with same id (first match)
      clone.archivedStaff = clone.archivedStaff.filter((a: any) => String(a.id) !== String(archivedSnapshot.id));

      // Restore staff object (clean archive-specific fields)
      const restored: any = { ...archivedSnapshot };
      delete restored.archivedAt;
      delete restored.archivedReason;
      delete restored.archivedBy;

      // Avoid duplicate active staff entries
      const exists = clone.staff.find((s: any) => String(s.id) === String(restored.id));
      if (!exists) clone.staff.push(restored);

      // Persist
      try {
        game.createCompany?.(clone);
      } catch {
        try {
          if ((game as any).setGameState) (game as any).setGameState({ ...game.gameState, company: clone });
        } catch {
          // ignore
        }
      }

      // Remove local fallback
      try { localStorage.removeItem(archivedLocalKey(currentUser, archivedSnapshot.id)); } catch {}

      setStoppedDriving(false);
      setArchivedSnapshot(null);

      // Notify listeners
      try { window.dispatchEvent(new CustomEvent('staff:restoredDriving', { detail: { staffId: restored.id } })); } catch {}

      try { toast.success('You can now drive again. Welcome back!'); } catch {}
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[DriverCompactCard] handleDriveAsUser error', err);
      try { toast.error('Failed to restore driving account. See console.'); } catch {}
    }
  };

  /**
   * safeOnFire
   * @description Request to fire: show confirm modal
   */
  const safeOnFire = (id: string) => {
    setFireResultMessage(null);
    setShowFireConfirm(true);
  };

  /**
   * doConfirmFire
   * @description Fire handler invoked from integrated modal; delegates to GameContext fireStaff when available.
   */
  const doConfirmFire = async () => {
    if (!staff || !staff.id) {
      setFireResultMessage('Staff data missing');
      return;
    }
    setFireProcessing(true);
    setFireResultMessage(null);
    try {
      const result = await Promise.resolve((game as any).fireStaff?.(staff.id) ?? { success: true });
      if (result && result.success) {
        setFireResultMessage(result.message || 'Staff released successfully.');
        try {
          if (onFire) onFire(staff.id);
          else if (onRemove) onRemove(staff.id);
        } catch {
          // ignore callback errors
        }
      } else {
        setFireResultMessage(result?.message ?? 'Failed to release staff. Check funds.');
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[DriverCompactCard] doConfirmFire error', err);
      setFireResultMessage('Unexpected error while releasing staff.');
    } finally {
      setFireProcessing(false);
      setTimeout(() => {
        setShowFireConfirm(false);
        setFireResultMessage(null);
      }, 900);
    }
  };

  // If stoppedDriving true and this is the current user driver, render replacement UI
  if (stoppedDriving && isCurrentUserDriver) {
    return (
      <div className={wrapperClasses}>
        <div className="p-4 flex items-center justify-between">
          <div className="min-w-0">
            <h4 className="font-medium text-white truncate">{staff.name}</h4>
            <div className="text-xs text-slate-400">Driver (archived)</div>
            <div className="text-xs text-slate-400 mt-2">Your driver card was archived — your stats are preserved.</div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <button
              onClick={() => handleDriveAsUser()}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              <Truck className="w-4 h-4" />
              <span>Drive as User</span>
            </button>

            <button
              onClick={() => {
                if (!confirm('Remove archived driver permanently? This will delete the archived record.')) return;
                try {
                  const comp = game.gameState?.company;
                  const currentUser = game.gameState?.currentUser ?? 'user';
                  if (!comp) {
                    setArchivedSnapshot(null);
                    setStoppedDriving(false);
                    try { localStorage.removeItem(archivedLocalKey(currentUser, staff.id)); } catch {}
                    return;
                  }
                  const clone: any = JSON.parse(JSON.stringify(comp));
                  clone.archivedStaff = Array.isArray(clone.archivedStaff) ? clone.archivedStaff.filter((a: any) => String(a.id) !== String(staff.id)) : [];
                  try { game.createCompany?.(clone); } catch { try { if ((game as any).setGameState) (game as any).setGameState({ ...game.gameState, company: clone }); } catch {} }
                  setArchivedSnapshot(null);
                  setStoppedDriving(false);
                  try { localStorage.removeItem(archivedLocalKey(game.gameState?.currentUser, staff.id)); } catch {}
                  try { toast.success('Archived entry removed.'); } catch {}
                } catch (err) {
                  // eslint-disable-next-line no-console
                  console.error('[DriverCompactCard] remove archived error', err);
                  try { toast.error('Failed to remove archived driver.'); } catch {}
                }
              }}
              className="text-xs text-amber-400 underline hover:text-amber-300"
            >
              Remove archived record
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={wrapperClasses} data-staff-id={staff.id}>
      <div className="p-3 flex items-center justify-between space-x-3">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="p-2 rounded-lg text-blue-400 bg-blue-400/10">
            {staff.role === 'mechanic' ? <Wrench className="w-5 h-5 text-blue-400" /> : staff.role === 'dispatcher' ? <Users className="w-5 h-5 text-blue-400" /> : staff.role === 'manager' ? <UserCog className="w-5 h-5 text-blue-400" /> : <Truck className="w-5 h-5 text-blue-400" />}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-white truncate" title={staff.name}>{staff.name}</h4>
              {staff.isOwner && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-400/10 text-amber-400">Owner</span>}
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${staff.status === 'available' ? 'text-green-400 bg-green-400/10' : 'text-slate-400 bg-slate-400/10'}`}>
                  {staff.status ? staff.status.charAt(0).toUpperCase() + staff.status.slice(1) : 'Available'}
                </span>
                <span className="text-slate-400 truncate">Exp: <span className="text-white font-medium">{staff.experience ?? 0}%</span></span>
              </div>

              <div className="flex-1 flex justify-end min-w-0">
                <div className="flex items-center justify-end gap-2 overflow-hidden">
                  {staff.skills && staff.skills.length > 0 && <SkillChipsList skills={staff.skills.slice(0, 3)} />}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-right min-w-[90px]">
          <div className="text-sm text-slate-400">Salary</div>
          <div className="text-white font-medium">{typeof staff.salary === 'number' ? `€${(staff.salary as number).toLocaleString()}` : (staff.salary === 'FREE' ? 'FREE' : '-')}</div>
        </div>
      </div>

      <div className="px-3 pb-3 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-blue-400" />
            <span className="whitespace-nowrap">{staff.hiredDate ? new Date(staff.hiredDate).toLocaleDateString() : '-'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className="px-2 py-1 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs">
            {expanded ? 'Hide' : 'Details'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-3 border-t border-slate-700 text-sm text-slate-300 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">Nationality</div>
              <div className="text-white font-medium">{staff.nationality || '-'}</div>
            </div>
            <div />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {staff.role === 'driver' && (
              <div>
                <div className="text-xs text-slate-400 mb-1">Company Stats</div>
                <div className="space-y-3">
                  <div className="text-sm">
                    <div className="text-xs text-slate-400">Kilometers</div>
                    <div className="text-white font-medium">{kilometers.toLocaleString()} km</div>
                  </div>
                  <div className="text-sm">
                    <div className="text-xs text-slate-400">Tours</div>
                    <div className="text-white font-medium">{tours.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <div className="text-xs text-slate-400 mb-2">Condition</div>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1 text-xs text-slate-400">
                    <div>Happiness</div>
                    <div className="text-white font-medium">{Math.round(happiness)}%</div>
                  </div>
                  <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
                    <div className="bg-blue-400 h-full" style={{ width: `${clamp(happiness)}%`, transition: 'width 300ms ease' }} aria-hidden />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1 text-xs text-slate-400">
                    <div>Fit</div>
                    <div className="text-white font-medium">{Math.round(fit)}%</div>
                  </div>
                  <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
                    <div className="bg-emerald-400 h-full" style={{ width: `${clamp(fit)}%`, transition: 'width 300ms ease' }} aria-hidden />
                  </div>
                </div>
              </div>
            </div>

            <div>
              {staff.role === 'manager' && (
                <>
                  <PositionBlock position={undefined} assignedAt={undefined} />
                </>
              )}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-2">Actions</div>
            <StaffActionButtons
              staffId={staff.id}
              onSalaryAdjust={(id, amount) => { if (onSalaryAdjust) onSalaryAdjust(id, amount); else game.adjustSalary(id, amount || 0); }}
              onVacation={(id, days) => { if (onVacation) onVacation(id, days); else game.setVacation(id, days); }}
              onSkillImprove={(id, skill) => { if (onSkillImprove) onSkillImprove(id, skill); else game.improveSkill(id, skill); }}
              onPromote={(id, role) => {
                if (onPromote) { try { onPromote(id, role); } catch (e) { console.warn('[DriverCompactCard] external onPromote threw', e); } return; }
                try {
                  if ((game as any).promoteStaff) { try { (game as any).promoteStaff(id, role); } catch { /* ignore */ } }
                } catch { try { game.promoteStaff(id, role); } catch (e2) { console.error('[DriverCompactCard] promote fallback failed', e2); } }
              }}
              onFire={(id) => { safeOnFire(id); }}
              onStopDriving={(id) => {
                /**
                 * Intercept the onStopDriving callback: archive & remove the staff immediately
                 * so the driver card disappears from UI without waiting for parent handlers.
                 */
                handleStopDriving(id);
              }}
              isOwner={!!staff.isOwner}
              isDriving={isCurrentUserDriver}
              hidePromote={!(staff.role === 'driver' || staff.role === 'mechanic' || staff.role === 'dispatcher')}
              hideStopDriving={staff.role !== 'driver'}
            />
          </div>
        </div>
      )}

      {/* Integrated game-styled fire confirmation modal */}
      <StaffFireConfirmModal
        open={showFireConfirm}
        staffName={staff.name}
        monthlySalary={typeof staff.salary === 'number' ? staff.salary : 0}
        companyCapital={typeof game?.gameState?.company?.capital === 'number' ? game!.gameState!.company!.capital! : Number(game?.gameState?.company?.capital || 0)}
        onCancel={() => { setShowFireConfirm(false); setFireResultMessage(null); }}
        onConfirm={() => { doConfirmFire(); }}
        loading={fireProcessing}
        resultMessage={fireResultMessage}
      />
    </div>
  );
};

/**
 * clamp
 * Utility to clamp a number between 0 and 100 (presentational)
 */
function clamp(v: number) {
  const n = Number.isFinite(Number(v)) ? Number(v) : 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export default DriverCompactCard;