/**
 * useMigratedUsers.ts
 *
 * Small utility for migrating-login integration:
 * - Exposes a function `needsPasswordReset(email)` and a React hook `useNeedsPasswordReset(email)`
 *   which read the migration map from localStorage (key: tm_migrated_users) produced by the
 *   MigratedUsersPanel / scripts/mark-migrated-users.ts workflow.
 *
 * Responsibility:
 * - Provide a single place to query the migration status during authentication.
 */

/**
 * MigratedEntriesMap
 * @description The compact shape stored in localStorage under key tm_migrated_users
 */
export interface MigratedEntriesMap {
  installedAt?: string;
  entries: Record<string, { needsPasswordReset: boolean; id?: string; name?: string }>;
}

const LOCALSTORAGE_KEY = 'tm_migrated_users';

/**
 * readMigratedMap
 * @description Read and parse migration map from localStorage; return null on parse error.
 */
export function readMigratedMap(): MigratedEntriesMap | null {
  try {
    const raw = localStorage.getItem(LOCALSTORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MigratedEntriesMap;
    if (!parsed || typeof parsed !== 'object' || !parsed.entries) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * needsPasswordReset
 * @description Check whether the given email (case-insensitive) is present and requires a password reset.
 * @param email string
 */
export function needsPasswordReset(email?: string | null): boolean {
  if (!email) return false;
  const m = readMigratedMap();
  if (!m) return false;
  const key = email.trim().toLowerCase();
  const found = m.entries[key];
  return !!found && !!found.needsPasswordReset;
}

/**
 * useNeedsPasswordReset
 * @description React hook wrapper for needsPasswordReset. It listens to storage events so changes
 *              in another tab are reflected.
 * @param email string | null
 */
import { useEffect, useState } from 'react';
export function useNeedsPasswordReset(email?: string | null) {
  const [state, setState] = useState<boolean>(() => needsPasswordReset(email));

  useEffect(() => {
    const handler = () => setState(needsPasswordReset(email));
    // storage event for other tabs
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === LOCALSTORAGE_KEY) handler();
    };
    window.addEventListener('storage', onStorage);
    // also poll/refresh when email changes
    handler();
    return () => {
      window.removeEventListener('storage', onStorage);
    };
  }, [email]);

  return state;
}