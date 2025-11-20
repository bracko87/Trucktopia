/**
 * ClearPromotedSkills.tsx
 *
 * File-level:
 * Background component that ensures when staff are promoted to roles that
 * require removing previous role-specific skill chips, the old fields are cleared.
 *
 * Responsibilities:
 * - Clear skills/skillCards/skillsProgress for staff promoted to 'dispatcher' (existing behavior).
 * - Clear prior role skills for staff promoted to 'manager' when they have NOT yet been
 *   processed (managerSkillsAssigned !== true). This prevents driver/mechanic skill
 *   leftovers being visible on manager profiles.
 * - Persist updates with createCompany only when modifications occur.
 *
 * Notes:
 * - Non-visual component: returns null
 * - Runs on mount and whenever the company.staff fingerprint changes.
 */
import React, { useEffect, useMemo } from 'react';
import { useGame } from '../../contexts/GameContext';

/**
 * staffFingerprint
 * @description Build a small fingerprint of relevant staff fields so effect runs only on relevant changes
 * @param staffArray company.staff array
 * @returns string fingerprint
 */
function buildStaffFingerprint(staffArray: any[] | undefined): string {
  try {
    const arr = (staffArray || []).map((s: any) => ({
      id: s?.id,
      role: s?.role,
      skillsCount: Array.isArray(s?.skills) ? s.skills.length : 0,
      skillCardsCount: Array.isArray(s?.skillCards) ? s.skillCards.length : 0,
      skillsProgressCount: s?.skillsProgress ? Object.keys(s.skillsProgress).length : 0,
      managerSkillsAssigned: !!s?.managerSkillsAssigned,
      promoted: !!s?.promoted
    }));
    return JSON.stringify(arr);
  } catch {
    return '';
  }
}

/**
 * ClearPromotedSkills
 *
 * @description React component that watches the current company staff list
 * and ensures:
 * - staff with role === 'dispatcher' have their `skills` and `skillCards` cleared
 * - staff with role === 'manager' and without managerSkillsAssigned have previous role
 *   skill fields cleared so that manager skills are the only ones present after assignment
 */
const ClearPromotedSkills: React.FC = () => {
  const { gameState, createCompany } = useGame();

  const staffFingerprint = useMemo(() => buildStaffFingerprint(gameState?.company?.staff), [gameState?.company?.staff]);

  useEffect(() => {
    if (!gameState?.company) return;

    try {
      // Clone company to avoid mutating context state directly
      const companyCopy = JSON.parse(JSON.stringify(gameState.company));
      if (!Array.isArray(companyCopy.staff) || companyCopy.staff.length === 0) return;

      let changed = false;

      companyCopy.staff = companyCopy.staff.map((s: any) => {
        if (!s || typeof s !== 'object') return s;

        const role = String(s.role || '').toLowerCase();

        // Existing behavior: clear promoted dispatchers' skills so old chips disappear
        if (role === 'dispatcher') {
          const hasSkills = Array.isArray(s.skills) && s.skills.length > 0;
          const hasSkillCards = Array.isArray(s.skillCards) && s.skillCards.length > 0;
          const hasProgress = s.skillsProgress && Object.keys(s.skillsProgress).length > 0;
          if (hasSkills || hasSkillCards || hasProgress) {
            s.skills = [];
            s.skillCards = [];
            s.skillsProgress = {};
            changed = true;
          }
        }

        // New behavior: when a staff is manager and managerSkillsAssigned is not set,
        // remove previous role-specific skill data so manager assignment results are clean.
        if (role === 'manager') {
          // Only clear if managerSkillsAssigned is not true (newly promoted / not yet processed)
          if (!s.managerSkillsAssigned) {
            const hasSkills = Array.isArray(s.skills) && s.skills.length > 0;
            const hasSkillCards = Array.isArray(s.skillCards) && s.skillCards.length > 0;
            const hasProgress = s.skillsProgress && Object.keys(s.skillsProgress).length > 0;
            if (hasSkills || hasSkillCards || hasProgress) {
              s.skills = [];
              s.skillCards = [];
              s.skillsProgress = {};
              changed = true;
            }
          }
        }

        return s;
      });

      if (changed) {
        // Persist using createCompany API to keep behavior consistent with rest of app
        try {
          createCompany(companyCopy);
        } catch (e) {
          // If createCompany unexpectedly fails, fall back to localStorage best-effort
          try {
            const storageKey = `tm_company_${gameState?.currentUser ?? 'local'}`;
            localStorage.setItem(storageKey, JSON.stringify(companyCopy));
          } catch {
            // ignore storage errors
          }
        }
      }
    } catch (err) {
      // Keep UI stable; log for debugging
      // eslint-disable-next-line no-console
      console.warn('[ClearPromotedSkills] error while clearing promoted staff skills', err);
    }
    // Run whenever company id or relevant staff fingerprint changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.company?.id, staffFingerprint]);

  return null;
};

export default ClearPromotedSkills;