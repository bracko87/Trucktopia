/**
 * ForceGrantFundsToUser.tsx
 *
 * Non-visual admin helper that permanently grants $500,000 to a specific user
 * in localStorage for testing purposes. Runs once per browser (persistent flag).
 *
 * Responsibilities:
 * - Update 'tm_users' array in localStorage adding or updating the target user.
 * - Update per-user state key 'tm_user_state_<email>' with the company object.
 * - Add a permanent run-flag 'tm_force_grant_done_<email>' so the grant is not re-applied.
 * - Show a brief alert to confirm success (non-blocking).
 *
 * Notes:
 * - This is a direct localStorage helper intended for testing only.
 * - No UI or layout changes are made; the component is mounted as a background helper.
 */

import React, { useEffect } from 'react';

const TARGET_EMAIL = 'glupostimejlza@gmail.com';
const AMOUNT_USD = 500_000;
const RUN_FLAG_KEY = `tm_force_grant_done_${TARGET_EMAIL.toLowerCase()}`;

/**
 * formatCurrency
 * @description Format a number as USD-like string for alert messages.
 * @param n number
 * @returns string
 */
function formatCurrency(n: number) {
  try {
    return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  } catch {
    return String(n);
  }
}

/**
 * applyForceGrant
 * @description Core logic that creates or updates the target user's company and
 * updates localStorage keys. The function is defensive and idempotent.
 */
function applyForceGrant() {
  try {
    // If run flag present, abort (permanent idempotency)
    if (localStorage.getItem(RUN_FLAG_KEY)) {
      console.info('[ForceGrantFundsToUser] Grant already applied (flag present).');
      return;
    }

    // Read existing users array
    const usersRaw = localStorage.getItem('tm_users');
    let users: any[] = [];

    if (usersRaw) {
      try {
        users = JSON.parse(usersRaw);
        if (!Array.isArray(users)) users = [];
      } catch {
        users = [];
      }
    }

    // Case-insensitive match for email
    const emailLower = TARGET_EMAIL.toLowerCase();
    const idx = users.findIndex((u: any) => typeof u.email === 'string' && u.email.toLowerCase() === emailLower);

    let nowIso = new Date().toISOString();

    if (idx === -1) {
      // Create minimal user with company
      const newUser = {
        email: TARGET_EMAIL,
        username: TARGET_EMAIL.split('@')[0],
        password: 'changeme', // placeholder
        createdAt: nowIso,
        company: {
          id: `company-${Date.now()}`,
          name: `${TARGET_EMAIL.split('@')[0]}'s Company`,
          capital: AMOUNT_USD,
          reputation: 0,
          trucks: [],
          trailers: [],
          staff: [],
          contracts: [],
          activeJobs: [],
          hub: { id: 'main-hub', name: 'Main Hub', country: 'Unknown' }
        }
      };
      users.push(newUser);
      localStorage.setItem('tm_users', JSON.stringify(users));

      // Per-user state
      const stateKey = `tm_user_state_${emailLower}`;
      const stateObj = { isAuthenticated: false, company: newUser.company, sidebarCollapsed: false, generatedAt: nowIso };
      localStorage.setItem(stateKey, JSON.stringify(stateObj));

      // Persist run flag
      localStorage.setItem(RUN_FLAG_KEY, nowIso);

      try { alert(`Granted $${formatCurrency(AMOUNT_USD)} to ${TARGET_EMAIL} (new user created).`); } catch {}
      console.info('[ForceGrantFundsToUser] Created user and granted funds', newUser);
      return;
    }

    // Update existing user company
    const userObj = users[idx];
    userObj.company = userObj.company || {};
    const prevCapital = Number(userObj.company.capital || 0);
    const newCapital = prevCapital + AMOUNT_USD;
    userObj.company.capital = newCapital;
    // Ensure other company fields exist
    userObj.company.reputation = typeof userObj.company.reputation === 'number' ? userObj.company.reputation : 0;
    if (!userObj.company.id) userObj.company.id = `company-${Date.now()}`;
    users[idx] = userObj;

    localStorage.setItem('tm_users', JSON.stringify(users));

    // Update per-user state
    const stateKey = `tm_user_state_${emailLower}`;
    const stateRaw = localStorage.getItem(stateKey);
    let stateObj: any = stateRaw ? JSON.parse(stateRaw) : { isAuthenticated: false, company: null, sidebarCollapsed: false };
    stateObj.company = { ...(stateObj.company || {}), ...(userObj.company || {}) };
    stateObj.lastGrantAppliedAt = nowIso;
    localStorage.setItem(stateKey, JSON.stringify(stateObj));

    // Persist run flag (permanent)
    localStorage.setItem(RUN_FLAG_KEY, nowIso);

    try { alert(`Granted $${formatCurrency(AMOUNT_USD)} to ${TARGET_EMAIL}. New capital: $${formatCurrency(newCapital)}.`); } catch {}
    console.info('[ForceGrantFundsToUser] Successfully granted funds', { email: TARGET_EMAIL, prevCapital, newCapital });
  } catch (err) {
    console.error('[ForceGrantFundsToUser] Error applying grant', err);
  }
}

/**
 * ForceGrantFundsToUser
 * @description React component that runs applyForceGrant on mount (non-visual).
 */
const ForceGrantFundsToUser: React.FC = () => {
  useEffect(() => {
    // Run immediately on mount (defensive small timeout so other mounts complete)
    const t = window.setTimeout(() => {
      applyForceGrant();
    }, 50);
    return () => {
      window.clearTimeout(t);
    };
  }, []);

  return null;
};

export default ForceGrantFundsToUser;