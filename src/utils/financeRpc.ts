/**
 * financeRpc.ts
 *
 * Utility to call the Supabase RPC "finance_apply" from the frontend.
 * - Reads Supabase URL/ANON key from the Netlify function /.netlify/functions/supabase-config
 * - Calls Supabase REST RPC endpoint: POST {SUPABASE_URL}/rest/v1/rpc/finance_apply
 *
 * Responsibilities:
 * - Provide a simple typed interface for finance actions (loan/spend/earn/hire)
 * - Throw descriptive errors for caller handling
 */

export type FinanceAction = 'loan' | 'spend' | 'earn' | 'hire' | string;

/**
 * FinanceApplyPayload
 * @description Payload forwarded to the finance_apply RPC. Keep flexible to allow metadata.
 */
export interface FinanceApplyPayload {
  action: FinanceAction;
  amount: number;
  metadata?: Record<string, any>;
}

/**
 * FinanceApplyResult
 * @description Result shape returned by the RPC. Many Supabase RPCs return JSON objects,
 *              keep the type open so callers can consume fields they expect.
 */
export type FinanceApplyResult = any;

/**
 * fetchSupabaseConfig
 * @description Fetch SUPABASE_URL and SUPABASE_ANON_KEY from the local Netlify function.
 * @throws Error on network or missing keys.
 */
async function fetchSupabaseConfig(): Promise<{ SUPABASE_URL: string; SUPABASE_ANON_KEY: string }> {
  const res = await fetch('/.netlify/functions/supabase-config', { cache: 'no-store' });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Failed to load Supabase config (status ${res.status}) ${txt}`);
  }
  const json = await res.json().catch(() => null);
  if (!json) throw new Error('Invalid JSON from supabase-config function');
  const SUPABASE_URL = String(json.SUPABASE_URL ?? json.SUPABASE_URL ?? json.supabase_url ?? '');
  const SUPABASE_ANON_KEY = String(json.SUPABASE_ANON_KEY ?? json.SUPABASE_ANON_KEY ?? json.supabase_anon_key ?? '');
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase config missing SUPABASE_URL or SUPABASE_ANON_KEY');
  }
  return { SUPABASE_URL, SUPABASE_ANON_KEY };
}

/**
 * financeApplyRPC
 * @description Call the Supabase RPC "finance_apply" via REST.
 *              The function expects a POST JSON body { action, amount, metadata }.
 *
 * @param payload FinanceApplyPayload
 * @returns Promise<FinanceApplyResult>
 * @throws Error on network / RPC errors
 */
export async function financeApplyRPC(payload: FinanceApplyPayload): Promise<FinanceApplyResult> {
  // Validate minimal payload
  if (!payload || typeof payload.amount !== 'number') {
    throw new Error('Invalid payload: amount (number) is required');
  }

  const { SUPABASE_URL, SUPABASE_ANON_KEY } = await fetchSupabaseConfig();

  // Build RPC endpoint. Use rest/v1/rpc/<fn>
  const base = SUPABASE_URL.replace(/\/+$/, '');
  const rpcUrl = `${base}/rest/v1/rpc/finance_apply`;

  const body = {
    action: payload.action,
    amount: payload.amount,
    metadata: payload.metadata ?? {},
  };

  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    // Try to extract useful error info
    let errText = '';
    try {
      errText = await res.text();
    } catch {
      errText = `(status ${res.status})`;
    }
    throw new Error(`finance_apply RPC failed: ${errText}`);
  }

  const data = await res.json().catch(() => null);
  return data;
}