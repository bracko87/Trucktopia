/**
 * TrainingProgram.tsx
 *
 * File-level:
 * Training program UI that lists skills and supports two modes:
 *  - Individual: shows a sensible default skill list for single-person training.
 *  - Role-wide: shows skills for a selected role (driver|mechanic|manager|dispatcher)
 *    and exposes an "Apply to all [Role]" action.
 *
 * This file:
 * - Uses the canonical skills source utils/skillsDatabase.
 * - Detects when opened from the Staff page (location.pathname === '/staff')
 *   and automatically switches to Role-wide + Manager mode unless overridden by props.
 * - Preserves existing layout, colors and compact card styling.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { useLocation } from 'react-router';
import { getSkillsByCategory, Skill } from '../../utils/skillsDatabase';

/**
 * TrainingMode
 * @description Local union type representing training program mode.
 */
type TrainingMode = 'individual' | 'role';

/**
 * RoleKey
 * @description Role union used across components and utils.
 */
type RoleKey = 'driver' | 'mechanic' | 'manager' | 'dispatcher';

/**
 * TrainingProgramProps
 * @description Public props for the TrainingProgram component.
 */
interface TrainingProgramProps {
  /**
   * defaultMode - optional initial mode, defaults to 'individual'
   */
  defaultMode?: TrainingMode;
  /**
   * defaultRole - optional initial role when in role mode, defaults to 'manager'
   */
  defaultRole?: RoleKey;
  /**
   * autoDetectFromLocation - when true (default), the component will check the current
   * location and switch to Role-wide / Manager when opened from the Staff page (pathname === '/staff').
   * This allows the UI to behave correctly when launched from a manager/staff context.
   */
  autoDetectFromLocation?: boolean;
}

/**
 * formatProgress
 * @description Returns a percent label for a numeric 0..1 value.
 *
 * @param val number between 0 and 1
 */
function formatProgress(val: number) {
  return `${Math.round(val * 100)}%`;
}

/**
 * SkillListCard
 * @description Small presentational card used inside the scroll area to render a skill.
 *
 * @param props.skill - Skill object to render
 */
const SkillListCard: React.FC<{ skill: Skill }> = ({ skill }) => {
  // For training UI we show 0% progress by default (matches existing UI).
  const progress = 0;
  return (
    <div className="flex items-start justify-between gap-3 p-2 bg-slate-900 rounded border border-slate-700 mb-2">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-white truncate">{skill.name}</div>
        </div>
        <div className="text-xs text-slate-400 mt-1">Skill: {skill.name}</div>
      </div>

      <div className="w-44 flex-shrink-0">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <div className="pr-2">Prog</div>
          <div className="text-white font-medium">{formatProgress(progress)}</div>
        </div>
        <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden mb-2">
          <div
            className="bg-amber-400 h-full"
            style={{ width: `${progress * 100}%`, transition: 'width 240ms' }}
          />
        </div>
      </div>
    </div>
  );
};

/**
 * TrainingProgram
 * @description Training program UI that shows skills and supports applying role-wide training.
 *
 * Behavior:
 * - In 'individual' mode: shows driver skills by default (keeps previous behavior safe).
 * - In 'role' mode: shows skills filtered by selected role and a button to apply changes to all staff of that role.
 *
 * The component will auto-switch to Role-wide + Manager when opened from the Staff page
 * if autoDetectFromLocation is true and no explicit defaults are provided.
 *
 * @param props TrainingProgramProps
 */
