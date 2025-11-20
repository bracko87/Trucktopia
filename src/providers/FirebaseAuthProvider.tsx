/**
 * src/providers/FirebaseAuthProvider.tsx
 *
 * React provider that exposes Firebase auth state and basic helpers.
 *
 * Exports:
 * - FirebaseAuthProvider: provider component
 * - useFirebaseAuth: hook to consume auth context
 *
 * Responsibilities:
 * - Provide the current user and loading flag
 * - Offer signIn / signUp / signOut helpers for use across the app
 *
 * Notes:
 * - Uses modular firebase/auth.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from '../lib/firebaseClient';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  signUp: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  signOutUser: () => Promise<void>;
}

/**
 * AuthContext
 * @description Internal React context for Firebase auth.
 */
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * FirebaseAuthProvider
 * @description Provide authenticated user state and common auth functions to the app.
 */
export const FirebaseAuthProvider: React.FC<React.PropsWithChildren<Record<string, unknown>>> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Subscribe to Firebase auth changes
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  /**
   * signIn
   * @description Sign in user with email & password using Firebase SDK.
   */
  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Sign in failed' };
    }
  };

  /**
   * signUp
   * @description Register a new user with email & password using Firebase SDK.
   */
  const signUp = async (email: string, password: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Sign up failed' };
    }
  };

  /**
   * signOutUser
   * @description Sign out the current user.
   */
  const signOutUser = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOutUser }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * useFirebaseAuth
 * @description Hook to consume the Firebase auth context.
 */
export const useFirebaseAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useFirebaseAuth must be used within FirebaseAuthProvider');
  return ctx;
};
