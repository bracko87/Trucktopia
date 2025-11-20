/**
 * staffConditionEngine.ts
 *
 * Engine that controls daily condition updates (fit & happiness) for staff in
 * manager, dispatcher and mechanic roles.
 *
 * Responsibilities:
 * - Apply slow daily decay for fit (0.3% per day) and happiness (0.2% per day) for manager/dispatcher/mechanic.
 * - Skip decay while staff is on vacation; vacation recovers fit.
 * - Detect salary increases and promotions to partially recover happiness.
 * - When fit < 60% mark skillCardsDisabled to indicate skill cards provide no bonuses.
 * - When fit < 30% place staff on long sick leave (7..30 days) which recovers fit during absence.
 * - Persist changes to localStorage (tm_users and tm_admin_state).
 *
 * Notes:
 * - The engine is designed to be started by a starter component which calls `startStaffConditionEngine`.
 * - This file uses only browser localStorage and does not depend on any external package.
 */

/**
 * Engine options
 * @property tickIntervalMs tick interval in ms (simulated day). Default 60000.
 * @property debug enable console logging for debug.
 */
export interface StaffConditionEngineOptions {
  tickIntervalMs?: number;
  debug?: boolean;
}

/**
 * startStaffConditionEngine
 * @description Start the staff condition engine; returns a stop function to clear interval.
 * @param options StaffConditionEngineOptions
 */