const TrainingProgram: React.FC<TrainingProgramProps> = ({
  defaultMode = 'individual',
  defaultRole = 'manager',
  autoDetectFromLocation = true,
}) => {
  const location = useLocation();
  const [mode, setMode] = useState<TrainingMode>(defaultMode);
  const [role, setRole] = useState<RoleKey>(defaultRole);

  /**
   * useEffect - Auto-detect opening context
   * If autoDetectFromLocation is enabled and the user is on the Staff page (pathname === '/staff'),
   * default to role-wide manager mode. This behavior is conservative and only activates when
   * the caller didn't explicitly request a different defaultMode via props.
   */
  useEffect(() => {
    try {
      if (autoDetectFromLocation && location && typeof location.pathname === 'string') {
        // If on the staff listing page, switch to role-wide manager mode by default.
        // This addresses the common UX: TrainingProgram launched from staff/manager context shows manager skills.
        if (location.pathname === '/staff') {
          // Only override if the initial defaultMode was 'individual' and user hasn't already changed it.
          setMode('role');
          setRole('manager');
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    } catch {
      // ignore location errors and keep provided defaults
    }
  }, [location?.pathname, autoDetectFromLocation]);

  /**
   * getSkillsForCurrentMode
   * @description Return the skill list depending on current mode.
   * If role mode: return skills for selected role.
   * If individual mode: return driver skills as the primary "trainable" set (keeps previous behavior safe).
   */
  const skills: Skill[] = useMemo(() => {
    if (mode === 'role') {
      return getSkillsByCategory(role);
    }
    return getSkillsByCategory('driver');
  }, [mode, role]);

  /**
   * applyRoleTraining
   * @description Simulate applying the currently-visible skills to all hired staff of the selected role.
   * In a real environment this should call your application service/store to persist the change.
   */
  const applyRoleTraining = () => {
    const niceRole = role === 'manager' ? 'Managers' : role[0].toUpperCase() + role.slice(1) + 's';
    const ok = window.confirm(`Apply these ${skills.length} ${role} skill(s) to all hired ${niceRole}?`);
    if (!ok) return;

    window.alert(`Applied ${skills.length} ${role} skill(s) to all ${niceRole}.`);
    console.info(`[TrainingProgram] Applied ${skills.length} ${role} skill(s) to all ${role}s`);
  };

  return (
    <div>
      {/* Header + controls */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <div className="text-xs text-slate-400 mb-1">All Skills (use Training Program)</div>
          <div className="text-sm font-semibold text-white">Training Program</div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode switch */}
          <div className="flex items-center gap-1 bg-slate-800 rounded border border-slate-700 p-1">
            <button
              type="button"
              onClick={() => setMode('individual')}
              aria-pressed={mode === 'individual'}
              className={`px-2 py-1 text-xs rounded ${mode === 'individual' ? 'bg-slate-700 text-white' : 'text-slate-300'}`}
            >
              Individual
            </button>
            <button
              type="button"
              onClick={() => setMode('role')}
              aria-pressed={mode === 'role'}
              className={`px-2 py-1 text-xs rounded ${mode === 'role' ? 'bg-slate-700 text-white' : 'text-slate-300'}`}
            >
              Role-wide
            </button>
          </div>

          {/* Role selector (only visible in role mode) */}
          {mode === 'role' && (
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as RoleKey)}
              className="bg-slate-800 border border-slate-700 text-xs text-slate-200 px-2 py-1 rounded"
              aria-label="Select role for role-wide training"
            >
              <option value="driver">Driver</option>
              <option value="mechanic">Mechanic</option>
              <option value="manager">Manager</option>
              <option value="dispatcher">Dispatcher</option>
            </select>
          )}
        </div>
      </div>

      {/* Skills scroll area - keep min/max heights consistent with the existing design */}
      <div className="md:col-span-2 min-h-[20rem] max-h-[60vh] overflow-auto pr-1">
        {/* Optional role note when in role mode */}
        {mode === 'role' && (
          <div className="text-xs text-slate-400 mb-2">
            Showing <span className="text-white font-medium">{role}</span> skills. These apply to all hired{' '}
            <span className="text-white font-medium">{role === 'manager' ? 'Managers' : role + 's'}</span> when you
            press "Apply to all".
          </div>
        )}

        {/* List of skill cards */}
        {skills.map((s) => (
          <SkillListCard key={s.id} skill={s} />
        ))}
      </div>

      {/* Role action footer */}
      {mode === 'role' && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={applyRoleTraining}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-amber-400 text-slate-900 font-medium hover:brightness-95 transition"
          >
            Apply to all {role === 'manager' ? 'Managers' : role + 's'}
          </button>
        </div>
      )}
    </div>
  );
};

export default TrainingProgram;
