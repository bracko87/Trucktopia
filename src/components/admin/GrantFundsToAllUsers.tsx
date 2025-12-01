/**
 * GrantFundsToAllUsers.tsx
 *
 * Non-visual admin helper that grants a fixed amount to every user stored
 * in localStorage (tm_users) and updates per-user state keys (tm_user_state_<email>).
 *
 * Responsibilities:
 * - Iterate tm_users (array) and add AMOUNT_USD to each user's company.capital.
 * - Update tm_user_state_<lowercased-email> objects if present, or create them if missing.
 * - Persist a permanent run flag (tm_grant_all_done) to avoid reapplying the grant multiple times.
 * - Show a brief alert summarizing how many users were updated.
 *
 * Note:
 * - This operates only on the current browser/profile's localStorage.
 * - This intentionally does not change any app layout or visual components.
 */

import React, { useEffect } from 'react';

/**
 * AMOUNT_USD
 * @description Amount to add to each user's company capital.
 */
const AMOUNT_USD = 500_000;

/**
 * safeParseJSON
 * @description Parse JSON defensively returning fallback if parse fails.
 * @param raw string | null
 * @param fallback any
 */
function safeParseJSON<T = any>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * normalizeEmailKey
 * @description Lowercases email and removes spaces for use in localStorage keys.
 * @param email string
 */
function normalizeEmailKey(email: string) {
  return String(email).trim().toLowerCase();
}

/**
 * applyGrantToAllUsers
 * @description Core logic that updates tm_users and per-user state keys in localStorage.
 */
function applyGrantToAllUsers() {
  try {
    // Permanent guard so this does not run repeatedly.
    const runFlag = localStorage.getItem('tm_grant_all_done');
    if (runFlag) {
      console.info('[GrantFundsToAllUsers] Grant already applied (flag present).');
      return { applied: false, reason: 'already_applied' };
    }

    const usersRaw = localStorage.getItem('tm_users');
    const users = safeParseJSON<any[]>(usersRaw, []);

    if (!Array.isArray(users) || users.length === 0) {
      console.info('[GrantFundsToAllUsers] No users found in tm_users');
      // We still set flag to avoid repeated empty attempts if desired; leave unset for safety.
      return { applied: false, reason: 'no_users' };
    }

    let updatedCount = 0;

    const nowIso = new Date().toISOString();

    // Update each user in tm_users
    const updatedUsers = users.map((user) => {
      const u = { ...(user ?? {}) };

      // Ensure company object
      u.company = u.company ?? {};
      const prevCapital = Number(u.company.capital ?? 0);
      const newCapital = prevCapital + AMOUNT_USD;
      u.company.capital = newCapital;

      // Ensure minimal company fields if missing (non-destructive)
      if (!u.company.id) u.company.id = u.company.id ?? `company-${Date.now()}`;
      if (!u.company.name) u.company.name = u.company.name ?? `${String(u.email ?? 'user').split('@')[0]}'s Company`;

      updatedCount += 1;
      return u;
    });

    // Persist tm_users back
    localStorage.setItem('tm_users', JSON.stringify(updatedUsers));

    // Update per-user state keys
    updatedUsers.forEach((u) => {
      const emailKey = normalizeEmailKey(String(u.email ?? 'unknown'));
      const stateKey = `tm_user_state_${emailKey}`;
      const stateRaw = localStorage.getItem(stateKey);
      const stateObj = safeParseJSON<any>(stateRaw, { isAuthenticated: false, company: null, sidebarCollapsed: false });

      // Merge and update company
      stateObj.company = { ...(stateObj.company ?? {}), ...(u.company ?? {}) };
      stateObj.lastGrantAppliedAt = nowIso;

      try {
        localStorage.setItem(stateKey, JSON.stringify(stateObj));
      } catch (e) {
        console.warn(`[GrantFundsToAllUsers] Failed to write state for ${emailKey}`, e);
      }
    });

    // Persist run flag (permanent)
    localStorage.setItem('tm_grant_all_done', nowIso);

    // Also store an audit key listing updated emails for easier debugging
    try {
      const emails = updatedUsers.map((u) => normalizeEmailKey(String(u.email ?? 'unknown')));
      localStorage.setItem('tm_grant_all_audit', JSON.stringify({ appliedAt: nowIso, emails }));
    } catch {}

    // Notify
    try {
      alert(`Applied $${AMOUNT_USD.toLocaleString()} to ${updatedCount} local users in this browser/profile.`);
    } catch {}

    console.info('[GrantFundsToAllUsers] Grant applied to', updatedCount, 'users');
    return { applied: true, count: updatedCount };
  } catch (err) {
    console.error('[GrantFundsToAllUsers] Unexpected error applying grant', err);
    return { applied: false, reason: 'exception', error: String(err) };
  }
}

/**
 * GrantFundsToAllUsers
 * @description React non-visual component that runs the grant on mount.
 */
const GrantFundsToAllUsers: React.FC = () => {
  useEffect(() => {
    // Run shortly after mount so it does not interfere with other initializers
    const t = window.setTimeout(() => {
      applyGrantToAllUsers();
    }, 50);

    return () => window.clearTimeout(t);
  }, []);

  return null;
};

export default GrantFundsToAllUsers;