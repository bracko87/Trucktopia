/**
 * GameContext.tsx
 *
 * Central game state provider.
 *
 * Responsibilities:
 * - User/session management (login/register/switch)
 * - Per-user company persistence (localStorage)
 * - Staff normalization and derived status updates
 * - Skill training engine (core requirements implemented here)
 *
 * Training rules implemented:
 * - Training duration: 7..10 days (default random)
 * - Cost: 1000..5000 USD depending on current skill %
 * - While training: staff.status === 'training'; cannot be assigned to job or vacation
 * - Fit decays across training days similar to being on-job (applied at completion)
 * - On completion: award 1..5 skill points (persisted as skillsProgress); happiness increases a bit
 * - If skill percent >= 80% -> mark skill card (staff.skillCards)
 *
 * File-level comments and JSDoc are present for clarity.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Company, GameState, GamePage, ActiveJob } from '../types/game';
import { getSkillsByCategory } from '../utils/skillsDatabase';
import { writeSkillProgress, readSkillProgress } from '../utils/skillPersistence';
import { MANAGER_SKILLS } from '../utils/roleSkills';

/**
 * GameContextType
 * @description Public context interface exposed to the app
 */
export interface GameContextType {
  gameState: GameState;
  setCurrentPage: (page: GamePage) => void;
  toggleSidebar: () => void;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (email: string, password: string, confirmPassword: string) => Promise<{ success: boolean; message: string }>;
  createCompany: (company: Company) => void;
  acceptJob: (jobData: any) => void;
  completeJob: (jobId: string) => void;
  cancelJob: (jobId: string) => void;
  logout: () => void;
  clearOldData: () => void;
  switchUser: (email: string) => Promise<{ success: boolean; message: string }>;
  hireStaff: (staff: Partial<any>, opts?: { deductCapital?: number }) => void;
  adjustSalary: (staffId: string, amount: number | null) => void;
  setVacation: (staffId: string, days: number | null) => { success: boolean; message: string };
  improveSkill: (staffId: string, skill: string | null) => void;
  promoteStaff: (staffId: string, newRole?: string) => void;
  fireStaff: (staffId: string) => void;
  /**
   * startTraining
   * @description Schedule training for a staff member.
   *              Returns success + message. Training days default to 7..10.
   */
  startTraining: (staffId: string, skillName: string, days?: number) => { success: boolean; message: string };
}

/**
 * Create the context
 */
const GameContext = createContext<GameContextType | undefined>(undefined);

/**
 * Hook to consume game context
 * @returns GameContextType
 */
export const useGame = (): GameContextType => {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error('useGame must be used within GameProvider');
  }
  return ctx;
};

interface GameProviderProps {
  children: ReactNode;
}

/**
 * ADMIN_ACCOUNT
 * @description Admin account used by the app. Kept out of user list.
 */
const ADMIN_ACCOUNT = {
  email: 'bracko87@live.com',
  password: 'Esta2020',
  username: 'Admin'
};

/**
 * userStorage
 * @description Utilities for reading/writing users and per-user state in localStorage
 */
const userStorage = {
  getAllUsers: (): Array<{ email: string; password: string; username: string; company?: Company; createdAt: string }> => {
    try {
      const raw = localStorage.getItem('tm_users');
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      console.warn('userStorage.getAllUsers parse error', err);
      return [];
    }
  },

  saveAllUsers: (users: Array<{ email: string; password: string; username: string; company?: Company; createdAt: string }>) => {
    try {
      localStorage.setItem('tm_users', JSON.stringify(users));
      return true;
    } catch (err) {
      console.error('userStorage.saveAllUsers failed', err);
      return false;
    }
  },

  findUser: (email: string) => {
    const users = userStorage.getAllUsers();
    return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  addUser: (user: { email: string; password: string; username: string; createdAt: string }) => {
    const users = userStorage.getAllUsers();
    if (users.find(u => u.email.toLowerCase() === user.email.toLowerCase())) return false;
    users.push(user);
    return userStorage.saveAllUsers(users);
  },

  updateUser: (email: string, updates: Partial<{ company?: Company; password?: string }>) => {
    try {
      const users = userStorage.getAllUsers();
      const idx = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
      if (idx === -1) return false;
      const existing = users[idx];
      const merged = {
        ...existing,
        ...updates,
        company: updates.company ? {
          ...existing.company,
          ...updates.company,
          trucks: Array.isArray(updates.company.trucks) ? updates.company.trucks : Array.isArray(existing.company?.trucks) ? existing.company!.trucks : [],
          trailers: Array.isArray(updates.company.trailers) ? updates.company.trailers : Array.isArray(existing.company?.trailers) ? existing.company!.trailers : [],
          staff: Array.isArray(updates.company.staff) ? updates.company.staff : Array.isArray(existing.company?.staff) ? existing.company!.staff : [],
          contracts: Array.isArray(updates.company.contracts) ? updates.company.contracts : Array.isArray(existing.company?.contracts) ? existing.company!.contracts : [],
          activeJobs: Array.isArray(updates.company.activeJobs) ? updates.company.activeJobs : Array.isArray(existing.company?.activeJobs) ? existing.company!.activeJobs : []
        } : existing.company
      };
      users[idx] = merged;
      return userStorage.saveAllUsers(users);
    } catch (err) {
      console.error('userStorage.updateUser error', err);
      return false;
    }
  },

  getUserGameState: (email: string) => {
    try {
      const key = `tm_user_state_${email.toLowerCase()}`;
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.warn('userStorage.getUserGameState parse error', err);
      return null;
    }
  },

  saveUserGameState: (email: string, state: { isAuthenticated: boolean; company?: Company; sidebarCollapsed?: boolean }) => {
    try {
      const key = `tm_user_state_${email.toLowerCase()}`;
      localStorage.setItem(key, JSON.stringify(state));
      return true;
    } catch (err) {
      console.error('userStorage.saveUserGameState failed', err);
      return false;
    }
  },

  clearUserGameState: (email: string) => {
    try {
      const key = `tm_user_state_${email.toLowerCase()}`;
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },

  getAdminState: () => {
    try {
      const raw = localStorage.getItem('tm_admin_state');
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.warn('userStorage.getAdminState parse error', err);
      return null;
    }
  },

  saveAdminState: (state: { isAuthenticated: boolean; company?: Company; sidebarCollapsed?: boolean }) => {
    try {
      const safe = {
        ...state,
        company: state.company ? {
          ...state.company,
          trucks: Array.isArray(state.company.trucks) ? state.company.trucks : [],
          trailers: Array.isArray(state.company.trailers) ? state.company.trailers : [],
          staff: Array.isArray(state.company.staff) ? state.company.staff : [],
          contracts: Array.isArray(state.company.contracts) ? state.company.contracts : [],
          activeJobs: Array.isArray(state.company.activeJobs) ? state.company.activeJobs : []
        } : undefined
      };
      localStorage.setItem('tm_admin_state', JSON.stringify(safe));
      return true;
    } catch (err) {
      console.error('userStorage.saveAdminState failed', err);
      return false;
    }
  },

  clearAllUserStates: () => {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('tm_user_state_')) keys.push(k);
      }
      keys.forEach(k => localStorage.removeItem(k));
    } catch {
      // ignore
    }
  },

  clearExpiredData: () => {
    try {
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const users = userStorage.getAllUsers();
      const recent = users.filter(u => new Date(u.createdAt || 0).getTime() > oneWeekAgo);
      if (recent.length < users.length) userStorage.saveAllUsers(recent);
    } catch {
      // ignore
    }
  }
};

