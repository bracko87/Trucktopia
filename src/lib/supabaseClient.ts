/**
 * src/lib/supabaseClient.ts
 *
 * File-level: Initialize and export a single Supabase client instance for the app.
 *
 * Notes:
 * - This file normally reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from runtime
 *   environment variables using getEnvVar(...) so imports are safe in multiple runtimes.
 * - For troubleshooting we temporarily hard-code the public anon key and project URL
 *   so the Supabase client is initialized at import time and the application picks the
 *   Supabase adapter instead of the local storage fallback.
 *
 * SECURITY:
 * - The anon key is the public client key (safe for client use). Do NOT add any service_role
 *   or other secret keys to client files or share them publicly.
 * - After troubleshooting we will revert this file to use environment variables again.
 */

import { createClient } from '@supabase/supabase-js';

/**
 * getEnvVar
 * @description Safely read an environment variable from multiple possible runtime sources:
 * - Vite: import.meta.env
 * - Node/build-time: process.env
 * - Window injection: window.__env (optional)
 *
 * This guard avoids runtime errors when import.meta is not available in the environment.
 * @param key Environment variable name to read
 */
function getEnvVar(key: string): string | undefined {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      return (import.meta as any).env[key];
    }
  } catch {
    // ignore
  }

  try {
    if (typeof process !== 'undefined' && (process as any).env) {
      return (process as any).env[key];
    }
  } catch {
    // ignore
  }

  try {
    if (typeof window !== 'undefined' && (window as any).__env) {
      return (window as any).__env[key];
    }
  } catch {
    // ignore
  }

  return undefined;
}

/**
 * Temporary hard-coded public Supabase values for troubleshooting.
 * Replace these with environment-driven values when resolved.
 */
export const SUPABASE_URL =
  getEnvVar('VITE_SUPABASE_URL') ?? 'https://yzzcipizchqntbijktaj.supabase.co';
export const SUPABASE_ANON_KEY =
  getEnvVar('VITE_SUPABASE_ANON_KEY') ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6emNpcGl6Y2hxbnRiaWprdGFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1OTUzNzksImV4cCI6MjA3OTE3MTM3OX0.NokGmxnBMTsdHyfOa1WHASWLt-aTx-c7FgBF-h8Flqo';

/**
 * isSupabaseConfigured
 * @description Returns true when both URL and ANON key are present (non-empty).
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/**
 * supabase
 * @description Create a Supabase client only when configuration is present.
 * When not configured we export null to avoid the "supabaseUrl is required" runtime error.
 * Consumers that need the client should first check isSupabaseConfigured().
 */
export const supabase = ((): ReturnType<typeof createClient> | null => {
  if (!isSupabaseConfigured()) {
    if (typeof console !== 'undefined') {
      console.warn(
        '[supabaseClient] Supabase environment variables are missing. Supabase client not initialized.'
      );
    }
    return null;
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
})();