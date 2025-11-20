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

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * supabase
 * @description A createClient instance. When env vars are missing the client will still be created
 * but attempts to call auth/database functions will surface errors. The app's AuthProvider
 * checks presence of env vars and can fall back to a local adapter when needed.
 */
export const supabase = createClient(
  SUPABASE_URL ?? '',
  SUPABASE_ANON_KEY ?? ''
);