/**
 * SkillTrainingModal.tsx
 *
 * Modal used to view skills and start training for a staff member.
 *
 * This component intentionally restricts the "All Skills" list to the canonical
 * skills of the staff member's role (mechanic -> mechanic skills, driver -> driver skills,
 * dispatcher -> dispatcher skills, manager -> manager skills).
 *
 * Enhancement:
 * - Adds a fixed Close button anchored to the bottom-right corner of the viewport
 *   that is shown when the modal is in a "grayed out" state (disabled or starting).
 *   This ensures the user can always dismiss the modal even when the footer buttons
 *   are not visible or are disabled.
 *
 * Visual/layout:
 * - Keeps existing layout and Tailwind classes to avoid visual regressions.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Play, X } from 'lucide-react';
import { useGame } from '../../contexts/GameContext';
import { getSkillsByCategory } from '../../utils/skillsDatabase';
import { readSkillProgress, writeSkillProgress } from '../../utils/skillPersistence';

/**
 * parseStoredProgress
 * @description Backwards-compatible wrapper used by older code paths that expected
 *              parseStoredProgress(staffId, skill) -> number | null.
 *              Delegates to readSkillProgress and normalizes the return value.
 * @param staffId staff identifier (id or hireUid)
 * @param skill skill name
 * @returns integer percent 0..100 or null if missing
 */
function parseStoredProgress(staffId: string, skill: string): number | null {
  try {
    const v = readSkillProgress(String(staffId), String(skill));
    if (v === null || typeof v === 'undefined') return null;
    const n = Number(v);
    if (Number.isNaN(n)) return null;
    return Math.max(0, Math.min(100, Math.round(n)));
  } catch {
    return null;
  }
}

/**
 * writeStoredProgress
 * @description Backwards-compatible wrapper used by older code paths that expected
 *              writeStoredProgress(staffId, skill, pct). Delegates to writeSkillProgress.
 * @param staffId staff identifier (id or hireUid)
 * @param skill skill name
 * @param pct percent 0..100
 */
function writeStoredProgress(staffId: string, skill: string, pct: number): void {
  try {
    writeSkillProgress(String(staffId), String(skill), Math.max(0, Math.min(100, Math.round(Number(pct) || 0))));
  } catch {
    // ignore storage failures
  }
}

/**
 * Props for SkillTrainingModal
 */
export interface SkillTrainingModalProps {
  /** Staff id to operate on */
  staffId: string;
  /** Close callback */
  onClose: () => void;
}

/**
 * Clamp helper for 0..100 range
 * @param v value
 * @param a min
 * @param b max
 */
const clamp = (v: number, a = 0, b = 100) => Math.max(a, Math.min(b, v));

/**
 * Helper preferring persisted values using hireUid then id. Returns integer percent or null.
 * @param staffObj staff object (may contain hireUid and id)
 * @param skill skill name
 */
