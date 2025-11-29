/**
 * Driver Engine
 *
 * Responsible for:
 * - Initializing driver company stats when missing (tours, kilometers, happiness, fit, askedToLeave, onVacationUntil)
 * - Running a periodic tick that simulates "days" and:
 *   - Slowly decays Happiness
 *   - Adjusts Fit (decreases while assigned, recovers while idle, recovers fast on vacation)
 *   - Flags drivers who want to leave when Happiness < 50%
 *   - Applies penalties (chance-based accidents/delays) when Happiness or Fit are very low
 *
 * This module operates directly on localStorage keys used across the app:
 * - 'tm_users' (array of registered users with company attached)
 * - 'tm_admin_state' (admin company state)
 *
 * Note: Tick interval defaults to 60_000 ms (1 minute) representing 1 simulated day.
 * You can pass a different interval via options for testing.
 */

/**
 * Engine options
 */
export interface DriverEngineOptions {
  /**
   * Tick interval in milliseconds. Default 60_000 (1 minute).
   */
  tickIntervalMs?: number;
  /**
   * Whether to log engine activity to console for debugging.
   */
  debug?: boolean;
}

/**
 * Start the driver engine.
 *
 * @param options DriverEngineOptions
 * @returns stop function to clear timers
 */
export function startDriverEngine(options: DriverEngineOptions = {}) {
  const tickIntervalMs = options.tickIntervalMs ?? 60_000; // default 1 minute => 1 day in simulation
  const debug = !!options.debug;

  let timerId: ReturnType<typeof setInterval> | null = null;

  /**
   * Read tm_users from localStorage safely
   */
  const readUsers = (): Array<any> => {
    try {
      const raw = localStorage.getItem('tm_users');
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      console.warn('DriverEngine: failed to parse tm_users', err);
      return [];
    }
  };

  /**
   * Save users to localStorage
   */
  const saveUsers = (users: Array<any>) => {
    try {
      localStorage.setItem('tm_users', JSON.stringify(users));
    } catch (err) {
      console.error('DriverEngine: failed to save tm_users', err);
    }
  };

  /**
   * Read admin state (tm_admin_state)
   */
  const readAdminState = (): any | null => {
    try {
      const raw = localStorage.getItem('tm_admin_state');
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.warn('DriverEngine: failed to parse tm_admin_state', err);
      return null;
    }
  };

  /**
   * Save admin state
   */
  const saveAdminState = (state: any) => {
    try {
      localStorage.setItem('tm_admin_state', JSON.stringify(state));
    } catch (err) {
      console.error('DriverEngine: failed to save tm_admin_state', err);
    }
  };

  /**
   * Normalize a company object ensuring arrays exist
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
   * Initialize missing driver stats for a company staff list
   */
  const ensureDriverStats = (company: any) => {
    if (!company || !Array.isArray(company.staff)) return false;
    let mutated = false;
    company.staff.forEach((s: any) => {
      // Initialize if missing
      if (typeof s.tours !== 'number') {
        s.tours = 0;
        mutated = true;
      }
      if (typeof s.kilometers !== 'number') {
        s.kilometers = 0;
        mutated = true;
      }
      if (typeof s.happiness !== 'number') {
        s.happiness = 100; // percent
        mutated = true;
      }
      if (typeof s.fit !== 'number') {
        s.fit = 100; // percent
        mutated = true;
      }
      if (typeof s.askedToLeave !== 'boolean') {
        s.askedToLeave = false;
        mutated = true;
      }
      // onVacationUntil is optional ISO date string or null
      if (!s.onVacationUntil) {
        s.onVacationUntil = null;
        mutated = true;
      }
    });
    return mutated;
  };

  /**
   * Engine tick - run updates for all users and admin
   */
  const tick = () => {
    try {
      // configuration constants (per simulated day)
      const HAPPINESS_DECAY_BASE = 0.05; // very slow decay per day (percentage points)
      const HAPPINESS_DECAY_ASSIGNED_EXTRA = 0.05; // extra if assigned
      const FIT_DECAY_ASSIGNED = 2.0; // fit points per day when assigned
      const FIT_RECOVERY_IDLE = 1.5; // fit points per day when idle
      const FIT_RECOVERY_VACATION = 5.0; // per day on vacation
      const ACCIDENT_CHANCE = 0.05; // 5% chance for severe penalties when very low
      const VERY_LOW_THRESHOLD = 30; // percent threshold for high risk
      const WANT_LEAVE_THRESHOLD = 50; // below this drivers may ask to leave

      // Work on regular users
      const users = readUsers();
      let usersChanged = false;

      users.forEach((user) => {
        if (!user) return;
        const company = normalizeCompany(user.company);
        if (!company) return;

        // Ensure drivers have stats
        if (ensureDriverStats(company)) {
          usersChanged = true;
        }

        // For each staff, determine assignment status
        (company.staff || []).forEach((s: any) => {
          const now = Date.now();

          // Is driver assigned to an active job?
          // Consider assignment either as assignedDriver OR assignedCoDriver
          const assignedJob = (company.activeJobs || []).find((j: any) => {
            if (!j || !j.status) return false;
            if (['completed', 'cancelled'].includes(j.status)) return false;
            try {
              const driverMatch = j.assignedDriver && String(j.assignedDriver) === String(s.id);
              const coDriverMatch = j.assignedCoDriver && String(j.assignedCoDriver) === String(s.id);
              return driverMatch || coDriverMatch;
            } catch {
              return false;
            }
          });

          // Vacation check: onVacationUntil (ISO string)
          const onVacation = s.onVacationUntil ? (new Date(s.onVacationUntil).getTime() > now) : false;

          // Happiness logic
          let happinessDelta = 0;
          happinessDelta -= HAPPINESS_DECAY_BASE;
          if (assignedJob) happinessDelta -= HAPPINESS_DECAY_ASSIGNED_EXTRA;
          // Clip & apply
          const prevH = typeof s.happiness === 'number' ? s.happiness : 100;
          let newH = Math.max(0, Math.min(100, prevH + happinessDelta));
          if (newH !== prevH) {
            s.happiness = Number(newH.toFixed(2));
            usersChanged = true;
          }

          // If happiness drops below threshold and not already asked, flag request
          if (s.happiness < WANT_LEAVE_THRESHOLD && !s.askedToLeave) {
            s.askedToLeave = true;
            s.askDate = new Date().toISOString();
            usersChanged = true;
            if (debug) console.info(`[DriverEngine] ${s.name || s.id} asked to leave (happiness ${s.happiness})`);
          }

          // Fit logic
          const prevFit = typeof s.fit === 'number' ? s.fit : 100;
          let newFit = prevFit;
          if (onVacation) {
            newFit = Math.min(100, prevFit + FIT_RECOVERY_VACATION);
          } else if (assignedJob) {
            newFit = Math.max(0, prevFit - FIT_DECAY_ASSIGNED);
          } else {
            newFit = Math.min(100, prevFit + FIT_RECOVERY_IDLE);
          }

          if (newFit !== prevFit) {
            s.fit = Number(newFit.toFixed(2));
            usersChanged = true;
          }

          // Penalties: if either value very low, small chance of accident or job consequences
          if ((s.happiness < VERY_LOW_THRESHOLD || s.fit < VERY_LOW_THRESHOLD) && Math.random() < ACCIDENT_CHANCE) {
            // Choose penalty: accident costing capital or job delay
            // Accident penalty reduces company capital and possibly damages truck (symbolic)
            const damageCost = Math.floor(500 + Math.random() * 4500); // 500 - 5000
            company.capital = Math.max(0, (company.capital || 0) - damageCost);

            // Delay a random active job if exists
            if ((company.activeJobs || []).length > 0) {
              const candidateJobs = (company.activeJobs || []).filter((j: any) => j.status !== 'completed' && j.status !== 'cancelled');
              if (candidateJobs.length > 0) {
                const job = candidateJobs[Math.floor(Math.random() * candidateJobs.length)];
                job.progress = Math.max(0, (job.progress || 0) - 10); // penalty to progress
                job.delayNote = `Delayed due to driver condition (${s.name || s.id})`;
              }
            }

            usersChanged = true;
            if (debug) console.warn(`[DriverEngine] Penalty for ${s.name || s.id}: -€${damageCost}`);
          }
        });

        // Persist modified company back to the user record
        user.company = company;
      });

      if (usersChanged) {
        saveUsers(users);
        if (debug) console.debug('[DriverEngine] Users updated and saved');
      }

      // Update admin state too
      const adminState = readAdminState();
      if (adminState && adminState.company) {
        const company = normalizeCompany(adminState.company);
        let adminChanged = false;
        if (ensureDriverStats(company)) adminChanged = true;

        // same loop for admin company staff
        (company.staff || []).forEach((s: any) => {
          const now = Date.now();
          // Admin company: consider both driver and co-driver assignments
          const assignedJob = (company.activeJobs || []).find((j: any) => {
            if (!j || !j.status) return false;
            if (['completed', 'cancelled'].includes(j.status)) return false;
            try {
              const driverMatch = j.assignedDriver && String(j.assignedDriver) === String(s.id);
              const coDriverMatch = j.assignedCoDriver && String(j.assignedCoDriver) === String(s.id);
              return driverMatch || coDriverMatch;
            } catch {
              return false;
            }
          });
          const onVacation = s.onVacationUntil ? (new Date(s.onVacationUntil).getTime() > now) : false;

          // happiness
          let happinessDelta = 0;
          happinessDelta -= HAPPINESS_DECAY_BASE;
          if (assignedJob) happinessDelta -= HAPPINESS_DECAY_ASSIGNED_EXTRA;
          const prevH = typeof s.happiness === 'number' ? s.happiness : 100;
          let newH = Math.max(0, Math.min(100, prevH + happinessDelta));
          if (newH !== prevH) {
            s.happiness = Number(newH.toFixed(2));
            adminChanged = true;
          }
          if (s.happiness < WANT_LEAVE_THRESHOLD && !s.askedToLeave) {
            s.askedToLeave = true;
            s.askDate = new Date().toISOString();
            adminChanged = true;
            if (debug) console.info('[DriverEngine] admin driver asked to leave', s.name || s.id);
          }

          // fit
          const prevFit = typeof s.fit === 'number' ? s.fit : 100;
          let newFit = prevFit;
          if (onVacation) {
            newFit = Math.min(100, prevFit + FIT_RECOVERY_VACATION);
          } else if (assignedJob) {
            newFit = Math.max(0, prevFit - FIT_DECAY_ASSIGNED);
          } else {
            newFit = Math.min(100, prevFit + FIT_RECOVERY_IDLE);
          }
          if (newFit !== prevFit) {
            s.fit = Number(newFit.toFixed(2));
            adminChanged = true;
          }

          // penalties for admin company
          if ((s.happiness < VERY_LOW_THRESHOLD || s.fit < VERY_LOW_THRESHOLD) && Math.random() < ACCIDENT_CHANCE) {
            const damageCost = Math.floor(500 + Math.random() * 4500);
            company.capital = Math.max(0, (company.capital || 0) - damageCost);
            if ((company.activeJobs || []).length > 0) {
              const candidateJobs = (company.activeJobs || []).filter((j: any) => j.status !== 'completed' && j.status !== 'cancelled');
              if (candidateJobs.length > 0) {
                const job = candidateJobs[Math.floor(Math.random() * candidateJobs.length)];
                job.progress = Math.max(0, (job.progress || 0) - 10);
                job.delayNote = `Delayed due to driver condition (${s.name || s.id})`;
              }
            }
            adminChanged = true;
            if (debug) console.warn(`[DriverEngine] admin penalty for ${s.name || s.id}: -€${damageCost}`);
          }
        });

        if (adminChanged) {
          adminState.company = company;
          saveAdminState(adminState);
          if (debug) console.debug('[DriverEngine] Admin state updated and saved');
        }
      }
    } catch (err) {
      console.error('DriverEngine tick error', err);
    }
  };

  // Start
  if (!timerId) {
    if (debug) console.info(`[DriverEngine] starting tick every ${tickIntervalMs}ms`);
    // run an immediate tick to initialize any missing stats quickly
    tick();
    timerId = setInterval(tick, tickIntervalMs);
  }

  // Stop function
  const stop = () => {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
      if (debug) console.info('[DriverEngine] stopped');
    }
  };

  return stop;
}