/**
 * src/contexts/SupabaseAuthContext.tsx
 *
 * Provides a simple AuthContext for the application that uses an AuthAdapter internally.
 * The provider selects SupabaseAdapter when VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are present,
 * otherwise it falls back to LocalStorageAdapter to preserve current behavior for development.
 *
 * The goal:
 * - Centralize auth calls (signIn, signUp, signOut)
 * - Expose a consistent user object regardless of backend
 * - Make migration to Supabase seamless by swapping adapters
 */

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AuthAdapter, AuthUser, LocalStorageAdapter, SupabaseAdapter } from '../utils/authAdapters';

interface SupabaseAuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ user?: AuthUser | null; error?: any }>;
  signIn: (email: string, password: string) => Promise<{ user?: AuthUser | null; error?: any }>;
  signOut: () => Promise<{ error?: any }>;
  usingLocalAdapter: boolean;
}

/**
 * AuthContext
 * @description Holds authentication state and actions for the app.
 */
const AuthContext = createContext<SupabaseAuthContextValue | undefined>(undefined);

/**
 * SupabaseAuthProvider
 * @description Wrap your app with this provider to get auth state and functions. It chooses an adapter
 * depending on presence of VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
 */
export const SupabaseAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Determine whether Supabase env is configured
  const hasSupabaseEnv = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

  const adapter: AuthAdapter = useMemo(() => {
    return hasSupabaseEnv ? SupabaseAdapter() : LocalStorageAdapter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSupabaseEnv]);

  const usingLocalAdapter = !hasSupabaseEnv;

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    adapter
      .getUser()
      .then((u) => {
        if (!mounted) return;
        setUser(u);
      })
      .catch((err) => {
        console.error('AuthProvider.getUser error', err);
        setUser(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    // Note: Supabase emits auth state changes via its client; if you want tighter sync for the SupabaseAdapter
    // you can add a listener here. For LocalStorageAdapter this is not necessary.
    return () => {
      mounted = false;
    };
  }, [adapter]);

  /**
   * signUp
   * @description Proxy signUp to the chosen adapter and update local state on success
   */
  const signUp = async (email: string, password: string) => {
    setLoading(true);
    const result = await adapter.signUp(email, password);
    if (result.user) setUser(result.user);
    setLoading(false);
    return result;
  };

  /**
   * signIn
   * @description Proxy signIn to the chosen adapter and update local state on success
   */
  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const result = await adapter.signIn(email, password);
    if (result.user) setUser(result.user);
    setLoading(false);
    return result;
  };

  /**
   * signOut
   * @description Proxy signOut and clear local user state
   */
  const signOut = async () => {
    setLoading(true);
    const result = await adapter.signOut();
    setUser(null);
    setLoading(false);
    return result;
  };

  const value: SupabaseAuthContextValue = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    usingLocalAdapter
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * useSupabaseAuth
 * @description Hook to access auth state/actions
 */
export const useSupabaseAuth = (): SupabaseAuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useSupabaseAuth must be used inside SupabaseAuthProvider');
  }
  return ctx;
};