const readPersistedProgress = (staffObj: any, skill: string): number | null => {
  try {
    const hireUid = staffObj?.hireUid ?? null;
    const id = staffObj?.id ?? null;
    if (hireUid) {
      const v = readSkillProgress(hireUid, skill);
      if (v !== null) return clamp(Math.round(v));
    }
    if (id) {
      const v2 = readSkillProgress(id, skill);
      if (v2 !== null) return clamp(Math.round(v2));
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Persist per-skill progress using the canonical writer (writes JSON {pct, updatedAt})
 * under the provided identifier (staffId).
 * @param staffId identifier (staff.id or hireUid)
 * @param skill skill name
 * @param pct percent
 */
const writePersistedProgress = (staffId: string, skill: string, pct: number) => {
  try {
    writeSkillProgress(staffId, skill, clamp(Math.round(pct)));
  } catch {
    // ignore errors
  }
};

/**
 * costForGain
 * Determine cost (EUR) for requested gain and current percent.
 * baseByGain = { 3:1000, 4:2000, 5:3000 }
 * cost = base + (5000 - base) * (currentPct / 100)  // clamped 1000..5000
 * @param currentPct
 * @param gain
 */
const costForGain = (currentPct: number, gain: number) => {
  const baseByGain: Record<number, number> = { 3: 1000, 4: 2000, 5: 3000 };
  const base = baseByGain[gain] ?? 1000;
  let cost = Math.round(base + ((5000 - base) * (currentPct / 100)));
  cost = Math.max(1000, Math.min(5000, cost));
  return cost;
};

/**
 * mapGainToDays
 * Map requested gain to a reasonable duration in days.
 * 3% -> 7 days, 4% -> 8 days, 5% -> 10 days
 * @param gain
 */
const mapGainToDays = (gain: number) => {
  if (gain === 3) return 7;
  if (gain === 4) return 8;
  return 10;
};

/**
 * SkillTrainingModal
 *
 * Modal used to view skills and start training for a staff member.
 * Key behavior: the "All Skills" list is strictly the canonical skills for the staff.role.
 *
 * Additional enhancement: a floating bottom-right Close button is rendered when the modal
 * is in a "grayed out" state (Start disabled or currently starting). This ensures the modal
 * can always be dismissed.
 */
const SkillTrainingModal: React.FC<SkillTrainingModalProps> = ({ staffId, onClose }) => {
  const game = useGame();
  const { gameState, createCompany } = game || ({} as any);

  /**
   * Resolve staff object from GameContext
   * @description locate staff within current company by id
   */
  const staff = useMemo(() => {
    const comp = gameState?.company;
    if (!comp || !Array.isArray(comp.staff)) return null;
    return comp.staff.find((s: any) => s.id === staffId) ?? null;
  }, [gameState?.company, staffId]);

  /**
   * Build canonical skill list based strictly on the staff role.
   * DO NOT merge arbitrary staff.skills from other categories.
   *
   * NOTE: We explicitly handle 'manager' here so managers receive manager skills.
   */
  const skillsList: string[] = useMemo(() => {
    if (!staff) return [];
    const category =
      staff.role === 'mechanic'
        ? 'mechanic'
        : staff.role === 'dispatcher'
        ? 'dispatcher'
        : staff.role === 'manager'
        ? 'manager'
        : 'driver';
    try {
      return getSkillsByCategory(category).map((s) => s.name);
    } catch {
      // If skills database not available, fall back to staff.skills (if any)
      return Array.isArray(staff.skills) ? (staff.skills as string[]) : [];
    }
  }, [staff?.role, staff?.id]);

  const [selectedSkill, setSelectedSkill] = useState<string>(() => skillsList[0] ?? '');
  const [progress, setProgress] = useState<number>(0);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedGain, setSelectedGain] = useState<number>(3);
  const [optimisticStatus, setOptimisticStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!skillsList || skillsList.length === 0) {
      setSelectedSkill('');
      return;
    }
    if (!selectedSkill || !skillsList.includes(selectedSkill)) {
      setSelectedSkill(skillsList[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skillsList.join('|')]);

  // Load progress for selected skill
  useEffect(() => {
    if (!selectedSkill || !staff) {
      setProgress(0);
      return;
    }

    // 1) Prefer persisted progress (hireUid then id) via canonical reader
    const persisted = readPersistedProgress(staff, selectedSkill);
    if (persisted !== null) {
      setProgress(persisted);
      return;
    }

    // 2) Fall back to company/staff.skillsProgress if present
    try {
      const sp = (staff as any).skillsProgress;
      if (sp && typeof sp === 'object' && typeof sp[selectedSkill] === 'number') {
        const raw = clamp(Math.round(sp[selectedSkill]));
        // Mirror into persisted storage under both identifiers for consistency
        try { if (staff.id) writePersistedProgress(staff.id, selectedSkill, raw); } catch {}
        try { if (staff.hireUid) writePersistedProgress(staff.hireUid, selectedSkill, raw); } catch {}
        setProgress(raw);
        return;
      }
    } catch {
      // ignore
    }

    // 3) Check skill metadata (get default percent from skill data if available)
    try {
      const category =
        staff.role === 'mechanic'
          ? 'mechanic'
          : staff.role === 'dispatcher'
          ? 'dispatcher'
          : staff.role === 'manager'
          ? 'manager'
          : 'driver';
      const meta = getSkillsByCategory(category).find((m) => m.name === selectedSkill) as any | undefined;
      const metaPct =
        meta && (typeof meta.initialPct === 'number' ? meta.initialPct : typeof meta.defaultPct === 'number' ? meta.defaultPct : typeof meta.pct === 'number' ? meta.pct : null);
      if (metaPct !== null) {
        const v = clamp(Math.round(Number(metaPct)));
        try { if (staff.id) writePersistedProgress(staff.id, selectedSkill, v); } catch {}
        try { if (staff.hireUid) writePersistedProgress(staff.hireUid, selectedSkill, v); } catch {}
        setProgress(v);
        return;
      }
    } catch {
      // ignore if skills database not available
    }

    // 4) Deterministic seed for staff that already have the skill (80..100)
    if (Array.isArray(staff.skills) && staff.skills.includes(selectedSkill)) {
      let hash = 0;
      const seedStr = `${staff.id}:${selectedSkill}`;
      for (let i = 0; i < seedStr.length; i++) {
        hash = (hash << 5) - hash + seedStr.charCodeAt(i);
        hash |= 0;
      }
      const seed = Math.abs(hash);
      const initial = 80 + (seed % 21);
      const decayed = clamp(Math.round(initial));
      try { if (staff.id) writePersistedProgress(staff.id, selectedSkill, decayed); } catch {}
      try { if (staff.hireUid) writePersistedProgress(staff.hireUid, selectedSkill, decayed); } catch {}
      setProgress(decayed);
      return;
    }

    // 5) Default: 0
    setProgress(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSkill, staffId, staff]);

  // Keep optimistic state cleared when persistent state updates
  useEffect(() => {
    if (!staff) {
      setOptimisticStatus(null);
      setIsStarting(false);
      return;
    }
    const persistentStatus = staff.status ?? null;
    if (optimisticStatus && persistentStatus === optimisticStatus) {
      setOptimisticStatus(null);
      setIsStarting(false);
    }

    // Refresh progress if authoritative value exists
    try {
      const sp = (staff as any).skillsProgress;
      if (sp && typeof sp === 'object' && typeof sp[selectedSkill] === 'number') {
        const pct = clamp(Math.round(sp[selectedSkill]));
        setProgress(pct);
        writeStoredProgress(staffId, selectedSkill, pct);
      }
    } catch {
      // ignore
    }
  }, [gameState?.company, staff, optimisticStatus, selectedSkill, staffId]);

  /**
   * canStartTraining
   * Ensure training can be started for selected skill (status / progress checks)
   */
  const canStartTraining = (): { allowed: boolean; reason?: string } => {
    if (!staff) return { allowed: false, reason: 'Staff not found' };
    const sStatus = optimisticStatus ?? (staff.status ?? 'available');
    if (sStatus !== 'available') return { allowed: false, reason: 'Staff must be Available' };
    if (progress >= 100) return { allowed: false, reason: 'Skill already mastered (100%)' };
    if ((staff as any).onVacationUntil) return { allowed: false, reason: 'Staff is on vacation' };
    const assigned = (gameState?.company?.activeJobs || []).find(
      (j: any) => !['completed', 'cancelled'].includes(j.status) && String(j.assignedDriver) === String(staff.id)
    );
    if (assigned) return { allowed: false, reason: 'Staff is assigned to an active job' };
    return { allowed: true };
  };

  /**
   * handleStartTraining
   * Schedule a training session through GameContext.startTraining
   */
  const handleStartTraining = async () => {
    setError(null);
    if (!staff || !selectedSkill) {
      setError('Staff or skill not available');
      return;
    }

    const check = canStartTraining();
    if (!check.allowed) {
      setError(check.reason ?? 'Cannot start training');
      return;
    }

    const reqGain = Math.max(3, Math.min(5, Math.round(selectedGain)));
    const plannedDays = mapGainToDays(reqGain);
    const cost = costForGain(progress, reqGain);
    const predictedFinal = clamp(progress + reqGain);

    setIsStarting(true);
    setOptimisticStatus('training');

    // Optimistic store
    writeStoredProgress(staffId, selectedSkill, predictedFinal);

    try {
      if (game && typeof (game as any).startTraining === 'function') {
        const res = (game as any).startTraining(staffId, selectedSkill, plannedDays);
        if (res && typeof (res as any).then === 'function') {
          const awaited = await res;
          if (awaited && awaited.success === false) throw new Error(awaited.message || 'startTraining failed');
        } else if (res && typeof res === 'object' && (res as any).success === false) {
          throw new Error((res as any).message || 'startTraining failed');
        }
        return;
      }

      // Fallback local update
      const comp = gameState?.company ? JSON.parse(JSON.stringify(gameState.company)) : null;
      if (!comp) {
        throw new Error('No company state to update locally');
      }

      if ((comp.capital || 0) < cost) {
        throw new Error('Insufficient capital for training');
      }

      comp.capital = Math.max(0, (comp.capital || 0) - cost);
      const idx = (comp.staff || []).findIndex((s: any) => s.id === staffId);
      if (idx === -1) throw new Error('Staff not found in local company');

      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + plannedDays);
      const trainingEntry: any = {
        skill: selectedSkill,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        totalDays: plannedDays,
        cost,
        requestedGain: reqGain
      };

      comp.staff[idx] = { ...comp.staff[idx], training: trainingEntry, status: 'training' };

      if (typeof createCompany === 'function') {
        createCompany(comp);
      } else {
        try {
          const storageKey = `tm_company_${gameState?.currentUser ?? 'local'}`;
          localStorage.setItem(storageKey, JSON.stringify(comp));
        } catch {
          // ignore
        }
      }
    } catch (e: any) {
      setIsStarting(false);
      setOptimisticStatus(null);
      setError(e?.message ? String(e.message) : 'Failed to start training');
      const stored = parseStoredProgress(staffId, selectedSkill);
      if (stored !== null) setProgress(stored);
      return;
    }
  };

  if (!staff) {
    return (
      <div className="p-3">
        <div className="text-sm text-slate-400">Staff not found</div>
        <div className="flex justify-end pt-3">
          <button onClick={() => onClose()} className="bg-slate-700 hover:bg-slate-600 text-white py-1 px-3 rounded text-sm">
            Close
          </button>
        </div>
      </div>
    );
  }

  const predictedGain = Math.max(3, Math.min(5, Math.round(selectedGain)));
  const predictedFinal = clamp(progress + predictedGain);
  const predictedCost = costForGain(progress, predictedGain);
  const predictedDays = mapGainToDays(predictedGain);
  const sStatus = optimisticStatus ?? (staff.status ?? 'available');
  const currentTraining = staff.training ?? null;

  // Determine "grayed out" state: when starting or when Start Training is disabled
  const startCheck = canStartTraining();
  const isGrayedOut = isStarting || !startCheck.allowed;

  return (
    <div className="p-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
        <div className="md:col-span-2 min-h-[20rem] max-h-[60vh] overflow-auto pr-1">
          <div className="text-xs text-slate-400 mb-1">All Skills (use Training Program)</div>

          {skillsList.map((skill) => {
            const stored = parseStoredProgress(staffId, skill);
            let pct = 0;
            if (stored !== null) {
              pct = stored;
            } else if (Array.isArray(staff?.skills) && staff?.skills.includes(skill)) {
              let hash = 0;
              const seedStr = `${staff.id}:${skill}`;
              for (let i = 0; i < seedStr.length; i++) {
                hash = (hash << 5) - hash + seedStr.charCodeAt(i);
                hash |= 0;
              }
              const seed = Math.abs(hash);
              const initial = 80 + (seed % 21);
              pct = clamp(Math.round(initial));
              writeStoredProgress(staffId, skill, pct);
            } else {
              pct = 0;
            }

            return (
              <div
                key={skill}
                className="flex items-start justify-between gap-3 p-2 bg-slate-900 rounded border border-slate-700 mb-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium text-white truncate">{skill}</div>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">{`Skill: ${skill}`}</div>
                </div>

                <div className="w-44 flex-shrink-0">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <div className="pr-2">Prog</div>
                    <div className="text-white font-medium">{pct}%</div>
                  </div>
                  <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden mb-2">
                    <div className="bg-amber-400 h-full" style={{ width: `${pct}%`, transition: 'width 240ms' }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="md:col-span-1 min-h-[20rem] max-h-[60vh] p-2 bg-slate-900 rounded border border-slate-700 flex flex-col">
          <div className="text-xs text-slate-400">Training Program</div>

          <div className="mt-3">
            <label className="text-xs text-slate-400">Select Skill</label>
            <select
              className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm"
              value={selectedSkill}
              onChange={(e) => setSelectedSkill(e.target.value)}
            >
              {skillsList.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3 border-t border-slate-700 pt-3 text-sm grow overflow-auto">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <div>Current Progress</div>
              <div className="text-white font-medium">{progress}%</div>
            </div>

            <div className="mt-3">
              <div className="text-xs text-slate-400 mb-2">Choose intensity (gain)</div>
              <div className="flex gap-2">
                {[3, 4, 5].map((g) => {
                  const costG = costForGain(progress, g);
                  const days = mapGainToDays(g);
                  return (
                    <button
                      key={g}
                      onClick={() => setSelectedGain(g)}
                      className={`flex-1 px-3 py-2 rounded text-sm ${selectedGain === g ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-200'}`}
                      aria-pressed={selectedGain === g}
                    >
                      +{g}% <div className="text-xs text-slate-300 mt-1">€{costG.toLocaleString()} · {days}d</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
              <div>Predicted Gain</div>
              <div className="text-white font-medium">+{predictedGain} → {predictedFinal}%</div>
            </div>

            <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
              <div>Cost</div>
              <div className="text-white font-medium">€{predictedCost.toLocaleString()}</div>
            </div>

            <div className="text-xs text-slate-500 mt-2">Duration will be assigned automatically ({predictedDays} days). You will be notified of the exact duration after scheduling.</div>

            {currentTraining && (
              <div className="mt-3 p-2 bg-slate-800 rounded border border-slate-700 text-xs text-slate-300">
                <div className="text-xs text-slate-400 mb-1">Current Training</div>
                <div>Skill: <span className="text-white">{currentTraining.skill}</span></div>
                <div>Ends: <span className="text-white">{new Date(currentTraining.endDate).toLocaleString()}</span></div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-3 gap-3">
        <button onClick={() => onClose()} className="bg-slate-700 hover:bg-slate-600 text-white py-1 px-3 rounded text-sm">
          Close
        </button>

        <button
          onClick={async () => {
            await handleStartTraining();
          }}
          disabled={!canStartTraining().allowed || isStarting}
          aria-disabled={!canStartTraining().allowed || isStarting}
          title={!canStartTraining().allowed ? canStartTraining().reason : 'Start Training'}
          className={
            canStartTraining().allowed && !isStarting
              ? 'flex items-center justify-center gap-2 py-1 px-3 rounded text-sm bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'flex items-center justify-center gap-2 py-1 px-3 rounded text-sm bg-slate-700 text-slate-300 cursor-not-allowed'
          }
        >
          <Play className="w-4 h-4" />
          {isStarting ? 'Starting...' : 'Start Training'}
        </button>
      </div>

      {error && <div className="text-red-400 text-sm mt-2">{error}</div>}

      <div className="text-xs text-slate-500 mt-2">
        Current staff status: <span className="text-white ml-1">{sStatus}</span>
      </div>

      {/* Floating bottom-right Close button:
        - Visible only when the modal is in a "grayed out" state (Start disabled or currently starting).
        - Fixed position so it's always reachable even if the modal footer is off-screen or visually dimmed.
      */}
      {isGrayedOut && (
        <button
          onClick={() => onClose()}
          aria-label="Close training modal"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white rounded-full p-3 shadow-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default SkillTrainingModal;
