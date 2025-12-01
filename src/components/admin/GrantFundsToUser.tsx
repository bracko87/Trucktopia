/**
 * GrantFundsToUser.tsx
 *
 * Small non-visual admin helper that grants a one-time capital boost to a specific user.
 *
 * Responsibilities:
 * - Locate the target user record in localStorage ('tm_users') and the per-user state
 *   key ('tm_user_state_<email>').
 * - Add a fixed amount (AMOUNT_EUR) to company.capital and persist both places.
 * - If the user or company does not exist, create a minimal company object and persist it.
 * - Run only once per browser session (guarded by a localStorage flag).
 *
 * Notes:
 * - This component intentionally writes directly to localStorage because user records
 *   are managed there by the existing GameContext/userStorage helpers which are not
 *   exported. This avoids modifying server logic or current app flows.
 * - All changes are limited to persistence and do not change the UI layout or pages.
 */

import React, { useEffect } from 'react';

const TARGET_EMAIL = 'glupostimejlza@gmail.com';
const AMOUNT_EUR = 500_000;
const RUN_FLAG_KEY = `tm_grant_funds_done_${TARGET_EMAIL}`;

/**
 * formatCurrency
 * @description Small helper to format euros for user-friendly alerts
 * @param n number
 * @returns formatted string
 */
const formatCurrency = (n: number) => {
  try {
    return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  } catch {
    return String(n);
  }
};

/**
 * applyGrant
 * @description Core logic that updates localStorage user records and per-user state.
 * - Creates user+company if missing.
 * - Adds AMOUNT_EUR to existing company.capital.
 */
const applyGrant = () => {
  try {
    // Don't run twice
    if (localStorage.getItem(RUN_FLAG_KEY)) {
      console.info('[GrantFundsToUser] Skip: already applied in this browser session.');
      return;
    }

    const usersRaw = localStorage.getItem('tm_users');
    const users = usersRaw ? JSON.parse(usersRaw) : [];

    const targetIndex = users.findIndex(
      (u: any) => typeof u.email === 'string' && u.email.toLowerCase() === TARGET_EMAIL.toLowerCase()
    );

    let userObj: any = null;

    if (targetIndex === -1) {
      // Create a minimal user record with a company if none exists
      userObj = {
        email: TARGET_EMAIL,
        password: 'changeme', // placeholder; do not use for authentication
        username: TARGET_EMAIL.split('@')[0],
        createdAt: new Date().toISOString(),
        company: {
          id: `company-${Date.now()}`,
          name: `${TARGET_EMAIL.split('@')[0]}'s Company`,
          capital: AMOUNT_EUR,
          reputation: 0,
          trucks: [],
          trailers: [],
          staff: [],
          contracts: [],
          activeJobs: [],
          hub: { id: 'main-hub', name: 'Main Hub', country: 'Unknown' }
        }
      };
      users.push(userObj);
      localStorage.setItem('tm_users', JSON.stringify(users));
      localStorage.setItem(`tm_user_state_${TARGET_EMAIL.toLowerCase()}`, JSON.stringify({
        isAuthenticated: false,
        company: userObj.company,
        sidebarCollapsed: false
      }));
      localStorage.setItem(RUN_FLAG_KEY, '1');
      // Notify admin/developer (non-intrusive alert)
      try {
        // eslint-disable-next-line no-alert
        alert(`Granted €${formatCurrency(AMOUNT_EUR)} to ${TARGET_EMAIL} (new user created).`);
      } catch {
        // ignore
      }
      console.info('[GrantFundsToUser] Created new user and granted funds', userObj);
      return;
    }

    // Update existing user
    userObj = users[targetIndex];
    userObj.company = userObj.company || {};
    const prevCapital = Number(userObj.company.capital || 0);
    const newCapital = prevCapital + AMOUNT_EUR;
    userObj.company.capital = newCapital;
    // Ensure reputation remains numeric and set to 0 (existing app expects 0)
    userObj.company.reputation = typeof userObj.company.reputation === 'number' ? userObj.company.reputation : 0;

    // Persist users array
    users[targetIndex] = userObj;
    localStorage.setItem('tm_users', JSON.stringify(users));

    // Update per-user state key if present, or create it
    const stateKey = `tm_user_state_${TARGET_EMAIL.toLowerCase()}`;
    const stateRaw = localStorage.getItem(stateKey);
    let stateObj: any = stateRaw ? JSON.parse(stateRaw) : { isAuthenticated: false, company: null, sidebarCollapsed: false };
    stateObj.company = { ...(stateObj.company || {}), ...(userObj.company || {}) };
    localStorage.setItem(stateKey, JSON.stringify(stateObj));

    // Mark run flag so helper won't reapply repeatedly
    localStorage.setItem(RUN_FLAG_KEY, new Date().toISOString());

    // Notify admin/developer (non-intrusive alert)
    try {
      // eslint-disable-next-line no-alert
      alert(`Granted €${formatCurrency(AMOUNT_EUR)} to ${TARGET_EMAIL}. New capital: €${formatCurrency(newCapital)}`);
    } catch {
      // ignore
    }

    console.info('[GrantFundsToUser] Successfully granted funds', { email: TARGET_EMAIL, prevCapital, newCapital });
  } catch (err) {
    console.error('[GrantFundsToUser] Error applying grant', err);
  }
};

/**
 * GrantFundsToUser
 * @description React component that runs the grant once on mount.
 * Mounted as a non-visual helper in App.tsx.
 */
const GrantFundsToUser: React.FC = () => {
  useEffect(() => {
    // Defer to next tick so other mount-time helpers run first
    const t = window.setTimeout(() => {
      applyGrant();
    }, 200);
    return () => {
      window.clearTimeout(t);
    };
  }, []);

  return null;
};

export default GrantFundsToUser;