/**
 * ensureStaffDefaults
 * @description Ensure staff objects have expected fields used by the system
 *              and rehydrate per-skill progress from localStorage so skills persist
 *              for the exact staff after hiring / across reloads.
 */
const ensureStaffDefaults = (company: any) => {
  if (!company || !Array.isArray(company.staff)) return company;

  company.staff = company.staff.map((s: any) => {
    const staff = { ...s };

    // Ensure stable hireUid: may be created at hire time. If absent, keep undefined.
    staff.hireUid = staff.hireUid ?? staff.hireUid;

    staff.id = staff.id ?? `staff-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    staff.name = staff.name ?? staff.id;
    staff.role = staff.role ?? 'driver';
    staff.salary = typeof staff.salary === 'number'
      ? staff.salary
      : (staff.salary === 'FREE' ? 0 : (staff.salary ? Number(staff.salary) : 0));
    staff.experience = typeof staff.experience === 'number' ? staff.experience : (Number(staff.experience) || 0);
    staff.hiredDate = staff.hiredDate ?? new Date().toISOString();
    staff.status = staff.status ?? 'available';
    staff.isOwner = Boolean(staff.isOwner);
    staff.tours = typeof staff.tours === 'number' ? staff.tours : 0;
    staff.kilometers = typeof staff.kilometers === 'number' ? staff.kilometers : 0;
    staff.happiness = typeof staff.happiness === 'number' ? staff.happiness : 100;
    staff.fit = typeof staff.fit === 'number' ? staff.fit : 100;
    staff.askedToLeave = typeof staff.askedToLeave === 'boolean' ? staff.askedToLeave : false;
    staff.onVacationUntil = staff.onVacationUntil ?? null;

    // Normalize skills arrays
    staff.skills = Array.isArray(staff.skills) ? staff.skills : (staff.skills ? [staff.skills] : []);
    staff.skillCards = Array.isArray(staff.skillCards) ? staff.skillCards : []; // skills >= 80% will be added
    staff.availabilityDate = staff.availabilityDate ?? undefined;
    staff.noticePeriod = typeof staff.noticePeriod === 'number' ? staff.noticePeriod : (staff.noticePeriod ? Number(staff.noticePeriod) : 0);
    staff.training = staff.training ?? null;

    /**
     * promoted
     * @description Mark if the staff was already promoted (prevents further promotions).
     * Default false for existing staff without the field.
     */
    staff.promoted = typeof staff.promoted === 'boolean' ? staff.promoted : false;

    /**
     * Rehydrate per-skill progress from localStorage when possible.
     * We attempt both staff.id and staff.hireUid (if present). If data exists under
     * hireUid (created at hire time) that will be preferred. This provides resilience
     * against systems that change staff.id after hiring.
     */
    try {
      const rehydrated: Record<string, number> = typeof staff.skillsProgress === 'object' && staff.skillsProgress ? { ...staff.skillsProgress } : {};

      const skillOwnersToCheck: string[] = [String(staff.id)];
      if (staff.hireUid) skillOwnersToCheck.unshift(String(staff.hireUid)); // prefer hireUid if present

      (Array.isArray(staff.skills) ? staff.skills : []).forEach((skill: string) => {
        try {
          // Try identifiers in order: hireUid then staff.id
          for (const ident of skillOwnersToCheck) {
            try {
              const stored = readSkillProgress(ident, skill);
              if (stored !== null) {
                rehydrated[skill] = Math.max(0, Math.min(100, Math.round(stored)));
                break;
              }
            } catch {
              // ignore individual ident failures
            }
          }
          // If no persisted value found and an in-company value exists, keep it
          if (typeof rehydrated[skill] !== 'number' && typeof staff.skillsProgress === 'object' && typeof staff.skillsProgress[skill] === 'number') {
            rehydrated[skill] = Math.max(0, Math.min(100, Math.round(staff.skillsProgress[skill])));
          }
          // Missing -> leave undefined for now; other systems may seed later
        } catch {
          // ignore per-skill errors
        }
      });

      staff.skillsProgress = rehydrated;
    } catch {
      staff.skillsProgress = typeof staff.skillsProgress === 'object' && staff.skillsProgress ? staff.skillsProgress : {};
    }

    return staff;
  });

  return company;
};

/**
 * updateStaffStatuses
 * @description Derived runtime statuses computed from training/vacation/activeJobs.
 */
const updateStaffStatuses = (company: any) => {
  if (!company) return company;
  company.staff = Array.isArray(company.staff) ? company.staff : [];
  company.activeJobs = Array.isArray(company.activeJobs) ? company.activeJobs : [];
  const now = Date.now();

  company.staff = company.staff.map((s: any) => {
    const staff = { ...s };
    staff.onVacationUntil = staff.onVacationUntil ?? null;

    // If training ongoing -> training status
    if (staff.training) {
      try {
        const end = new Date(staff.training.endDate).getTime();
        if (end > now) {
          staff.status = 'training';
          return staff;
        } else {
          // training endtime passed but not finalized yet; leave to background processor
          staff.status = 'training';
          return staff;
        }
      } catch {
        staff.status = 'training';
        return staff;
      }
    }

    // Vacation check
    const onVacation = staff.onVacationUntil ? (new Date(staff.onVacationUntil).getTime() > now) : false;
    if (onVacation) {
      staff.status = 'on_vacation';
      return staff;
    }

    // Assigned job check
    const assignedJob = company.activeJobs.find((j: any) => {
      if (!j) return false;
      const closed = j.status === 'completed' || j.status === 'cancelled';
      return !closed && j.assignedDriver && String(j.assignedDriver) === String(staff.id);
    });
    if (assignedJob) {
      staff.status = 'on-job';
      return staff;
    }

    // Default to available
    staff.status = staff.status && staff.status !== 'training' && staff.status !== 'on-job' && staff.status !== 'on_vacation' ? staff.status : 'available';
    return staff;
  });

  return company;
};

/**
 * GameProvider
 * @description Provides the GameContext to the app. Implements training engine and state persistence.
 */
export const GameProvider: React.FC<GameProviderProps> = ({ children }) => {
  const [gameState, setGameState] = useState<GameState>({
    isAuthenticated: false,
    currentPage: 'dashboard',
    company: null,
    sidebarCollapsed: false,
    currentUser: null
  });

  /**
   * initialize: restore session if available
   */
  useEffect(() => {
    try {
      userStorage.clearExpiredData();
    } catch { /* ignore */ }

    const currentUser = sessionStorage.getItem('tm_current_user');
    if (!currentUser) {
      setGameState(prev => ({ ...prev, isAuthenticated: false, company: null, currentUser: null }));
      return;
    }

    if (currentUser === ADMIN_ACCOUNT.email.toLowerCase()) {
      const adminState = userStorage.getAdminState();
      let company = adminState?.company ? ensureStaffDefaults(adminState.company) : null;

      // Force displayed & in-memory admin company reputation to 0 immediately
      if (company) {
        company.reputation = 0;
      }

      setGameState({
        isAuthenticated: true,
        currentPage: 'dashboard',
        company,
        sidebarCollapsed: adminState?.sidebarCollapsed ?? false,
        currentUser: ADMIN_ACCOUNT.email.toLowerCase()
      });
      return;
    }

    const userState = userStorage.getUserGameState(currentUser);
    const user = userStorage.findUser(currentUser);
    let company = (userState?.company || user?.company) ? ensureStaffDefaults(userState?.company || user?.company) : null;

    // Force displayed & in-memory user company reputation to 0 immediately
    if (company) {
      company.reputation = 0;
    }

    if (userState && userState.isAuthenticated) {
      setGameState({
        isAuthenticated: true,
        currentPage: 'dashboard',
        company,
        sidebarCollapsed: userState.sidebarCollapsed ?? false,
        currentUser: currentUser.toLowerCase()
      });
      return;
    }

    // fallback: logged out
    sessionStorage.removeItem('tm_current_user');
    setGameState({
      isAuthenticated: false,
      currentPage: 'dashboard',
      company: null,
      sidebarCollapsed: false,
      currentUser: null
    });
  }, []);

  /**
   * Persist game state when it changes (company)
   *
   * @description Persist the current game state (company and sidebar) into localStorage.
   * This runs whenever gameState changes. Note: company persistence occurs after any
   * reputation enforcement effect applied below, so storage always stores reputation = 0.
   */
  useEffect(() => {
    if (!gameState.isAuthenticated || !gameState.currentUser) return;
    const toSave = { isAuthenticated: true, company: gameState.company, sidebarCollapsed: gameState.sidebarCollapsed };
    if (gameState.currentUser === ADMIN_ACCOUNT.email.toLowerCase()) {
      userStorage.saveAdminState(toSave);
    } else {
      userStorage.saveUserGameState(gameState.currentUser, toSave);
    }
  }, [gameState]);

  /**
   * enforceCompanyReputationZero
   * @description Ensure the active company always has reputation === 0.
   * This effect will:
   *  - If there is an active company and its reputation is not 0, set it to 0.
   *  - Persist the change immediately to the respective storage (admin or user).
   *  - Update in-memory gameState so all pages/components reflect reputation 0.
   *
   * Note: This deliberately overrides any other reputation updates so the app
   * consistently shows reputation = 0 as requested.
   */
  useEffect(() => {
    try {
      const company = gameState.company;
      const currentUser = gameState.currentUser;
      if (!company || !currentUser) return;

      const currentReputation = typeof company.reputation === 'number' ? company.reputation : Number(company.reputation ?? 0);
      if (currentReputation === 0) return; // already zero, nothing to do

      // Create a new company object with reputation forced to 0
      const updatedCompany = { ...company, reputation: 0 };

      // Persist to storage for admin or regular user
      if (currentUser === ADMIN_ACCOUNT.email.toLowerCase()) {
        userStorage.saveAdminState({ isAuthenticated: true, company: updatedCompany, sidebarCollapsed: gameState.sidebarCollapsed });
      } else {
        // update both user record and per-user state
        userStorage.updateUser(currentUser, { company: updatedCompany });
        userStorage.saveUserGameState(currentUser, { isAuthenticated: true, company: updatedCompany, sidebarCollapsed: gameState.sidebarCollapsed });
      }

      // Update in-memory state (this will trigger the general persist effect above)
      setGameState(prev => ({ ...prev, company: updatedCompany }));
    } catch (err) {
      console.error('enforceCompanyReputationZero error', err);
    }
    // We include both company id and reputation in deps to catch company changes and loaded persisted values
  }, [gameState.company?.id, gameState.company?.reputation, gameState.currentUser, gameState.sidebarCollapsed]);

  /**
   * backgroundTick
   * - Reconciles statuses
   * - Finalizes training when endDate reached
   *
   * Note: interval is kept small for development; in production increase it or use server events.
   */
  useEffect(() => {
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const FIT_DECAY_PER_DAY = 2; // fit lost per day while in training (simulating job-like fatigue)

    const tick = () => {
      if (!gameState.company || !gameState.currentUser) return;
      try {
        const companyClone = JSON.parse(JSON.stringify(gameState.company));
        const now = Date.now();
        let changed = false;

        // Finalize trainings whose endDate <= now
        companyClone.staff = (companyClone.staff || []).map((s: any) => {
          const st = { ...s };

          if (st.training) {
            const end = new Date(st.training.endDate).getTime();
            if (now >= end) {
              // Training completed -> award 3..5 percentage points
              const skill = st.training.skill;
              const prevPct = Number(st.skillsProgress?.[skill] ?? 0);
              const added = Math.floor(Math.random() * 3) + 3; // 3..5
              const nextPct = Math.min(100, prevPct + added);

              // Persist progress both in staff object and localStorage (canonical writer)
              st.skillsProgress = { ...(st.skillsProgress || {}), [skill]: nextPct };
              try {
                // Use canonical writer so format is consistent across the app
                writeSkillProgress(st.id, skill, nextPct);
              } catch {
                // ignore storage errors
              }

              // If reaches >=80% add a skill card for UI
              if (nextPct >= 80) {
                st.skillCards = Array.isArray(st.skillCards) ? st.skillCards : [];
                if (!st.skillCards.includes(skill)) st.skillCards.push(skill);
              }

              // Fit decays across totalDays
              const totalDays = Number(st.training.totalDays) || Math.round((end - new Date(st.training.startDate).getTime()) / MS_PER_DAY);
              const fitPrev = typeof st.fit === 'number' ? st.fit : 100;
              const fitNext = Math.max(0, Number((fitPrev - FIT_DECAY_PER_DAY * totalDays).toFixed(2)));
              st.fit = fitNext;

              // Happiness small boost
              const hPrev = typeof st.happiness === 'number' ? st.happiness : 100;
              const happinessBoost = Math.floor(2 + Math.random() * 4); // 2..5
              st.happiness = Math.min(100, hPrev + happinessBoost);

              // Clear training
              st.training = null;
              st.status = 'available';
              st.__trainingCompleted = { skill, added, prevPct, nextPct }; // temporary marker for logging/actions
              changed = true;
            } else {
              // Training ongoing: keep status training
              st.status = 'training';
            }
          }

          return st;
        });

        // Update derived statuses for non-training staff
        const normalized = updateStaffStatuses(companyClone);

        // Persist if changed
        const prevJson = JSON.stringify(gameState.company);
        const newJson = JSON.stringify(normalized);
        if (prevJson !== newJson || changed) {
          if (gameState.currentUser === ADMIN_ACCOUNT.email.toLowerCase()) {
            // Ensure reputation stays 0 when persisting admin state
            normalized.reputation = 0;
            userStorage.saveAdminState({ isAuthenticated: true, company: normalized, sidebarCollapsed: gameState.sidebarCollapsed });
          } else {
            // Ensure reputation stays 0 when persisting user state
            normalized.reputation = 0;
            userStorage.updateUser(gameState.currentUser, { company: normalized });
            userStorage.saveUserGameState(gameState.currentUser, { isAuthenticated: true, company: normalized, sidebarCollapsed: gameState.sidebarCollapsed });
          }
          setGameState(prev => ({ ...prev, company: normalized }));

          // Handle any post-training actions (immediate improveSkill logic is embedded: skill progress already applied).
          // We keep marker cleanup simple: remove __trainingCompleted markers after persisting
          (normalized.staff || []).forEach((s: any) => {
            if (s && s.__trainingCompleted) {
              // Optionally trigger notifications here (UI)
              delete s.__trainingCompleted;
            }
          });
        }
      } catch (err) {
        console.warn('[GameContext] backgroundTick error', err);
      }
    };

    // Run tick immediately once to reconcile, then interval
    tick();
    const interval = window.setInterval(tick, 5000); // dev frequency: 5s
    return () => {
      window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.currentUser, gameState.company]);

  /**
   * setCurrentPage
   * @description update current page
   */
  const setCurrentPage = (page: GamePage) => {
    setGameState(prev => ({ ...prev, currentPage: page }));
  };

  /**
   * toggleSidebar
   */
  const toggleSidebar = () => {
    setGameState(prev => ({ ...prev, sidebarCollapsed: !prev.sidebarCollapsed }));
  };

  /**
   * login
   * @description Authenticate user and restore or create initial company state
   */
  const login = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      const normalized = email.toLowerCase().trim();
      if (normalized === ADMIN_ACCOUNT.email.toLowerCase() && password === ADMIN_ACCOUNT.password) {
        // admin restore
        let adminState = userStorage.getAdminState();
        if (!adminState) {
          adminState = {
            isAuthenticated: true,
            company: {
              id: 'admin-company',
              name: 'Admin',
              level: 'enterprise',
              capital: 1000000,
              // enforce reputation 0 for admin default
              reputation: 0,
              employees: 50,
              founded: new Date(),
              hub: { id: 'frankfurt', name: 'Frankfurt', country: 'Germany', region: 'euro-asia', capacity: 100, level: 5, cost: 50000 },
              trucks: [],
              trailers: [],
              staff: [],
              contracts: [],
              activeJobs: [],
              logo: null,
              email: ADMIN_ACCOUNT.email
            },
            sidebarCollapsed: false
          };
          userStorage.saveAdminState(adminState);
        }
        const company = adminState.company ? ensureStaffDefaults(adminState.company) : null;
        // Ensure company reputation is 0 in-memory as well
        if (company) company.reputation = 0;
        sessionStorage.setItem('tm_current_user', ADMIN_ACCOUNT.email.toLowerCase());
        setGameState({ isAuthenticated: true, currentPage: 'dashboard', company, sidebarCollapsed: adminState.sidebarCollapsed ?? false, currentUser: ADMIN_ACCOUNT.email.toLowerCase() });
        return { success: true, message: 'Admin login successful' };
      }

      // regular user
      const user = userStorage.findUser(normalized);
      if (!user) return { success: false, message: 'Invalid email or password' };
      if (user.password !== password) return { success: false, message: 'Invalid email or password' };

      const userState = userStorage.getUserGameState(normalized);
      const company = (userState?.company || user.company) ? ensureStaffDefaults(userState?.company || user.company) : null;
      // Force company reputation 0 on login restore
      if (company) company.reputation = 0;
      sessionStorage.setItem('tm_current_user', normalized);
      userStorage.saveUserGameState(normalized, { isAuthenticated: true, company, sidebarCollapsed: userState?.sidebarCollapsed ?? false });
      setGameState({ isAuthenticated: true, currentPage: 'dashboard', company, sidebarCollapsed: userState?.sidebarCollapsed ?? false, currentUser: normalized });
      return { success: true, message: 'Login successful' };
    } catch (err) {
      console.error('login error', err);
      return { success: false, message: 'Login failed' };
    }
  };

  /**
   * register
   */
  const register = async (email: string, password: string, confirmPassword: string): Promise<{ success: boolean; message: string }> => {
    try {
      const normalized = email.toLowerCase().trim();
      if (normalized === ADMIN_ACCOUNT.email.toLowerCase()) return { success: false, message: 'Reserved email' };
      if (password !== confirmPassword) return { success: false, message: 'Passwords do not match' };
      if (password.length < 6) return { success: false, message: 'Password too short' };
      if (userStorage.findUser(normalized)) return { success: false, message: 'Email already registered' };

      const newUser = { email: normalized, password, username: normalized.split('@')[0], createdAt: new Date().toISOString() };
      const ok = userStorage.addUser(newUser);
      if (!ok) return { success: false, message: 'Registration failed' };

      sessionStorage.setItem('tm_current_user', normalized);
      userStorage.saveUserGameState(normalized, { isAuthenticated: true, company: null, sidebarCollapsed: false });
      setGameState({ isAuthenticated: true, currentPage: 'dashboard', company: null, sidebarCollapsed: false, currentUser: normalized });
      return { success: true, message: 'Registration successful' };
    } catch (err) {
      console.error('register error', err);
      return { success: false, message: 'Registration failed' };
    }
  };

  /**
   * createCompany
   *
   * Ensures new companies have defaults (including reputation = 0) and persists them.
   */
  const createCompany = (company: Company) => {
    if (!gameState.currentUser) {
      console.error('createCompany: no current user');
      return;
    }
    try {
      // Ensure sensible defaults and specifically set reputation to 0 when not provided
      const normalizedCompany = {
        ...company,
        email: gameState.currentUser,
        trucks: Array.isArray(company.trucks) ? company.trucks : [],
        trailers: Array.isArray(company.trailers) ? company.trailers : [],
        staff: Array.isArray(company.staff) ? company.staff : [],
        contracts: Array.isArray(company.contracts) ? company.contracts : [],
        activeJobs: Array.isArray(company.activeJobs) ? company.activeJobs : [],
        // reputation default: 0 for newly created/updated companies (keeps admin state untouched if present)
        reputation: typeof company.reputation === 'number' ? company.reputation : 0
      };
      const ensured = ensureStaffDefaults(normalizedCompany);
      const updated = updateStaffStatuses(ensured);
      // Force reputation to 0 before persisting
      updated.reputation = 0;
      if (gameState.currentUser === ADMIN_ACCOUNT.email.toLowerCase()) {
        userStorage.saveAdminState({ isAuthenticated: true, company: updated, sidebarCollapsed: gameState.sidebarCollapsed });
      } else {
        userStorage.updateUser(gameState.currentUser, { company: updated });
        userStorage.saveUserGameState(gameState.currentUser, { isAuthenticated: true, company: updated, sidebarCollapsed: gameState.sidebarCollapsed });
      }
      setGameState(prev => ({ ...prev, company: updated }));
    } catch (err) {
      console.error('createCompany error', err);
    }
  };

  /**
   * hireStaff
   */
  /**
   * hireStaff
   * @description Create a new staff member and persist to company state.
   * Ensures new hires include the promoted flag (false by default).
   */
  /**
   * deterministicSkillSeed
   * @description Deterministic seed 80..100 for staff+skill used to assign initial non-zero progress
   */
  const deterministicSkillSeed = (staffId: string, skill: string): number => {
    let hash = 0;
    const seedStr = `${staffId}:${skill}`;
    for (let i = 0; i < seedStr.length; i++) {
      hash = (hash << 5) - hash + seedStr.charCodeAt(i);
      hash |= 0;
    }
    const seed = Math.abs(hash);
    return 80 + (seed % 21);
  };

  /**
   * writeSkillProgressLocal
   * @description Persist per-skill progress to localStorage in the tm_skill_progress_... format
   */
  const writeSkillProgressLocal = (staffId: string, skill: string, pct: number) => {
    try {
      const key = `tm_skill_progress_${staffId}_${encodeURIComponent(skill)}`;
      const obj = { pct: Math.max(0, Math.min(100, Math.round(pct))), updatedAt: new Date().toISOString() };
      localStorage.setItem(key, JSON.stringify(obj));
    } catch {
      // ignore
    }
  };

  /**
   * hireStaff
   * @description Create a new staff member and persist to company state.
   *             New hires receive up to 3 skill cards (deterministic). Only those skill cards
   *             will have non-zero seeded progress; other declared skills are seeded to 0%.
   */
  const hireStaff = (staff: Partial<any>, opts?: { deductCapital?: number }) => {
    if (!gameState.currentUser || !gameState.company) {
      alert('Please login and create a company first');
      return;
    }

    // Create a stable hireUid that will survive id remapping and be persisted with the staff entry.
    const hireUid = `hire-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const newStaff: any = {
      id: staff.id ?? `staff-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      hireUid, // stable identifier used for persisted skill keys
      name: staff.name ?? `Staff ${Date.now()}`,
      role: staff.role ?? 'driver',
      salary: typeof staff.salary === 'number' ? staff.salary : 0,
      experience: typeof staff.experience === 'number' ? staff.experience : (Number(staff.experience) || 0),
      hiredDate: new Date().toISOString(),
      status: staff.status ?? 'available',
      isOwner: Boolean(staff.isOwner),
      availabilityDate: staff.availabilityDate,
      noticePeriod: typeof staff.noticePeriod === 'number' ? staff.noticePeriod : 0,
      skills: Array.isArray(staff.skills) ? staff.skills : (staff.skills ? [staff.skills] : []),
      nationality: staff.nationality ?? null,
      tours: 0,
      kilometers: 0,
      happiness: 100,
      fit: 100,
      askedToLeave: false,
      onVacationUntil: null,
      training: null,
      skillsProgress: {},
      skillCards: [],
      promoted: false // ensure new hires can be promoted once
    };

    // Seed skillCards: deterministically pick up to 3 skills from the provided skills array
    try {
      const skillsArr: string[] = Array.isArray(newStaff.skills) ? newStaff.skills.slice() : [];
      // Build deterministic seeds and sort descending (use staff.id for deterministic seed but also persist under hireUid)
      const mapped = skillsArr.map((s) => ({ skill: s, seed: deterministicSkillSeed(newStaff.id, s) }));
      mapped.sort((a, b) => b.seed - a.seed || a.skill.localeCompare(b.skill));
      const selected = mapped.slice(0, 3).map((m) => m.skill);

      // Assign skillsProgress: selected -> deterministic seed, others -> 0
      const sp: Record<string, number> = {};
      skillsArr.forEach((s) => {
        if (selected.includes(s)) {
          const pct = deterministicSkillSeed(newStaff.id, s);
          sp[s] = pct;
          // Persist under both staff.id and hireUid for resilience
          try {
            writeSkillProgress(newStaff.id, s, pct);
          } catch {}
          try {
            writeSkillProgress(hireUid, s, pct);
          } catch {}
        } else {
          sp[s] = 0;
          try {
            writeSkillProgress(newStaff.id, s, 0);
          } catch {}
          try {
            writeSkillProgress(hireUid, s, 0);
          } catch {}
        }
      });

      newStaff.skillsProgress = sp;
      newStaff.skillCards = selected;

      // If hiring a manager and candidate already has manager skill cards, mark as assigned so
      // ManagerSkillAssigner will not overwrite preserved manager data.
      try {
        if (String(newStaff.role).toLowerCase() === 'manager') {
          const managerCardPresent = Array.isArray(newStaff.skillCards) && newStaff.skillCards.some((c: string) => MANAGER_SKILLS.includes(c));
          if (managerCardPresent) {
            newStaff.managerSkillsAssigned = true;
          }
        }
      } catch { /* ignore */ }
    } catch (err) {
      // If seeding fails, leave defaults (empty progress/cards)
      // eslint-disable-next-line no-console
      console.warn('hireStaff seeding error', err);
    }

    // Centralized persist of mechanic skills (so the Staff page / MechanicSkillAssigner
    // can rehydrate exact hired skills). Persist only when role === 'mechanic' and skills exist.
    try {
      if (newStaff.role === 'mechanic' && Array.isArray(newStaff.skills) && newStaff.skills.length > 0) {
        const key = `tm_mechanic_skills_${gameState.currentUser}_${newStaff.id}`;
        localStorage.setItem(
          key,
          JSON.stringify({ skills: newStaff.skills.slice(), updatedAt: new Date().toISOString(), hireUid })
        );
      }
    } catch {
      // ignore storage errors
    }

    // Apply capital deduction centrally when requested
    const capitalBefore = typeof gameState.company.capital === 'number' ? gameState.company.capital : 0;
    const deduction = typeof opts?.deductCapital === 'number' ? Math.max(0, Math.round(opts!.deductCapital)) : 0;
    const updatedCompany: any = {
      ...gameState.company,
      capital: Math.max(0, capitalBefore - deduction),
      staff: [...(gameState.company.staff || []), newStaff]
    };

    // Use createCompany (GameContext) to persist, preserving existing behavior
    if (typeof createCompany === 'function') {
      createCompany(updatedCompany);
    } else {
      try {
        const storageKey = `tm_company_${gameState?.currentUser ?? 'local'}`;
        localStorage.setItem(storageKey, JSON.stringify(updatedCompany));
        setGameState(prev => ({ ...prev, company: updatedCompany }));
      } catch {
        // ignore
      }
    }
  };

  /**
   * acceptJob
   */
  const acceptJob = (jobData: any) => {
    if (!gameState.currentUser || !gameState.company) {
      alert('Please login and create company first');
      return;
    }
    try {
      const ts = Date.now();
      const id = `job-${String(ts).slice(-6)}-${gameState.currentUser}`;
      const newJob: ActiveJob = {
        id,
        title: jobData.title || 'Transport Contract',
        contractId: `contract-${id}`,
        assignedTruck: jobData.assignedTruck ?? '',
        assignedTrailer: jobData.assignedTrailer ?? '',
        assignedDriver: jobData.assignedDriver ?? '',
        startTime: new Date(),
        estimatedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        progress: 0,
        currentLocation: jobData.origin || 'Unknown',
        status: 'loading',
        value: jobData.value || 0,
        distance: jobData.distance || 0,
        origin: jobData.origin || 'Unknown',
        destination: jobData.destination || 'Unknown',
        deadline: jobData.deadline || 'No deadline',
        cargoType: jobData.cargoType || 'General Cargo',
        weight: jobData.weight || 0
      };
      const updated = { ...gameState.company, activeJobs: [...(gameState.company.activeJobs || []), newJob] };
      updateStaffStatuses(updated);
      if (gameState.currentUser === ADMIN_ACCOUNT.email.toLowerCase()) userStorage.saveAdminState({ isAuthenticated: true, company: updated, sidebarCollapsed: gameState.sidebarCollapsed });
      else { userStorage.updateUser(gameState.currentUser, { company: updated }); userStorage.saveUserGameState(gameState.currentUser, { isAuthenticated: true, company: updated, sidebarCollapsed: gameState.sidebarCollapsed }); }
      setGameState(prev => ({ ...prev, company: updated }));
      alert(`Job accepted: ${newJob.title}`);
    } catch (err) {
      console.error('acceptJob error', err);
      alert('Failed to accept job');
    }
  };

  /**
   * completeJob
   */
  const completeJob = (jobId: string) => {
    if (!gameState.company || !gameState.currentUser) return;
    try {
      const original = gameState.company.activeJobs || [];
      const targetJob = original.find(j => j.id === jobId);
      // If job already completed, do nothing
      const alreadyCompleted = targetJob ? targetJob.status === 'completed' : false;

      // Mark job completed (idempotent)
      const updatedJobs = original.map(j => j.id === jobId ? { ...j, status: 'completed', progress: 100 } : j);
      const updatedCompany: any = { ...gameState.company, activeJobs: updatedJobs };

      // If this job transitioned to completed now (was not completed before), apply reputation gain
      if (targetJob && !alreadyCompleted) {
        // Ensure numeric reputation
        updatedCompany.reputation = typeof updatedCompany.reputation === 'number' ? updatedCompany.reputation : 0;
        // Increase reputation by 0.10 per completed job
        updatedCompany.reputation = Number((updatedCompany.reputation + 0.10).toFixed(2));
      }

      // Update assigned driver statistics
      if (targetJob && targetJob.assignedDriver) {
        updatedCompany.staff = (updatedCompany.staff || []).map((s: any) => {
          if (s.id !== targetJob.assignedDriver) return s;
          s.tours = (typeof s.tours === 'number' ? s.tours : 0) + 1;
          s.kilometers = (typeof s.kilometers === 'number' ? s.kilometers : 0) + (targetJob.distance || 0);
          s.happiness = Math.min(100, (typeof s.happiness === 'number' ? s.happiness : 100) + 0.5);
          return s;
        });
      }

      // Persist but ensure reputation remains 0 in persistence (enforcement)
      updatedCompany.reputation = 0;

      if (gameState.currentUser === ADMIN_ACCOUNT.email.toLowerCase()) userStorage.saveAdminState({ isAuthenticated: true, company: updatedCompany, sidebarCollapsed: gameState.sidebarCollapsed });
      else { userStorage.updateUser(gameState.currentUser, { company: updatedCompany }); userStorage.saveUserGameState(gameState.currentUser, { isAuthenticated: true, company: updatedCompany, sidebarCollapsed: gameState.sidebarCollapsed }); }
      setGameState(prev => ({ ...prev, company: updatedCompany }));
    } catch (err) {
      console.error('completeJob error', err);
    }
  };

  /**
   * cancelJob
   */
  const cancelJob = (jobId: string) => {
    if (!gameState.company || !gameState.currentUser) return;
    try {
      const updatedCompany: any = { ...gameState.company, activeJobs: (gameState.company.activeJobs || []).map(j => j.id === jobId ? { ...j, status: 'cancelled' } : j) };
      updateStaffStatuses(updatedCompany);
      // Ensure reputation remains 0
      updatedCompany.reputation = 0;
      if (gameState.currentUser === ADMIN_ACCOUNT.email.toLowerCase()) userStorage.saveAdminState({ isAuthenticated: true, company: updatedCompany, sidebarCollapsed: gameState.sidebarCollapsed });
      else { userStorage.updateUser(gameState.currentUser, { company: updatedCompany }); userStorage.saveUserGameState(gameState.currentUser, { isAuthenticated: true, company: updatedCompany, sidebarCollapsed: gameState.sidebarCollapsed }); }
      setGameState(prev => ({ ...prev, company: updatedCompany }));
    } catch (err) {
      console.error('cancelJob error', err);
    }
  };

  /**
   * logout
   */
  const logout = () => {
    try {
      sessionStorage.removeItem('tm_current_user');
      setGameState({ isAuthenticated: false, currentPage: 'dashboard', company: null, sidebarCollapsed: false, currentUser: null });
    } catch (err) {
      console.error('logout error', err);
    }
  };

  /**
   * clearOldData
   */
  const clearOldData = () => {
    try {
      userStorage.clearAllUserStates();
      localStorage.removeItem('tm_admin_state');
      localStorage.removeItem('tm_users');
      sessionStorage.removeItem('tm_current_user');
      setGameState({ isAuthenticated: false, currentPage: 'dashboard', company: null, sidebarCollapsed: false, currentUser: null });
    } catch (err) {
      console.error('clearOldData error', err);
    }
  };

  /**
   * switchUser
   * @description Placeholder: switching requires re-authentication in UI
   */
  const switchUser = async (email: string): Promise<{ success: boolean; message: string }> => {
    logout();
    return { success: false, message: 'Switching users requires login' };
  };

  /**
   * adjustSalary
   */
  const adjustSalary = (staffId: string, amount: number | null) => {
    if (!gameState.company || !gameState.currentUser || amount === null) return;
    try {
      const updated = { ...gameState.company, staff: (gameState.company.staff || []).map((s: any) => {
        if (s.id !== staffId) return s;
        const prev = typeof s.salary === 'number' ? s.salary : 0;
        s.salary = Number.isFinite(Number(amount)) ? Number(amount) : prev;
        const rel = prev > 0 ? (s.salary - prev) / prev : s.salary > 0 ? 0.05 : 0;
        const delta = Math.max(-10, Math.min(20, Math.round(rel * 50)));
        s.happiness = Math.max(0, Math.min(100, (typeof s.happiness === 'number' ? s.happiness : 100) + delta));
        return s;
      }) };
      // Ensure reputation remains 0
      updated.reputation = 0;
      if (gameState.currentUser === ADMIN_ACCOUNT.email.toLowerCase()) userStorage.saveAdminState({ isAuthenticated: true, company: updated, sidebarCollapsed: gameState.sidebarCollapsed });
      else { userStorage.updateUser(gameState.currentUser, { company: updated }); userStorage.saveUserGameState(gameState.currentUser, { isAuthenticated: true, company: updated, sidebarCollapsed: gameState.sidebarCollapsed }); }
      setGameState(prev => ({ ...prev, company: updated }));
    } catch (err) {
      console.error('adjustSalary error', err);
    }
  };

  /**
   * setVacation
   * @description Apply or remove vacation days. Denies vacation if staff in training or assigned to job.
   */
  const setVacation = (staffId: string, days: number | null): { success: boolean; message: string } => {
    if (!gameState.company || !gameState.currentUser) return { success: false, message: 'No active company' };
    try {
      const companyClone: any = JSON.parse(JSON.stringify(gameState.company));
      const idx = (companyClone.staff || []).findIndex((s: any) => s.id === staffId);
      if (idx === -1) return { success: false, message: 'Staff not found' };
      const staff = companyClone.staff[idx];

      // Deny if training
      if (staff.training) return { success: false, message: 'Cannot put staff on vacation during training' };

      // Deny if assigned to job
      const assignedJob = (companyClone.activeJobs || []).find((j: any) => !['completed', 'cancelled'].includes(j.status) && j.assignedDriver === staffId);
      if (assignedJob) return { success: false, message: 'Cannot put staff on vacation while assigned to a job' };

      if (typeof days === 'number' && days > 0) {
        const until = new Date(); until.setDate(until.getDate() + Math.floor(days));
        staff.onVacationUntil = until.toISOString();
        staff.status = 'on_vacation';
        staff.happiness = Math.min(100, (typeof staff.happiness === 'number' ? staff.happiness : 100) + 5);
      } else {
        staff.onVacationUntil = null;
        staff.status = 'available';
      }

      // Persist and ensure reputation remains 0
      companyClone.reputation = 0;
      if (gameState.currentUser === ADMIN_ACCOUNT.email.toLowerCase()) userStorage.saveAdminState({ isAuthenticated: true, company: companyClone, sidebarCollapsed: gameState.sidebarCollapsed });
      else { userStorage.updateUser(gameState.currentUser, { company: companyClone }); userStorage.saveUserGameState(gameState.currentUser, { isAuthenticated: true, company: companyClone, sidebarCollapsed: gameState.sidebarCollapsed }); }
      setGameState(prev => ({ ...prev, company: companyClone }));
      return { success: true, message: 'Vacation updated' };
    } catch (err) {
      console.error('setVacation error', err);
      return { success: false, message: 'Failed to update vacation' };
    }
  };

  /**
   * improveSkill
   */
  const improveSkill = (staffId: string, skill: string | null) => {
    if (!gameState.company || !gameState.currentUser || !skill) return;
    try {
      const updated = { ...gameState.company, staff: (gameState.company.staff || []).map((s: any) => {
        if (s.id !== staffId) return s;
        s.skills = Array.isArray(s.skills) ? s.skills : (s.skills ? [s.skills] : []);
        if (!s.skills.includes(skill)) s.skills.push(skill);
        s.happiness = Math.max(0, Math.min(100, (typeof s.happiness === 'number' ? s.happiness : 100) + 3));
        return s;
      }) };
      updated.reputation = 0;
      if (gameState.currentUser === ADMIN_ACCOUNT.email.toLowerCase()) userStorage.saveAdminState({ isAuthenticated: true, company: updated, sidebarCollapsed: gameState.sidebarCollapsed });
      else { userStorage.updateUser(gameState.currentUser, { company: updated }); userStorage.saveUserGameState(gameState.currentUser, { isAuthenticated: true, company: updated, sidebarCollapsed: gameState.sidebarCollapsed }); }
      setGameState(prev => ({ ...prev, company: updated }));
    } catch (err) {
      console.error('improveSkill error', err);
    }
  };

  /**
   * promoteStaff
   */
  /**
   * promoteStaff
   * @description Promote a staff member.
   *  - Allowed source roles: driver, mechanic, dispatcher
   *  - Dispatchers may be promoted ONLY to 'manager'
   *  - On promotion: cancel training, reset skillsProgress to 0%, mark promoted flag, set happiness to 100, bump salary modestly
   */
  const promoteStaff = (staffId: string, newRole?: string) => {
    if (!gameState.company || !gameState.currentUser) return;
    try {
      const allowedSources = ['driver', 'mechanic', 'dispatcher'];
      const updated = { ...gameState.company, staff: (gameState.company.staff || []).map((s: any) => {
        if (s.id !== staffId) return s;

        const currentRole = s.role;
        if (!allowedSources.includes(currentRole)) {
          // Not promotable
          console.warn(`[GameContext] promoteStaff: role "${currentRole}" cannot be promoted`);
          return s;
        }

        // Dispatchers may only be promoted to manager
        if (currentRole === 'dispatcher') {
          newRole = 'manager';
        }

        // Determine target role fallback logic
        const targetRole = (newRole as any) || (currentRole === 'driver' ? 'dispatcher' : (currentRole === 'mechanic' ? 'dispatcher' : currentRole));

        // Apply promotion effects
        s.role = targetRole;
        s.promoted = true; // prevent repeated promotions

        // Cancel training if present
        if (s.training) {
          s.training = null;
        }

        // Reset skill progress to 0% for all skills and clear skill cards
        s.skillsProgress = {};
        s.skillCards = [];

        // Normalize/adjust happiness and salary
        s.happiness = 100;
        const prevSalary = typeof s.salary === 'number' ? s.salary : 0;
        s.salary = Math.max(0, prevSalary + Math.floor(prevSalary * 0.15) + 100);

        return s;
      }) };

      // Ensure reputation remains 0 when persisting
      updated.reputation = 0;
      if (gameState.currentUser === ADMIN_ACCOUNT.email.toLowerCase()) {
        userStorage.saveAdminState({ isAuthenticated: true, company: updated, sidebarCollapsed: gameState.sidebarCollapsed });
      } else {
        userStorage.updateUser(gameState.currentUser, { company: updated });
        userStorage.saveUserGameState(gameState.currentUser, { isAuthenticated: true, company: updated, sidebarCollapsed: gameState.sidebarCollapsed });
      }
      setGameState(prev => ({ ...prev, company: updated }));
    } catch (err) {
      console.error('promoteStaff error', err);
    }
  };

  /**
   * fireStaff
   */
  const fireStaff = (staffId: string) => {
    if (!gameState.company || !gameState.currentUser) return;
    try {
      const updated = { ...gameState.company, staff: (gameState.company.staff || []).filter((s: any) => s.id !== staffId) };
      updated.activeJobs = (updated.activeJobs || []).map((j: any) => {
        if (j.assignedDriver === staffId) j.assignedDriver = '';
        return j;
      });
      updated.reputation = 0;
      if (gameState.currentUser === ADMIN_ACCOUNT.email.toLowerCase()) userStorage.saveAdminState({ isAuthenticated: true, company: updated, sidebarCollapsed: gameState.sidebarCollapsed });
      else { userStorage.updateUser(gameState.currentUser, { company: updated }); userStorage.saveUserGameState(gameState.currentUser, { isAuthenticated: true, company: updated, sidebarCollapsed: gameState.sidebarCollapsed }); }
      setGameState(prev => ({ ...prev, company: updated }));
    } catch (err) {
      console.error('fireStaff error', err);
    }
  };

  /**
   * startTraining
   * @description Schedule a multi-day training for a staff member.
   *              Default days: random 7..10. Cost deducted immediately.
   */
  const startTraining = (staffId: string, skillName: string, days?: number): { success: boolean; message: string } => {
    if (!gameState.company || !gameState.currentUser) return { success: false, message: 'No active company/user' };

    try {
      const companyClone: any = JSON.parse(JSON.stringify(gameState.company));
      const idx = (companyClone.staff || []).findIndex((s: any) => s.id === staffId);
      if (idx === -1) return { success: false, message: 'Staff not found' };
      const staff = companyClone.staff[idx];

      // Pre-checks
      if (staff.training) return { success: false, message: 'Staff is already in training' };
      const now = Date.now();
      const onVacation = staff.onVacationUntil ? (new Date(staff.onVacationUntil).getTime() > now) : false;
      if (onVacation) return { success: false, message: 'Staff is on vacation' };
      const assignedJob = (companyClone.activeJobs || []).find((j: any) => !['completed', 'cancelled'].includes(j.status) && j.assignedDriver === staffId);
      if (assignedJob) return { success: false, message: 'Staff is currently assigned to a job' };
      if (staff.status !== 'available') return { success: false, message: `Staff must be 'available' to start training (current status: ${staff.status})` };

      const plannedDays = typeof days === 'number' && days >= 1 ? Math.floor(days) : Math.floor(7 + Math.random() * 4); // 7..10

      // Determine current skill percent
      const prevPct = Number(staff.skillsProgress?.[skillName] ?? 0);
      const cost = Math.round(Math.max(1000, Math.min(5000, 1000 + (prevPct / 100) * 4000)));

      if ((companyClone.capital || 0) < cost) return { success: false, message: 'Insufficient capital' };

      // Deduct cost immediately
      companyClone.capital = Math.max(0, (companyClone.capital || 0) - cost);

      // Prepare training entry
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + plannedDays);
      const trainingEntry = {
        skill: skillName,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        totalDays: plannedDays,
        cost
      };

      // Apply to staff
      companyClone.staff[idx] = { ...staff, training: trainingEntry, status: 'training' };

      // Persist and ensure reputation stays 0
      companyClone.reputation = 0;
      if (gameState.currentUser === ADMIN_ACCOUNT.email.toLowerCase()) userStorage.saveAdminState({ isAuthenticated: true, company: companyClone, sidebarCollapsed: gameState.sidebarCollapsed });
      else { userStorage.updateUser(gameState.currentUser, { company: companyClone }); userStorage.saveUserGameState(gameState.currentUser, { isAuthenticated: true, company: companyClone, sidebarCollapsed: gameState.sidebarCollapsed }); }
      setGameState(prev => ({ ...prev, company: companyClone }));

      return { success: true, message: `Training started for ${staff.name} on \"${skillName}\" (${plannedDays} days, cost $${cost.toLocaleString()})` };
    } catch (err) {
      console.error('startTraining error', err);
      return { success: false, message: 'Failed to start training' };
    }
  };

  /**
   * Provide context value
   */
  const ctxValue: GameContextType = {
    gameState,
    setCurrentPage,
    toggleSidebar,
    login,
    register,
    createCompany,
    acceptJob,
    completeJob,
    cancelJob,
    logout,
    clearOldData,
    switchUser,
    hireStaff,
    adjustSalary,
    setVacation,
    improveSkill,
    promoteStaff,
    fireStaff,
    startTraining
  };

  return (
    <GameContext.Provider value={ctxValue}>
      {children}
    </GameContext.Provider>
  );
};

export default GameContext;