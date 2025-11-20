/**
 * MechanicSkillAssigner.tsx
 *
 * File-level:
 * Ensures every staff member with role === 'mechanic' has the canonical mechanic
 * skills assigned and that per-skill progress values exist (seeded deterministically).
 *
 * Responsibilities:
 * - Replace mechanic.staff.skills with the canonical mechanic skills (from skillsDatabase)
 *   so all mechanics show identical mechanic skill lists.
 * - Assign up to 3 skill cards per mechanic (stable deterministic selection).
 * - Seed and persist per-skill progress for each mechanic:
 *     - Skills chosen as skill cards receive a deterministic 80..100% seed (or metadata pct).
 *     - Other canonical skills are set to 0% (and persisted) so UI shows them as not trained.
 * - Persist updates using createCompany when available, otherwise write to localStorage.
 *
 * Behavior:
 * - Runs on mount and whenever company.staff changes (stable fingerprint).
 * - Non-mechanic staff are not modified.
 */

import React, { useEffect, useMemo } from 'react';
import { useGame } from '../../contexts/GameContext';
import { getSkillsByCategory } from '../../utils/skillsDatabase';
import { writeSkillProgress, readSkillProgress } from '../../utils/skillPersistence';

/**
 * Build localStorage key for staff+skill progress
 * @param staffId staff id
 * @param skillName skill name
 */
/**
 * Note: persistence helpers replaced with canonical readSkillProgress / writeSkillProgress.
 * They support both staff.id and hireUid usage below.
 */

/**
 * deterministicSeedForSkill
 * Produces a stable seeded percent in 80..100 for a staffId+skill
 * @param staffId
 * @param skill
 */
function deterministicSeedForSkill(staffId: string, skill: string): number {
  let hash = 0;
  const seedStr = `${staffId}:${skill}`;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const seed = Math.abs(hash);
  return 80 + (seed % 21); // 80..100
}

/**
 * selectTopNSkillsBySeed
 * Deterministically pick up to n skills from a list using deterministicSeedForSkill(staffId, skill).
 * Returns array of selected skill names (stable per staff).
 * @param staffId
 * @param skills
 * @param n
 */
function selectTopNSkillsBySeed(staffId: string, skills: string[], n = 3): string[] {
  if (!Array.isArray(skills) || skills.length === 0) return [];
  const mapped = skills.map((s) => ({ skill: s, seed: deterministicSeedForSkill(staffId, s) }));
  mapped.sort((a, b) => b.seed - a.seed || a.skill.localeCompare(b.skill));
  return mapped.slice(0, n).map((m) => m.skill);
}

/**
 * MechanicSkillAssigner
 *
 * Runs on mount and whenever the company.staff fingerprint changes.
 * Ensures mechanics have canonical mechanic skills and seeded progress values.
 */
