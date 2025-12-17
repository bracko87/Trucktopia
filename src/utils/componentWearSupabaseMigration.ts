/**
 * componentWearSupabaseMigration.ts
 *
 * Migration helper/spec for moving per-truck component state from localStorage
 * into Supabase (Postgres). This file contains TypeScript interfaces, a small
 * checklist and skeleton functions (no external dependencies) to guide implementation.
 *
 * Responsibilities:
 * - Provide canonical types for truck component records, snapshots and RPC payloads
 * - Contain a migration checklist and recommended RPC shapes
 * - Offer skeleton client helpers for optimistic sync and reconciliation
 */

/**
 * TruckComponentRecord
 * @description Represents a component value stored in Supabase.
 */
export interface TruckComponentRecord {
  id: string; // uuid
  truck_id: string;
  component_key: string; // e.g. "engine", "tires"
  value: number; // 0..100
  updated_by?: string | null;
  updated_at?: string; // ISO timestamp
  source?: string | null;
  version?: number;
  meta?: Record<string, any>;
}

/**
 * TruckSnapshot
 * @description Aggregated snapshot for a truck including computed overall condition.
 */
export interface TruckSnapshot {
  truck_id: string;
  overall_condition: number; // 0..100
  last_update_at?: string;
  version?: number;
}

/**
 * ApplyWearPayload
 * @description Payload that a client sends to an RPC to apply wear deltas.
 */
export interface ApplyWearPayload {
  truckId: string;
  deltas: Array<{ component: string; deltaValue: number }>; // negative numbers reduce value
  distanceKm?: number;
  clientTimestamp?: string;
  requestId?: string; // idempotency
}

/**
 * ApplyWearResult
 * @description Result returned by the RPC: authoritative state and optional offers/incidents.
 */
export interface ApplyWearResult {
  truckId: string;
  components: TruckComponentRecord[];
  snapshot?: TruckSnapshot;
  offers?: any[]; // maintenance offers created
  incidents?: any[]; // incidents emitted
  reconciled?: boolean; // whether server modified local client's proposed values
  requestId?: string;
}

/**
 * Migration checklist (high-level)
 * 1. Add `truck_components` table and unique (truck_id, component_key)
 * 2. Add `truck_component_snapshot` view/table to store overall_condition
 * 3. Create RPC `rpc_apply_component_wear(truck_id text, payload jsonb)`:
 *    - Validate ownership (RLS)
 *    - Apply wear deltas safely (optimistic concurrency via version or timestamp)
 *    - Return authoritative components and snapshot
 * 4. Update client engine:
 *    - Keep localStorage for fast UI
 *    - Send background RPC calls to persist changes (optimistic)
 *    - Reconcile when server returns authoritative state
 * 5. Add offline queue (IndexedDB/localStorage) and flush on reconnect
 * 6. Add admin tools and monitoring
 */

/**
 * Skeleton: client helper that would call the RPC and reconcile results.
 *
 * Note: This is a minimal skeleton (no network code). Replace the `rpcCall`
 * stub with your Supabase client RPC invocation.
 */

/**
 * rpcCall
 * @description Replace this stub with actual supabase.rpc or fetch call to your server endpoint.
 * @param name RPC name or path
 * @param payload Payload object
 */
async function rpcCall(name: string, payload: any): Promise<any> {
  // TODO: Implement with supabase.rpc(name, payload) or fetch to edge function
  // Example (supabase-js):
  // const { data, error } = await supabase.rpc('rpc_apply_component_wear', { truck_id: payload.truckId, payload: payload });
  return Promise.resolve({ data: null, error: null });
}

/**
 * applyWearAndSync
 * @description Apply wear locally (optimistic), then call RPC to persist and reconcile.
 * @param payload ApplyWearPayload
 * @returns ApplyWearResult
 */
export async function applyWearAndSync(payload: ApplyWearPayload): Promise<ApplyWearResult | null> {
  // 1) Optimistically update local cache (localStorage or in-memory)
  // 2) Call RPC to persist changes
  // 3) Reconcile server response with local state
  try {
    const rpcName = 'rpc_apply_component_wear';
    const { data, error } = await rpcCall(rpcName, payload);
    if (error) {
      // handle retry / queue
      return null;
    }
    // data should be shaped like ApplyWearResult
    return (data as ApplyWearResult) ?? null;
  } catch (e) {
    // queue for later
    return null;
  }
}

/**
 * Notes:
 * - Ensure RPC enforces row-level security so only authorized accounts modify truck data.
 * - Use idempotency keys (requestId) to avoid double-application of the same delta.
 * - Consider batching writes every N seconds or after M km to reduce write volume.
 */