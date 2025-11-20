/**
 * src/utils/authAdapters.ts
 *
 * AuthAdapter interface and two adapter implementations:
 *  - SupabaseAdapter: forwards auth calls to the Supabase client
 *  - LocalStorageAdapter: fallback adapter that persists users/sessions to localStorage
 *
 * These adapters abstract authentication so the UI and business logic can swap providers
 * (local vs Supabase) with minimal changes.
 */

import { supabase } from '../lib/supabaseClient';

/**
 * Minimal user shape used by the adapters.
 */
export interface AuthUser {
  id: string;
  email: string;
  metadata?: Record<string, any>;
}

/**
 * AuthAdapter
 * @description Adapter interface for authentication providers.
 */
export interface AuthAdapter {
  /**
   * getUser
   * @description Return currently authenticated user or null
   */
  getUser(): Promise<AuthUser | null>;

  /**
   * signUp
   * @description Create a new user/account
   */
  signUp(email: string, password: string): Promise<{ user?: AuthUser | null; error?: any }>;

  /**
   * signIn
   * @description Authenticate a user and create a client session
   */
  signIn(email: string, password: string): Promise<{ user?: AuthUser | null; error?: any }>;

  /**
   * signOut
   * @description Terminate current session
   */
  signOut(): Promise<{ error?: any }>;
}

/**
 * SupabaseAdapter
 * @description Implementation of AuthAdapter that delegates to the Supabase client.
 */
export const SupabaseAdapter = (): AuthAdapter => {
  return {
    async getUser() {
      try {
        const {
          data: { session }
        } = await supabase.auth.getSession();
        if (!session?.user) return null;
        return {
          id: session.user.id,
          email: session.user.email ?? '',
          metadata: session.user.user_metadata ?? {}
        };
      } catch (error) {
        console.error('SupabaseAdapter.getUser error', error);
        return null;
      }
    },

    async signUp(email: string, password: string) {
      try {
        const result = await supabase.auth.signUp({ email, password });
        if (result.error) return { error: result.error };
        return {
          user: result.data.user
            ? { id: result.data.user.id, email: result.data.user.email ?? '', metadata: result.data.user.user_metadata ?? {} }
            : null
        };
      } catch (error) {
        return { error };
      }
    },

    async signIn(email: string, password: string) {
      try {
        const result = await supabase.auth.signInWithPassword({ email, password });
        if (result.error) return { error: result.error };
        return {
          user: result.data.user
            ? { id: result.data.user.id, email: result.data.user.email ?? '', metadata: result.data.user.user_metadata ?? {} }
            : null
        };
      } catch (error) {
        return { error };
      }
    },

    async signOut() {
      try {
        const { error } = await supabase.auth.signOut();
        return { error };
      } catch (error) {
        return { error };
      }
    }
  };
};

/**
 * LocalStorageAdapter
 * @description Simple fallback adapter that stores accounts and a single session in localStorage.
 * Use only for development / migration. This is intentionally simple and not cryptographically secure.
 *
 * Keys:
 * - tm_local_users : JSON array of { id, email, password, metadata }
 * - tm_local_session : JSON { id, email }
 */
export const LocalStorageAdapter = (): AuthAdapter => {
  const USERS_KEY = 'tm_local_users';
  const SESSION_KEY = 'tm_local_session';

  const readUsers = (): Array<{ id: string; email: string; password: string; metadata?: Record<string, any> }> => {
    try {
      const raw = localStorage.getItem(USERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const writeUsers = (users: Array<{ id: string; email: string; password: string; metadata?: Record<string, any> }>) => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  };

  const createId = (email: string) => `local-${btoa(email).slice(0, 8)}-${Date.now()}`;

  return {
    async getUser() {
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return { id: parsed.id, email: parsed.email, metadata: parsed.metadata ?? {} } as AuthUser;
      } catch {
        return null;
      }
    },

    async signUp(email: string, password: string) {
      try {
        const users = readUsers();
        const exists = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (exists) {
          return { error: new Error('User already exists') };
        }
        const newUser = { id: createId(email), email, password, metadata: {} };
        users.push(newUser);
        writeUsers(users);
        // Set session
        localStorage.setItem(SESSION_KEY, JSON.stringify({ id: newUser.id, email: newUser.email, metadata: {} }));
        return { user: { id: newUser.id, email: newUser.email, metadata: {} } };
      } catch (error) {
        return { error };
      }
    },

    async signIn(email: string, password: string) {
      try {
        const users = readUsers();
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
        if (!user) return { error: new Error('Invalid credentials') };
        localStorage.setItem(SESSION_KEY, JSON.stringify({ id: user.id, email: user.email, metadata: user.metadata ?? {} }));
        return { user: { id: user.id, email: user.email, metadata: user.metadata ?? {} } };
      } catch (error) {
        return { error };
      }
    },

    async signOut() {
      try {
        localStorage.removeItem(SESSION_KEY);
        return {};
      } catch (error) {
        return { error };
      }
    }
  };
};