/**
 * ManagerSkillAssigner.tsx
 *
 * Background helper that ensures manager-role staff have a clean and deterministic
 * set of manager skills. This implementation is conservative:
 * - If the staff was hired carrying manager skillCards or persisted manager progress,
 *   the staff will be considered authoritative and the assigner will NOT overwrite them.
 *
 * Responsibilities:
 * - For each manager staff entry:
 *   - If managerSkillsLocked === true, skip (preserve hire-time data).
 *   - If there is persisted manager progress under hireUid or id, preserve it and skip.
 *   - Otherwise deterministically assign up to 3 manager skills, seed visible progress
 *     and persist it under both staff.id and hireUid (if present).
 */

import React, { useEffect } from 'react';
import { useGame } from '../../contexts/GameContext';
import { writeSkillProgress, readSkillProgress } from '../../utils/skillPersistence';
import { MANAGER_SKILLS } from '../../utils/roleSkills';

/**
 * Known driver-related skill names that must not remain on manager profiles.
 * If any of these are detected on a manager staff entry we will treat the record
 * as contaminated and clear it before assigning manager skills.
 */
const DRIVER_SKILLS = new Set([
  'Long Haul',
  'ADR Certified',
  'Route Planning',
  'Refrigerated Transport',
  'Oversized Loads',
  'International Routes',
  'Night Driving',
  'Heavy Load Handling',
  'City Navigation',
  'Mountain Roads',
  'Forest Roads',
  'Eco Driving',
  'Multi-Axle Experience',
  'Tanker Transport',
  'Livestock Transport'
]);

/**
 * simpleHash
 * @description Small deterministic 32-bit hash for a string.
 * @param str - input string
 * @returns number hash
 */
const simpleHash = (str: string): number => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
};

/**
 * pickManagerSkills
 * @description Deterministically picks up to 3 unique manager skills based on uid.
 * @param uid - staff unique id
 * @returns string[] selected skills
 */
const pickManagerSkills = (uid: string): string[] => {
  const seed = simpleHash(uid || 'fallback');
  const skills: string[] = [];
  let idxSeed = seed;
  while (skills.length < 3 && skills.length < MANAGER_SKILLS.length) {
    const idx = idxSeed % MANAGER_SKILLS.length;
    const candidate = MANAGER_SKILLS[idx];
    if (!skills.includes(candidate)) skills.push(candidate);
    // advance pseudo-random sequence
    idxSeed = ((idxSeed >>> 0) * 1103515245 + 12345) >>> 0;
  }
  return skills;
};

/**
 * seedProgressForSkill
 * @description Create a visible percent (85..94) for skill progress so UI will show it clearly.
 *              Deterministic based on uid+skill to be stable across runs.
 * @param uid - staff unique id
 * @param skill - skill name
 * @returns number percent
 */
const seedProgressForSkill = (uid: string, skill: string): number => {
  const h = simpleHash(uid + '::' + skill);
  return 85 + (h % 10); // 85..94
};

/**
 * ManagerSkillAssigner
 * @description React background component that assigns manager skills to manager-role staff
 *              and ensures no driver skills remain. Persists seeded progress using the
 *              canonical writer so it survives hiring and reloads.
 */
const ManagerSkillAssigner: React.FC = () => {
  const game = useGame();

  useEffect(() => {
    try {
      const company = game.gameState?.company;
      if (!company || !Array.isArray(company.staff)) return;

      const staffArray = company.staff as any[];
      let changed = false;

      for (let i = 0; i < staffArray.length; i++) {
        const s = staffArray[i];
        if (!s) continue;
        if (String(s.role).toLowerCase() !== 'manager') continue;

        // If this staff was explicitly locked at hire time, skip to preserve hire-time data.
        if (s.managerSkillsLocked) {
          s.managerSkillsAssigned = true;
          continue;
        }

        const uid = s._uid || s.id || `manager-${i}`;
        const staffId = s.id ?? uid;
        const hireUid = s.hireUid ?? null;

        // Role-specific preservation checks:
        //  - If staff.skillCards contains a manager skill -> preserve
        //  - If persisted manager skill progress exists under hireUid or id -> preserve
        const hasManagerCard = Array.isArray(s.skillCards) && s.skillCards.some((c: string) => MANAGER_SKILLS.includes(c));

        let persistedManagerProgress = false;
        for (const ms of MANAGER_SKILLS) {
          try {
            const vHire = hireUid ? readSkillProgress(hireUid, ms) : null;
            const vId = readSkillProgress(staffId, ms);
            if ((vHire !== null && typeof vHire === 'number') || (vId !== null && typeof vId === 'number')) {
              persistedManagerProgress = true;
              break;
            }
          } catch {
            // ignore per-skill read errors
          }
        }

        if (hasManagerCard || persistedManagerProgress) {
          s.managerSkillsAssigned = true;
          s.managerSkillsLocked = true; // enforce lock if persisted data exists
          continue;
        }

        // Detect contamination or missing assignment:
        const hasDriverSkills = Array.isArray(s.skills) && s.skills.some((sk: string) => DRIVER_SKILLS.has(sk));
        const noSkills = !Array.isArray(s.skills) || s.skills.length === 0;
        const needsAssign = !s.managerSkillsAssigned || hasDriverSkills || noSkills;

        if (!needsAssign) continue;

        // Clear any leftover role-specific skill fields (idempotent)
        s.skills = [];
        s.skillCards = [];
        s.skillsProgress = {};

        // Select manager skills deterministically and assign
        const selected = pickManagerSkills(String(uid));
        s.skills = selected.slice();

        // Seed skillsProgress with visible values (so UI will show progress)
        s.skillsProgress = s.skillsProgress || {};
        selected.forEach((skillName) => {
          const pct = seedProgressForSkill(String(uid), skillName);
          s.skillsProgress[skillName] = pct;

          // Persist each seeded skill so it is visible after hire/reload (persist under id + hireUid)
          try {
            writeSkillProgress(staffId, skillName, pct);
            if (hireUid) writeSkillProgress(hireUid, skillName, pct);
          } catch {
            // ignore write errors
          }
        });

        // Add high-progress skills into skillCards for compatibility with components that use it
        s.skillCards = Array.isArray(s.skillCards) ? s.skillCards : [];
        selected.forEach((skillName) => {
          if (s.skillsProgress[skillName] >= 90 && !s.skillCards.includes(skillName)) {
            s.skillCards.push(skillName);
          }
        });

        // Mark as assigned so we don't re-run repeatedly
        s.managerSkillsAssigned = true;

        changed = true;
      }

      if (changed) {
        const updatedCompany = { ...company, staff: staffArray };
        try {
          // Persist only when changes were made
          game.createCompany(updatedCompany);
          // Helpful dev-time signal
          // eslint-disable-next-line no-console
          console.info('[ManagerSkillAssigner] Assigned manager skills to staff (deterministic).');
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('[ManagerSkillAssigner] createCompany failed', err);
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[ManagerSkillAssigner] runtime error', err);
    }
  }, [game.gameState?.company, game.createCompany]);

  return null;
};

export default ManagerSkillAssigner;