/**
 * CompanyPersistenceSync.tsx
 *
 * File-level:
 * Background helper that ensures company changes are persisted reliably into localStorage.
 *
 * Purpose:
 * - Watch the in-memory game state (company + current user) and persist changes to:
 *    - tm_user_state_<email>
 *    - tm_users (update or append)
 * - This ensures UI-side mutators (hire/fire/promote) that update the context will be saved
 *   even if some storage abstraction fails to update the expected keys.
 *
 * Behavior:
 * - Non-visual component mounted once. Debounces writes briefly to avoid tight loops.
 * - Defensive, idempotent, and logs failures to console for debugging.
 */

import React, { useEffect, useRef } from 'react';
import { useGame } from '../../contexts/GameContext';

/**
 * writeUserStateToLocalStorage
 * @description Persist the per-user game state to tm_user_state_<email>
 * and update the tm_users array to include or update the user's company snapshot.
 * @param email user's email (string)
 * @param company company object to persist
 * @param sidebarCollapsed optional UI state
 */
function writeUserStateToLocalStorage(email: string, company: any, sidebarCollapsed = false) {
  if (!email) {
    console.warn('[CompanyPersistenceSync] no email provided; skipping persistence');
    return;
  }

  const emailKey = String(email).toLowerCase();
  const userKey = `tm_user_state_${emailKey}`;

  try {
    const state = {
      isAuthenticated: true,
      company,
      sidebarCollapsed,
      savedAt: new Date().toISOString()
    };

    // Persist tm_user_state_<email>
    try {
      localStorage.setItem(userKey, JSON.stringify(state));
      // eslint-disable-next-line no-console
      console.debug('[CompanyPersistenceSync] saved', userKey);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[CompanyPersistenceSync] failed to persist', userKey, err);
    }

    // Ensure tm_users array exists and contains/updates this user's company snapshot
    try {
      const usersRaw = localStorage.getItem('tm_users') || '[]';
      let users: any[] = [];
      try {
        users = JSON.parse(usersRaw) || [];
      } catch {
        users = [];
      }

      const idx = users.findIndex(u => (u.email || '').toLowerCase() === emailKey);
      if (idx === -1) {
        // Append minimal user entry
        const minimal = {
          email,
          username: (email.split?.('@')?.[0]) || email,
          createdAt: new Date().toISOString(),
          company
        };
        users.push(minimal);
        // eslint-disable-next-line no-console
        console.debug('[CompanyPersistenceSync] appended new user to tm_users for', email);
      } else {
        users[idx] = {
          ...users[idx],
          company,
          updatedAt: new Date().toISOString()
        };
        // eslint-disable-next-line no-console
        console.debug('[CompanyPersistenceSync] updated tm_users entry for', email);
      }

      localStorage.setItem('tm_users', JSON.stringify(users));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[CompanyPersistenceSync] failed to update tm_users', err);
    }
  } catch (outerErr) {
    // eslint-disable-next-line no-console
    console.error('[CompanyPersistenceSync] unexpected error', outerErr);
  }
}

/**
 * CompanyPersistenceSync
 * @description Background React component that syncs the in-memory company state to localStorage.
 *
 * Rationale:
 * - Some flows previously failed to persist (e.g. fired staff removed in-memory but not on disk).
 * - By observing gameState.company changes and writing them reliably, we guarantee persistence.
 */
const CompanyPersistenceSync: React.FC = () => {
  const { gameState } = useGame();
  const lastSerializedRef = useRef<string | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    // Debounced effect to avoid thrashing localStorage on many small changes
    if (!gameState) return;

    const company = gameState.company ?? null;
    const currentUser = (gameState.currentUser ?? '').toString();

    // Compute a stable serialization for change detection
    const serialized = JSON.stringify(company ?? null);

    // If nothing changed, skip
    if (serialized === lastSerializedRef.current) return;

    lastSerializedRef.current = serialized;

    // Debounce write by 200ms in case callers do multiple updates quickly
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Schedule persistence
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    debounceRef.current = window.setTimeout(() => {
      try {
        if (company && currentUser) {
          writeUserStateToLocalStorage(currentUser, company, !!gameState.sidebarCollapsed);
        } else if (company && !currentUser) {
          // If we don't have currentUser string inside state, try reading from tm_current_user key
          const sessionUser = localStorage.getItem('tm_current_user') || localStorage.getItem('current_user') || '';
          if (sessionUser) {
            writeUserStateToLocalStorage(sessionUser, company, !!gameState.sidebarCollapsed);
          } else {
            // eslint-disable-next-line no-console
            console.warn('[CompanyPersistenceSync] no recognizable current user to persist to (company changed but currentUser missing)');
          }
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[CompanyPersistenceSync] persistence attempt failed', e);
      } finally {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
          debounceRef.current = null;
        }
      }
    }, 200);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [gameState]);

  // No UI
  return null;
};

export default CompanyPersistenceSync;
