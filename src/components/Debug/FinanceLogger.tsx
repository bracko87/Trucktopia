/**
 * FinanceLogger.tsx
 *
 * Client-only debug helper that:
 * - Exposes window.__dumpFinances() to inspect relevant local/session storage keys
 * - Monitors localStorage.setItem and storage events to surface persistence activity
 * - Logs the tm_admin_state / tm_user_state_* / tm_users keys to the console
 *
 * This file is imported for side-effects from App.tsx. It is intentionally defensive
 * so it does not crash in non-browser envs.
 */

import React, { useEffect } from 'react';

/**
 * safeParse
 * @description Parse JSON safely, returns null on failure
 * @param s json string
 */
function safeParse(s: string | null) {
  if (s === null) return null;
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

/**
 * collectFinanceSnapshot
 * @description Gather finance-related local/session storage for inspection
 */
function collectFinanceSnapshot() {
  try {
    const snapshot: any = {
      tm_current_user: sessionStorage.getItem('tm_current_user'),
      tm_admin_state: safeParse(localStorage.getItem('tm_admin_state')),
      tm_users: safeParse(localStorage.getItem('tm_users')),
      user_states: {},
      finance_keys: []
    };

    // collect tm_user_state_* keys
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.startsWith('tm_user_state_')) {
        snapshot.user_states[k] = safeParse(localStorage.getItem(k));
      }
      if (k.startsWith('tm_skill_progress_') || k.startsWith('tm_mechanic_skills_')) {
        snapshot.finance_keys.push(k);
      }
    }

    // last-known in-memory game state if present (some debug helpers set this)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win: any = window;
    if (win && win.__GAME_STATE) snapshot.__GAME_STATE = win.__GAME_STATE;

    return snapshot;
  } catch (err) {
    return { error: String(err) };
  }
}

/**
 * installPatches
 * @description Monkey-patch localStorage.setItem to log persistence actions in this window.
 */
function installPatches() {
  if (typeof window === 'undefined' || !('localStorage' in window)) return () => {};
  // @ts-ignore
  const origSet = window.localStorage.setItem.bind(window.localStorage);
  try {
    // avoid double-patch
    // @ts-ignore
    if (window.__finance_logger_patched) return () => {};
  } catch {}
  // @ts-ignore
  window.__finance_logger_patched = true;

  // @ts-ignore
  window.localStorage.setItem = function patchedSetItem(key: string, value: string) {
    try {
      // Log only keys of interest to avoid noisy output
      if (key.startsWith('tm_user_state_') || key === 'tm_admin_state' || key === 'tm_users') {
        // eslint-disable-next-line no-console
        console.info(`[FinanceLogger] localStorage.setItem -> ${key}`, safeParse(value));
      }
    } catch (e) {
      // ignore
    }
    return origSet(key, value);
  };

  const storageListener = (ev: StorageEvent) => {
    try {
      if (!ev.key) return;
      if (ev.key.startsWith('tm_user_state_') || ev.key === 'tm_admin_state' || ev.key === 'tm_users') {
        // eslint-disable-next-line no-console
        console.info(`[FinanceLogger] storage event: ${ev.key}`, { oldValue: safeParse(ev.oldValue), newValue: safeParse(ev.newValue) });
      }
    } catch {}
  };

  window.addEventListener('storage', storageListener);

  return () => {
    try {
      // restore original
      // @ts-ignore
      window.localStorage.setItem = origSet;
      window.removeEventListener('storage', storageListener);
      // @ts-ignore
      window.__finance_logger_patched = false;
    } catch {}
  };
}

/**
 * exposeDump
 * @description Expose window.__dumpFinances which returns a snapshot and prints to console.
 */
function exposeDump() {
  // @ts-ignore
  if (typeof window === 'undefined') return;
  // @ts-ignore
  if (window.__dumpFinances && typeof window.__dumpFinances === 'function') return;
  // @ts-ignore
  window.__dumpFinances = function __dumpFinances() {
    const snap = collectFinanceSnapshot();
    // eslint-disable-next-line no-console
    console.groupCollapsed('[FinanceLogger] dumpFinances');
    // eslint-disable-next-line no-console
    console.log(snap);
    // eslint-disable-next-line no-console
    console.groupEnd();
    return snap;
  };
}

/**
 * FinanceLogger
 * @description React component that installs debugging helpers on mount (side-effect import).
 */
const FinanceLogger: React.FC = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Install patches and expose dump helper
    const cleanup = installPatches();
    exposeDump();

    // initial log
    // eslint-disable-next-line no-console
    console.info('[FinanceLogger] mounted — use window.__dumpFinances() to inspect local state. Listening for tm_user_state_*/tm_admin_state changes.');

    return () => {
      try {
        if (typeof cleanup === 'function') cleanup();
      } catch {}
    };
  }, []);

  return null;
};

export default FinanceLogger;