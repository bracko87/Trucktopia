/**
 * src/lib/supabaseClient.ts
 *
 * Initialize and export a single Supabase client instance for the app.
 *
 * Note:
 * - Expects VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to be provided in the environment.
 * - Do not commit service_role keys to the client or repository.
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
 * Resolved supabase env values (fallback aliases supported)
 */
export const SUPABASE_URL =
  getEnvVar('VITE_SUPABASE_URL') ??
  getEnvVar('REACT_APP_SUPABASE_URL') ??
  getEnvVar('SUPABASE_URL') ??
  '';

export const SUPABASE_ANON_KEY =
  getEnvVar('VITE_SUPABASE_ANON_KEY') ??
  getEnvVar('REACT_APP_SUPABASE_ANON_KEY') ??
  getEnvVar('SUPABASE_ANON_KEY') ??
  '';

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
    // Avoid creating the client with empty strings which causes a hard throw inside supabase-js.
    // Log a friendly warning for debugging in preview environments.
    if (typeof console !== 'undefined') {
      console.warn(
        '[supabaseClient] Supabase environment variables are missing. Supabase client not initialized.'
      );
    }
    return null;
  }

  // Safe: values exist
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
})();