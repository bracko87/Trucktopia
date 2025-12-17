/**
 * supabaseComponentWearClient.ts
 *
 * Purpose:
 * - Lightweight client helper to call the Supabase RPC rpc_apply_component_wear.
 * - This helper deliberately avoids adding external dependencies (no supabase-js).
 * - Use server-side environment variables or a secure proxy for SUPABASE_KEY in production.
 *
 * NOTE:
 * - This file is a starting point and intended for dev/staging. Never ship a service
 *   key to public clients. Use anon key only where your RLS policies allow it safely.
 */

/**
 * RpcApplyResponse
 * @description Minimal shape returned by rpc_apply_component_wear SQL function.
 */
export interface RpcApplyResponse {
  components: Record<string, number>;
  snapshot: {
    truck_id: string;
    overall_condition: number;
    components: Record<string, number>;
    computed_at: string;
    version: number;
  };
  offers: any[];
}

/**
 * applyComponentWearRpc
 * @description Call the Supabase RPC to apply a batch of component updates for a truck.
 *
 * @param supabaseUrl Supabase project URL (e.g. https://xyz.supabase.co)
 * @param supabaseKey Supabase anon or service key (use server-side for service key)
 * @param truckId truck uuid string
 * @param updates JSON array of updates: [{ component: 'engine', delta: 0.2 }, { component: 'tires', value: 87 }]
 * @param opts optional source/request id for debugging
 *
 * @returns RpcApplyResponse
 */
export async function applyComponentWearRpc(
  supabaseUrl: string,
  supabaseKey: string,
  truckId: string,
  updates: Array<{ component: string; delta?: number; value?: number }>,
  opts?: { source?: string; requestId?: string }
): Promise<RpcApplyResponse> {
  // Basic validation
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL and Key are required');
  }
  const body = {
    p_truck_id: truckId,
    p_updates: JSON.stringify(updates),
    p_source: opts?.source ?? 'client',
    p_request_id: opts?.requestId ?? null
  };

  // Supabase RPC endpoint: POST ${SUPABASE_URL}/rest/v1/rpc/rpc_apply_component_wear
  // If you prefer GraphQL or supabase-js, replace this fetch with appropriate client.
  const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/rpc_apply_component_wear`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Use Bearer <anon or service key>. Prefer server-side service key for writes requiring authority.
      Authorization: `Bearer ${supabaseKey}`,
      apikey: supabaseKey
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Supabase RPC failed: ${res.status} ${res.statusText} - ${t}`);
  }

  // Supabase returns application/json; parse.
  const data = await res.json();
  // The RPC returns a single JSONB object; when proxied via /rest/v1/rpc the response might be an array.
  const payload = Array.isArray(data) && data.length > 0 ? data[0] : data;

  return payload as RpcApplyResponse;
}

/**
 * Example usage (dev):
 *
 * (async () => {
 *   const resp = await applyComponentWearRpc(
 *     'https://xyz.supabase.co',
 *     window.__SUPABASE_ANON_KEY || '',
 *     '00000000-0000-0000-0000-000000000000',
 *     [{ component: 'engine', delta: 0.5 }]
 *   );
 *   console.log('RPC Apply result', resp);
 * })();
 */