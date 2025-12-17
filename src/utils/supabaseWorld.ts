/**
 * supabaseWorld.ts
 *
 * Helper utilities to reliably set and manage the session world for Supabase-backed requests.
 *
 * Purpose:
 * - Provide a small typed helper that calls the RPC public.set_request_world(world)
 *   to set the session-level GUC "request.world_id".
 * - This ensures the Row-Level Security policies (created by the SQL migration)
 *   can read current_setting('request.world_id') and enforce world isolation.
 *
 * Notes:
 * - This file assumes your project already exposes a Supabase client instance.
 *   Replace the `supabaseClient` import path with your actual client.
 * - For security: the front-end should only call setRequestWorld with the world
 *   that corresponds to the built site (process.env.WORLD). Never allow arbitrary
 *   client-side world switching without server-side checks.
 */

/**
 * Import / adapt:
 * - Replace the import below with your project's supabase client.
 * - Example: import { supabase } from '../lib/supabaseClient';
 */
import { SupabaseClient } from '@supabase/supabase-js';
/**
 * supabaseClient placeholder
 * @remarks
 * Replace this with your actual Supabase client import.
 * Example:
 * import { supabase } from '../lib/supabaseClient';
 */
const supabaseClient: SupabaseClient = (null as unknown) as SupabaseClient;

/**
 * setRequestWorld
 * @description Call the DB RPC public.set_request_world to set the session-local world id.
 *              The RPC returns the value it set (string) on success.
 * @param client SupabaseClient instance
 * @param world string The world slug to set (e.g., 'euroasia' or 'american')
 * @returns Promise<string | null> The world that was set, or null on error.
 */
export async function setRequestWorld(client: SupabaseClient, world: string): Promise<string | null> {
  /**
   * Note:
   * - The RPC was created as SECURITY DEFINER in the DB migration; ensure the function
   *   exists and the authenticated role has EXECUTE permission (migration grants it).
   * - If you prefer a server-side model, call this RPC from a serverless endpoint
   *   immediately after authentication, instead of from the browser.
   */
  try {
    const { data, error } = await client.rpc('set_request_world', { w: world });
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to set request world:', error);
      return null;
    }
    // When successful, the RPC returns the current_setting value
    return (data as unknown) as string;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Unexpected error setting request world:', err);
    return null;
  }
}

/**
 * ensureWorldOnSession
 * @description Convenience wrapper: call after login to ensure session has world set.
 *              Uses the provided Supabase client and defaults to the build-time WORLD env.
 * @param client SupabaseClient
 * @param world Optional world slug; if omitted uses process.env.WORLD
 */
export async function ensureWorldOnSession(client: SupabaseClient, world?: string) {
  const target = world ?? (process?.env?.WORLD as string) ?? 'euroasia';
  await setRequestWorld(client, target);
}

/**
 * Export a default function that uses the placeholder client.
 * Replace usage with your project's client instead of the placeholder.
 */
export default {
  setRequestWorld: (world: string) => setRequestWorld(supabaseClient, world),
  ensureWorldOnSession: (world?: string) => ensureWorldOnSession(supabaseClient, world)
};