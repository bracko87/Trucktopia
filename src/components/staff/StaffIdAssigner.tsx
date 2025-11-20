/**
 * StaffIdAssigner.tsx
 *
 * Background helper component that ensures every staff member of the active company
 * has a stable, unique hidden identifier (_uid). This prevents staff objects being
 * mixed or accidentally overwritten when data is merged or migrated.
 *
 * Responsibilities:
 * - For each staff in the active company, ensure _uid exists and is unique.
 * - If collisions are detected, reassign minimal new ids to colliding entries (very rare).
 * - Persist updated company using createCompany() from GameContext only when changes were made.
 *
 * Notes:
 * - This component is non-visual. It runs quietly on mount and whenever the company changes.
 * - Uses crypto.randomUUID() when available; falls back to a safe pseudo-unique generator.
 */

import React, { useEffect } from 'react';
import { useGame } from '../../contexts/GameContext';

/**
 * generateUid
 * @description Return a cryptographically-unique id when possible, fallback otherwise.
 * @returns string unique id
 */
const generateUid = (): string => {
  try {
    if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
      return (crypto as any).randomUUID();
    }
  } catch {
    // ignore
  }
  // fallback deterministic-ish id
  return `uid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
};

/**
 * StaffIdAssigner
 * @description React background component that assigns unique _uid fields to each staff object.
 */
const StaffIdAssigner: React.FC = () => {
  const { gameState, createCompany } = useGame();

  useEffect(() => {
    try {
      const company = gameState.company;
      if (!company || !Array.isArray(company.staff)) return;

      const staff = company.staff as any[];
      let changed = false;

      // Build current map of _uid => occurrences
      const uidMap = new Map<string, any[]>();
      staff.forEach(s => {
        const uid = s?._uid;
        if (!uid) return;
        const arr = uidMap.get(uid) || [];
        arr.push(s);
        uidMap.set(uid, arr);
      });

      // Ensure each staff has a _uid
      for (let i = 0; i < staff.length; i++) {
        const s = staff[i];
        if (!s) continue;

        if (!s._uid || typeof s._uid !== 'string') {
          s._uid = generateUid();
          changed = true;
        }
      }

      // Rebuild uidMap after adding missing ids
      uidMap.clear();
      staff.forEach(s => {
        const uid = s?._uid;
        if (!uid) return;
        const arr = uidMap.get(uid) || [];
        arr.push(s);
        uidMap.set(uid, arr);
      });

      // Detect collisions (same _uid used by multiple staff) and fix by assigning new ids
      uidMap.forEach((arr, uid) => {
        if (arr.length > 1) {
          // Leave the first as-is and reassign others
          for (let j = 1; j < arr.length; j++) {
            const s = arr[j];
            s._uid = generateUid();
            changed = true;
          }
        }
      });

      if (changed) {
        // Persist only when modifications happen
        const updatedCompany = {
          ...company,
          staff: staff
        };
        // createCompany is expected to persist updated company in GameContext
        try {
          createCompany(updatedCompany);
          // no UI side-effects; this runs silently
        } catch (err) {
          // Fall back to console warning if createCompany is not available for some reason
          // eslint-disable-next-line no-console
          console.warn('[StaffIdAssigner] createCompany error', err);
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[StaffIdAssigner] error', err);
    }
    // Run whenever the current company object reference changes
  }, [gameState.company, createCompany]);

  return null;
};

export default StaffIdAssigner;