/**
 * initializeTruckComponents.ts
 *
 * Helper to call the Supabase RPC rpc_initialize_truck_components to ensure every
 * truck has a full set of component rows (value = 100 initial).
 *
 * Intended usage:
 * - Run on truck creation server-side to "bootstrap" components for a new truck.
 * - Run as an admin / migration script for existing trucks to backfill missing rows.
 *
 * Note:
 * - This file expects a Supabase client (supabase-js). To keep the helper generic
 *   we type the client as `any` to avoid adding new dependencies in this environment.
 *
 * - Execution should be done server-side (with a supabase service role or a server endpoint)
 *   to avoid exposing the service key to end users.
 */

/**
 * InitializeTruckComponentsResult
 * @description Minimal shape returned by the RPC call.
 */
export interface InitializeTruckComponentsResult {
  truck_id: string;
  component_key: string;
  value: number;
  updated_at: string | null;
  source: string | null;
  version: number | null;
  meta: Record<string, any> | null;
}

/**
 * initializeTruckComponents
 * @description Call Supabase RPC rpc_initialize_truck_components to ensure every component row exists for a truck.
 *
 * @param supabaseClient - Supabase client instance (e.g. created by createClient from @supabase/supabase-js)
 * @param truckId - Truck identifier (string/uuid)
 * @returns Array of initialized/ensured component rows
 *
 * @throws Error when RPC fails
 */
export async function initializeTruckComponents(
  supabaseClient: any,
  truckId: string
): Promise<InitializeTruckComponentsResult[]> {
  if (!truckId) throw new Error('truckId is required');

  try {
    // Supabase RPC invocation
    // Note: the rpc name expects a single parameter p_truck_id (text)
    const { data, error } = await supabaseClient.rpc('rpc_initialize_truck_components', { p_truck_id: truckId });

    if (error) {
      throw error;
    }

    // The returned data shape should match InitializeTruckComponentsResult
    return (data as InitializeTruckComponentsResult[]) ?? [];
  } catch (err: any) {
    // Re-throw with context to surface in logs
    throw new Error(`initializeTruckComponents RPC failed for truckId=${truckId}: ${err?.message ?? String(err)}`);
  }
}

/**
 * Example (server-side) usage:
 *
 * import { createClient } from '@supabase/supabase-js';
 * import { initializeTruckComponents } from './initializeTruckComponents';
 *
 * const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
 * await initializeTruckComponents(supabase, 'truck-abc-123');
 *
 * IMPORTANT: Use the service role key or a server-side function to call this RPC so you can validate
 * that the truck belongs to the caller's company before initializing components.
 */