const MechanicSkillAssigner: React.FC = () => {
  const game = useGame();
  const { gameState, createCompany } = game || ({} as any);

  /**
   * Fingerprint relevant staff fields to re-run when staff list changes.
   */
  const staffFingerprint = useMemo(() => {
    try {
      const arr = (gameState?.company?.staff || []).map((s: any) => ({
        id: s.id,
        role: s.role,
        skills: Array.isArray(s.skills) ? s.skills.slice().sort() : [],
        skillsProgressKeys: s.skillsProgress ? Object.keys(s.skillsProgress).sort() : [],
        skillCards: Array.isArray(s.skillCards) ? s.skillCards.slice().sort() : []
      }));
      return JSON.stringify(arr);
    } catch {
      return '';
    }
  }, [gameState?.company?.staff]);

  useEffect(() => {
    try {
      const company = gameState?.company;
      if (!company || !Array.isArray(company.staff)) return;

      // Canonical mechanic skill metadata
      const mechanicMeta = getSkillsByCategory('mechanic'); // Skill[]
      const canonicalSkills = mechanicMeta.map((m) => m.name);

      // Deep clone company to avoid mutating gameState directly
      const compCopy = JSON.parse(JSON.stringify(company));
      let changed = false;
      const changedStaffNames: string[] = [];

      compCopy.staff = (compCopy.staff || []).map((s: any) => {
        if (!s || s.role !== 'mechanic') return s;

        // Ensure canonical skills are present and ordered
        const prevSkills = Array.isArray(s.skills) ? s.skills.slice() : [];
        const skillsEqual =
          prevSkills.length === canonicalSkills.length &&
          prevSkills.every((x: string, i: number) => x === canonicalSkills[i]);
        if (!skillsEqual) {
          s.skills = canonicalSkills.slice();
          changed = true;
        } else {
          s.skills = canonicalSkills.slice();
        }

        // Determine up to 3 skill cards deterministically (stable per staff)
        const top3 = selectTopNSkillsBySeed(s.id, canonicalSkills, 3);

        // Build skillsProgress: only top3 get non-zero (metadata seed or deterministic),
        // others are 0.
        const currentProgress: Record<string, number> =
          s.skillsProgress && typeof s.skillsProgress === 'object' ? { ...s.skillsProgress } : {};

        // First, prefer existing localStorage values for the skill (authoritative UI).
        const newProgress: Record<string, number> = {};
        canonicalSkills.forEach((skillName) => {
          const stored = readStoredProgress(s.id, skillName);
          if (stored !== null) {
            // If stored exists, use it but ensure non-top3 stored >0 will be clamped to 0
            if (top3.includes(skillName)) {
              newProgress[skillName] = stored;
            } else {
              // Non-selected skills kept at 0% by policy; overwrite stored non-zero to 0
              if (stored !== 0) {
                // Persist 0 to reflect policy
                writeStoredProgress(s.id, skillName, 0);
              }
              newProgress[skillName] = 0;
            }
            return;
          }

          // No stored value -> check company progress value
          if (typeof currentProgress[skillName] === 'number') {
            if (top3.includes(skillName)) {
              // Mirror into localStorage and keep value
              writeStoredProgress(s.id, skillName, currentProgress[skillName]);
              newProgress[skillName] = currentProgress[skillName];
            } else {
              // non-selected -> set to 0 and mirror
              writeStoredProgress(s.id, skillName, 0);
              newProgress[skillName] = 0;
            }
            return;
          }

          // No stored and no company value -> use metadata pct if present for top3,
          // otherwise deterministic seed for top3, and 0 for others.
          const meta = mechanicMeta.find((m) => m.name === skillName) as any | undefined;
          const metaPct =
            meta && (typeof meta.initialPct === 'number'
              ? meta.initialPct
              : typeof meta.defaultPct === 'number'
              ? meta.defaultPct
              : typeof meta.pct === 'number'
              ? meta.pct
              : null);

          if (top3.includes(skillName)) {
            const pct = metaPct !== null ? clamp(Math.round(Number(metaPct))) : deterministicSeedForSkill(s.id, skillName);
            writeStoredProgress(s.id, skillName, pct);
            newProgress[skillName] = pct;
            changed = true;
          } else {
            // Non-selected skill -> keep at 0%
            writeStoredProgress(s.id, skillName, 0);
            newProgress[skillName] = 0;
            changed = true;
          }
        });

        s.skillsProgress = newProgress;

        // Set skillCards to top3 (max 3)
        const prevCards = Array.isArray(s.skillCards) ? s.skillCards.slice() : [];
        const cardsEqual =
          prevCards.length === top3.length && prevCards.every((c: string, i: number) => c === top3[i]);
        if (!cardsEqual) {
          s.skillCards = top3.slice();
          changed = true;
        } else {
          s.skillCards = top3.slice();
        }

        changedStaffNames.push(s.name ?? s.id);
        return s;
      });

      if (!changed) return;

      // Persist via createCompany if available, else fallback to localStorage
      if (typeof createCompany === 'function') {
        createCompany({ ...gameState.company, ...compCopy });
      } else {
        try {
          const storageKey = `tm_company_${gameState?.currentUser ?? 'local'}`;
          const store = { ...gameState.company, ...compCopy };
          localStorage.setItem(storageKey, JSON.stringify(store));
        } catch {
          // ignore
        }
      }

      // Dev-only toast to confirm assigner ran (small, transient, non-intrusive)
      try {
        const toastId = `tm-mechanic-assigner-toast`;
        if (!document.getElementById(toastId)) {
          const div = document.createElement('div');
          div.id = toastId;
          div.textContent = `Mechanic skills assigned to ${changedStaffNames.length} staff`;
          div.style.position = 'fixed';
          div.style.right = '16px';
          div.style.bottom = '16px';
          div.style.zIndex = '9999';
          div.style.padding = '8px 12px';
          div.style.borderRadius = '8px';
          div.style.background = 'rgba(16, 185, 129, 0.95)'; // emerald-500 tint
          div.style.color = 'white';
          div.style.fontSize = '13px';
          div.style.boxShadow = '0 6px 18px rgba(2,6,23,0.6)';
          div.style.pointerEvents = 'none';
          document.body.appendChild(div);
          setTimeout(() => {
            try {
              div.style.transition = 'opacity 300ms';
              div.style.opacity = '0';
            } catch {}
          }, 2700);
          setTimeout(() => {
            try {
              if (div && div.parentNode) div.parentNode.removeChild(div);
            } catch {}
          }, 3000);
        }
      } catch {
        // ignore toast failures
      }
    } catch (e) {
      // keep UI stable
      // eslint-disable-next-line no-console
      console.error('MechanicSkillAssigner error', e);
    }
    // Re-run when staff list fingerprint changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffFingerprint]);

  return null;
};

export default MechanicSkillAssigner;
