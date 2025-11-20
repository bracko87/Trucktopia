/**
 * DispatcherSkillPersister.tsx
 *
 * File-level:
 * Background component that ensures dispatchers have authoritative skillCards assigned
 * and persisted. Runs on mount and whenever company.staff changes.
 *
 * Purpose:
 * - Seed up to 3 stable skillCards for staff with role === 'dispatcher'
 * - Use canonical dispatcher skill list from skillsDatabase when available
 * - Persist changes via createCompany (preferred) or localStorage fallback
 *
 * Notes:
 * - Non-visual component: returns null
 * - Does not change UI layout or styles
 */

import React, { useEffect, useMemo } from 'react';
import { useGame } from '../../contexts/GameContext';
import { getSkillsByCategory } from '../../utils/skillsDatabase';

/**
 * clamp
 * @description Clamp a number to the inclusive range [a, b]
 * @param v number to clamp
 * @param a minimum
 * @param b maximum
 */
function clamp(v: number, a = 0, b = 100): number {
  return Math.max(a, Math.min(b, v));
}

/**
 * deterministicSeedForSkill
 * @description Produce a stable seeded integer in 0..100 for staffId+skillName
 * @param staffId staff id
 * @param skill skill name
 */
function deterministicSeedForSkill(staffId: string, skill: string): number {
  let hash = 0;
  const seedStr = `${staffId}:${skill}`;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const seed = Math.abs(hash);
  return clamp(seed % 101, 0, 100);
}

/**
 * selectTopNSkillsBySeed
 * @description Deterministically select up to n skills by ranking their seeded value
 * @param staffId staff id
 * @param skills list of skill names
 * @param n number to pick
 */
function selectTopNSkillsBySeed(staffId: string, skills: string[], n = 3): string[] {
  if (!Array.isArray(skills) || skills.length === 0) return [];
  const mapped = skills.map((s) => ({ skill: s, seed: deterministicSeedForSkill(staffId, s) }));
  mapped.sort((a, b) => b.seed - a.seed || a.skill.localeCompare(b.skill));
  return mapped.slice(0, n).map((m) => m.skill);
}

/**
 * DispatcherSkillPersister
 * @description Ensure dispatchers have authoritative skillCards persisted.
 *
 * Behavior:
 * - Runs on mount and whenever company.staff fingerprint changes.
 * - Uses getSkillsByCategory('dispatcher') as canonical skill set if available.
 * - Falls back to staff.skills or the first available skills from canonical lists.
 */
const DispatcherSkillPersister: React.FC = () => {
  const game = useGame();
  const { gameState, createCompany } = game || ({} as any);

  /**
   * staffFingerprint
   * @description Simple fingerprint to detect staff changes
   */
  const staffFingerprint = useMemo(() => {
    try {
      const arr = (gameState?.company?.staff || []).map((s: any) => ({
        id: s.id,
        role: s.role,
        skills: Array.isArray(s.skills) ? s.skills.slice().sort() : [],
        skillCards: Array.isArray(s.skillCards) ? s.skillCards.slice().sort() : [],
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

      // Obtain canonical dispatcher skills from skills database
      let dispatcherMeta = [] as any[];
      try {
        const meta = getSkillsByCategory('dispatcher');
        if (Array.isArray(meta)) dispatcherMeta = meta;
      } catch {
        dispatcherMeta = [];
      }

      const canonicalDispatcherSkills = dispatcherMeta.length > 0 ? dispatcherMeta.map((m) => m.name) : [];

      // Build a modified company copy only if changes are required
      const compCopy = JSON.parse(JSON.stringify(company));
      let changed = false;

      compCopy.staff = (compCopy.staff || []).map((s: any) => {
        if (!s || s.role !== 'dispatcher') return s;

        const sid = String(s.id || '');
        // Already has skillCards and non-empty -> keep as-is
        if (Array.isArray(s.skillCards) && s.skillCards.length > 0) {
          return s;
        }

        // Determine candidate skills in order of preference:
        // 1. canonicalDispatcherSkills (if available)
        // 2. s.skills (if present)
        // 3. fallback: pick some stable words derived from staff id
        let candidates: string[] = [];

        if (canonicalDispatcherSkills.length > 0) {
          candidates = canonicalDispatcherSkills.slice();
        } else if (Array.isArray(s.skills) && s.skills.length > 0) {
          candidates = s.skills.slice();
        } else {
          // Fallback deterministic pseudo-skills derived from hashed staff id
          const fallbackPool = ['Communication', 'Customer Service', 'Route Optimization', 'Problem Solving', 'Real-time Tracking', 'Documentation', 'Regulatory Compliance', 'Emergency Response', 'Coordination', 'Load Optimization'];
          // rotate/pick based on seed so it's stable per staff id
          const start = deterministicSeedForSkill(sid, 'fallback') % fallbackPool.length;
          for (let i = 0; i < fallbackPool.length; i++) {
            candidates.push(fallbackPool[(start + i) % fallbackPool.length]);
          }
        }

        const top3 = selectTopNSkillsBySeed(sid, candidates, 3);

        if (!Array.isArray(s.skillCards) || top3.join('|') !== (s.skillCards || []).join('|')) {
          s.skillCards = top3.slice();
          changed = true;
        }

        return s;
      });

      if (!changed) return;

      // Persist: prefer createCompany if available, else localStorage fallback
      if (typeof createCompany === 'function') {
        try {
          createCompany({ ...gameState.company, ...compCopy });
        } catch (e) {
          // createCompany may throw; fall back to localStorage
          try {
            const storageKey = `tm_company_${gameState?.currentUser ?? 'local'}`;
            localStorage.setItem(storageKey, JSON.stringify({ ...gameState.company, ...compCopy }));
          } catch {
            // ignore storage errors
          }
        }
      } else {
        try {
          const storageKey = `tm_company_${gameState?.currentUser ?? 'local'}`;
          localStorage.setItem(storageKey, JSON.stringify({ ...gameState.company, ...compCopy }));
        } catch {
          // ignore storage errors
        }
      }
    } catch (e) {
      // keep UI stable
      // eslint-disable-next-line no-console
      console.error('[DispatcherSkillPersister] error', e);
    }
    // Re-run when staff list fingerprint changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffFingerprint]);

  return null;
};

export default DispatcherSkillPersister;