export function startStaffConditionEngine(options: StaffConditionEngineOptions = {}) {
  const tickIntervalMs = options.tickIntervalMs ?? 60_000;
  const debug = !!options.debug;

  let timerId: ReturnType<typeof setInterval> | null = null;

  /**
   * Helpers for localStorage read/write
   */
  const readUsers = (): Array<any> => {
    try {
      const raw = localStorage.getItem('tm_users');
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      if (debug) console.warn('[StaffCondEngine] readUsers parse failed', err);
      return [];
    }
  };

  const saveUsers = (users: Array<any>) => {
    try {
      localStorage.setItem('tm_users', JSON.stringify(users));
    } catch (err) {
      console.error('[StaffCondEngine] saveUsers failed', err);
    }
  };

  const readAdminState = (): any | null => {
    try {
      const raw = localStorage.getItem('tm_admin_state');
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      if (debug) console.warn('[StaffCondEngine] readAdminState parse failed', err);
      return null;
    }
  };

  const saveAdminState = (state: any) => {
    try {
      localStorage.setItem('tm_admin_state', JSON.stringify(state));
    } catch (err) {
      console.error('[StaffCondEngine] saveAdminState failed', err);
    }
  };

  /**
   * Per-user meta snapshot key - used to detect salary/role changes between ticks.
   * Structure:
   * {
   *   salaries: { [staffId]: number },
   *   roles: { [staffId]: string }
   * }
   */
  const metaKeyFor = (email: string) => `tm_staff_prev_meta_${email}`;

  const readPrevMeta = (email: string) => {
    try {
      const raw = localStorage.getItem(metaKeyFor(email));
      return raw ? JSON.parse(raw) : { salaries: {}, roles: {} };
    } catch {
      return { salaries: {}, roles: {} };
    }
  };

  const writePrevMeta = (email: string, meta: any) => {
    try {
      localStorage.setItem(metaKeyFor(email), JSON.stringify(meta));
    } catch {
      // ignore
    }
  };

  /**
   * Normalize company arrays
   */
  const normalizeCompany = (company: any) => {
    if (!company) return company;
    company.trucks = Array.isArray(company.trucks) ? company.trucks : [];
    company.trailers = Array.isArray(company.trailers) ? company.trailers : [];
    company.staff = Array.isArray(company.staff) ? company.staff : [];
    company.contracts = Array.isArray(company.contracts) ? company.contracts : [];
    company.activeJobs = Array.isArray(company.activeJobs) ? company.activeJobs : [];
    return company;
  };

  /**
   * Ensure minimal stats present for staff entries we care about
   */
  const ensureStaffStats = (company: any) => {
    if (!company || !Array.isArray(company.staff)) return false;
    let mutated = false;
    company.staff.forEach((s: any) => {
      // Only for manager/dispatcher/mechanic roles we ensure these stats (but safe to ensure for all)
      if (typeof s.happiness !== 'number') { s.happiness = 100; mutated = true; }
      if (typeof s.fit !== 'number') { s.fit = 100; mutated = true; }
      if (!('onVacationUntil' in s)) { s.onVacationUntil = null; mutated = true; }
      if (!('skillCardsDisabled' in s)) { s.skillCardsDisabled = false; mutated = true; }
    });
    return mutated;
  };

  /**
   * Tick function applied every interval (represents one simulated day)
   */
  const tick = () => {
    try {
      // Constants per day (as requested)
      const FIT_DECAY_PER_DAY = 0.3; // 0.3% fit per day
      const HAPPINESS_DECAY_PER_DAY = 0.2; // 0.2% happiness per day
      const FIT_RECOVERY_VACATION = 5.0; // per day on vacation (recovery)
      const HAPPINESS_RECOVERY_PROMOTION = 8.0; // flat % on promotion
      const HAPPINESS_RECOVERY_SALARY_MAX = 5.0; // cap from salary increase
      const WANT_SICK_LEAVE_THRESHOLD = 30; // <30 -> long sick leave
      const SKILLCARD_DISABLE_THRESHOLD = 60; // <60 -> disable skill cards

      // Regular users
      const users = readUsers();
      let usersChanged = false;

      users.forEach((user) => {
        if (!user) return;
        const company = normalizeCompany(user.company);
        if (!company) return;

        if (ensureStaffStats(company)) usersChanged = true;

        const prevMeta = readPrevMeta(user.email ?? 'unknown_user');

        // Iterate staff
        (company.staff || []).forEach((s: any) => {
          if (!s || !s.role) return;
          const role = String(s.role).toLowerCase();

          // Only apply this engine to manager, mechanic, dispatcher
          if (!['manager', 'mechanic', 'dispatcher'].includes(role)) {
            // still update snapshot meta for salary/role tracking
            prevMeta.salaries = prevMeta.salaries || {};
            prevMeta.roles = prevMeta.roles || {};
            prevMeta.salaries[s.id] = typeof s.salary === 'number' ? s.salary : prevMeta.salaries[s.id] ?? 0;
            prevMeta.roles[s.id] = s.role;
            return;
          }

          const now = Date.now();
          const onVacation = s.onVacationUntil ? (new Date(s.onVacationUntil).getTime() > now) : false;

          // Apply decay only when not on vacation
          if (!onVacation) {
            const prevFit = typeof s.fit === 'number' ? s.fit : 100;
            const prevHap = typeof s.happiness === 'number' ? s.happiness : 100;

            const nextFit = Math.max(0, Number((prevFit - FIT_DECAY_PER_DAY).toFixed(2)));
            const nextHap = Math.max(0, Number((prevHap - HAPPINESS_DECAY_PER_DAY).toFixed(2)));

            if (nextFit !== prevFit) { s.fit = nextFit; usersChanged = true; }
            if (nextHap !== prevHap) { s.happiness = nextHap; usersChanged = true; }
          } else {
            // Recover fit on vacation
            const prevFit = typeof s.fit === 'number' ? s.fit : 100;
            const nextFit = Math.min(100, Number((prevFit + FIT_RECOVERY_VACATION).toFixed(2)));
            if (nextFit !== prevFit) { s.fit = nextFit; usersChanged = true; }
            // Happiness recovery on vacation is not automatic (left unchanged)
          }

          // Detect salary increases (compare to previous snapshot)
          prevMeta.salaries = prevMeta.salaries || {};
          const prevSalary = Number(prevMeta.salaries[s.id] ?? (typeof s.salary === 'number' ? s.salary : 0));
          const currSalary = typeof s.salary === 'number' ? s.salary : prevSalary;

          if (currSalary > prevSalary && prevSalary > 0) {
            const percentIncrease = (currSalary - prevSalary) / prevSalary * 100; // percent
            // Apply partial recovery: small portion of percent increase, capped
            const recovery = Math.min(HAPPINESS_RECOVERY_SALARY_MAX, Number((percentIncrease * 0.02).toFixed(2))); // 2% of percent increase, capped
            if (recovery > 0) {
              const prevH = typeof s.happiness === 'number' ? s.happiness : 100;
              const nextH = Math.min(100, Number((prevH + recovery).toFixed(2)));
              if (nextH !== prevH) { s.happiness = nextH; usersChanged = true; if (debug) console.info(`[StaffCondEngine] salary recovery ${recovery}% applied to ${s.name} (${s.id})`); }
            }
          }

          // Detect role change (promotion) via prevMeta.roles
          prevMeta.roles = prevMeta.roles || {};
          const prevRole = prevMeta.roles[s.id];
          const currRole = s.role;
          if (prevRole && prevRole !== currRole) {
            // Consider this a promotion; apply partial happiness recovery
            const prevH = typeof s.happiness === 'number' ? s.happiness : 100;
            const nextH = Math.min(100, Number((prevH + HAPPINESS_RECOVERY_PROMOTION).toFixed(2)));
            if (nextH !== prevH) { s.happiness = nextH; usersChanged = true; if (debug) console.info(`[StaffCondEngine] promotion recovery ${HAPPINESS_RECOVERY_PROMOTION}% applied to ${s.name} (${s.id})`); }
          }

          // Skill card disabling when fit < SKILLCARD_DISABLE_THRESHOLD
          const wasDisabled = !!s.skillCardsDisabled;
          if (s.fit < SKILLCARD_DISABLE_THRESHOLD) {
            if (!wasDisabled) { s.skillCardsDisabled = true; usersChanged = true; if (debug) console.info(`[StaffCondEngine] skill cards disabled for ${s.name} (${s.id}) fit=${s.fit}`); }
          } else {
            if (wasDisabled) { s.skillCardsDisabled = false; usersChanged = true; if (debug) console.info(`[StaffCondEngine] skill cards re-enabled for ${s.name} (${s.id}) fit=${s.fit}`); }
          }

          // Sick leave trigger when fit < WANT_SICK_LEAVE_THRESHOLD
          if (s.fit < WANT_SICK_LEAVE_THRESHOLD) {
            // If not already on vacation or on vacation expires soon, schedule a sick leave for 7..30 days
            const alreadyOnVacation = s.onVacationUntil ? (new Date(s.onVacationUntil).getTime() > now) : false;
            if (!alreadyOnVacation) {
              const days = 7 + Math.floor(Math.random() * 24); // 7..30
              const until = new Date();
              until.setDate(until.getDate() + days);
              s.onVacationUntil = until.toISOString();
              // During this absence fit will recover via normal vacation recovery above
              usersChanged = true;
              if (debug) console.warn(`[StaffCondEngine] ${s.name} (${s.id}) sent to sick leave for ${days} days due to low fit (${s.fit})`);
            }
          }

          // Update snapshot values for next tick
          prevMeta.salaries[s.id] = currSalary;
          prevMeta.roles[s.id] = currRole;
        }); // end staff loop

        // Persist modified company back into user if changed
        user.company = company;

        // Write back snapshot meta for this user
        try {
          writePrevMeta(user.email ?? 'unknown_user', prevMeta);
        } catch {
          // ignore
        }
      }); // end users loop

      if (usersChanged) {
        saveUsers(users);
        if (debug) console.debug('[StaffCondEngine] users updated and saved');
      }

      // Admin state too
      const adminState = readAdminState();
      if (adminState && adminState.company) {
        const company = normalizeCompany(adminState.company);
        let adminChanged = false;
        if (ensureStaffStats(company)) adminChanged = true;

        // Snapshot key for admin uses 'admin' as email
        const prevMeta = readPrevMeta('tm_admin');

        (company.staff || []).forEach((s: any) => {
          if (!s || !s.role) return;
          const role = String(s.role).toLowerCase();
          if (!['manager', 'mechanic', 'dispatcher'].includes(role)) {
            prevMeta.salaries = prevMeta.salaries || {};
            prevMeta.roles = prevMeta.roles || {};
            prevMeta.salaries[s.id] = typeof s.salary === 'number' ? s.salary : prevMeta.salaries[s.id] ?? 0;
            prevMeta.roles[s.id] = s.role;
            return;
          }

          const now = Date.now();
          const onVacation = s.onVacationUntil ? (new Date(s.onVacationUntil).getTime() > now) : false;

          if (!onVacation) {
            const prevFit = typeof s.fit === 'number' ? s.fit : 100;
            const prevHap = typeof s.happiness === 'number' ? s.happiness : 100;
            const nextFit = Math.max(0, Number((prevFit - FIT_DECAY_PER_DAY).toFixed(2)));
            const nextHap = Math.max(0, Number((prevHap - HAPPINESS_DECAY_PER_DAY).toFixed(2)));
            if (nextFit !== prevFit) { s.fit = nextFit; adminChanged = true; }
            if (nextHap !== prevHap) { s.happiness = nextHap; adminChanged = true; }
          } else {
            const prevFit = typeof s.fit === 'number' ? s.fit : 100;
            const nextFit = Math.min(100, Number((prevFit + FIT_RECOVERY_VACATION).toFixed(2)));
            if (nextFit !== prevFit) { s.fit = nextFit; adminChanged = true; }
          }

          // Salary change detection
          prevMeta.salaries = prevMeta.salaries || {};
          const prevSalary = Number(prevMeta.salaries[s.id] ?? (typeof s.salary === 'number' ? s.salary : 0));
          const currSalary = typeof s.salary === 'number' ? s.salary : prevSalary;

          if (currSalary > prevSalary && prevSalary > 0) {
            const percentIncrease = (currSalary - prevSalary) / prevSalary * 100;
            const recovery = Math.min(HAPPINESS_RECOVERY_SALARY_MAX, Number((percentIncrease * 0.02).toFixed(2)));
            if (recovery > 0) {
              const prevH = typeof s.happiness === 'number' ? s.happiness : 100;
              const nextH = Math.min(100, Number((prevH + recovery).toFixed(2)));
              if (nextH !== prevH) { s.happiness = nextH; adminChanged = true; if (debug) console.info(`[StaffCondEngine] admin salary recovery ${recovery}% for ${s.name} (${s.id})`); }
            }
          }

          // Role change detection
          prevMeta.roles = prevMeta.roles || {};
          const prevRole = prevMeta.roles[s.id];
          const currRole = s.role;
          if (prevRole && prevRole !== currRole) {
            const prevH = typeof s.happiness === 'number' ? s.happiness : 100;
            const nextH = Math.min(100, Number((prevH + HAPPINESS_RECOVERY_PROMOTION).toFixed(2)));
            if (nextH !== prevH) { s.happiness = nextH; adminChanged = true; if (debug) console.info(`[StaffCondEngine] admin promotion recovery ${HAPPINESS_RECOVERY_PROMOTION}% for ${s.name} (${s.id})`); }
          }

          // Skill card disabling
          const wasDisabled = !!s.skillCardsDisabled;
          if (s.fit < SKILLCARD_DISABLE_THRESHOLD) {
            if (!wasDisabled) { s.skillCardsDisabled = true; adminChanged = true; if (debug) console.info(`[StaffCondEngine] admin skill cards disabled for ${s.name} (${s.id})`); }
          } else {
            if (wasDisabled) { s.skillCardsDisabled = false; adminChanged = true; if (debug) console.info(`[StaffCondEngine] admin skill cards re-enabled for ${s.name} (${s.id})`); }
          }

          // Sick leave trigger
          if (s.fit < WANT_SICK_LEAVE_THRESHOLD) {
            const alreadyOnVacation = s.onVacationUntil ? (new Date(s.onVacationUntil).getTime() > now) : false;
            if (!alreadyOnVacation) {
              const days = 7 + Math.floor(Math.random() * 24); // 7..30
              const until = new Date(); until.setDate(until.getDate() + days);
              s.onVacationUntil = until.toISOString();
              adminChanged = true;
              if (debug) console.warn(`[StaffCondEngine] admin ${s.name} (${s.id}) sent to sick leave for ${days} days due to low fit (${s.fit})`);
            }
          }

          // Update snapshot
          prevMeta.salaries[s.id] = currSalary;
          prevMeta.roles[s.id] = currRole;
        });

        adminState.company = company;
        if (adminChanged) {
          // Ensure we persist admin changes
          saveAdminState(adminState);
          if (debug) console.debug('[StaffCondEngine] admin state updated and saved');
        }

        // Persist admin snapshot meta
        try { writePrevMeta('tm_admin', prevMeta); } catch {}
      }
    } catch (err) {
      console.error('[StaffCondEngine] tick error', err);
    }
  };

  // Start engine
  if (!timerId) {
    if (debug) console.info(`[StaffCondEngine] starting tick every ${tickIntervalMs}ms`);
    tick(); // immediate tick for quick reconciliation
    timerId = setInterval(tick, tickIntervalMs);
  }

  // Return stop function
  const stop = () => {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
      if (debug) console.info('[StaffCondEngine] stopped');
    }
  };

  return stop;
}

export default startStaffConditionEngine;