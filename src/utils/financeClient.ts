/**
 * financeClient.ts
 *
 * Small client helper to call the server RPC wrapper (/.netlify/functions/finance-apply).
 * - Keeps calls centralized and returns a predictable shape.
 * - Designed to be a minimal, safe helper you can call from CreateCompany (or anywhere).
 */

export interface FinanceApplyParams {
  companyId: string;
  deltaCents: number;
  type: string;
  description?: string;
  idempotencyKey?: string;
  /** Optional bearer token if your Netlify function requires it. */
  token?: string | null;
}

export interface FinanceApplyResult {
  success: boolean;
  transaction?: any;
  newBalanceCents?: number | null;
  error?: string;
}

/**
 * financeApply
 * @description Call the server-side finance-apply function to apply a delta to company balance.
 *              Returns success + inserted transaction and canonical new balance (cents) when available.
 *
 * @param params FinanceApplyParams
 * @returns Promise<FinanceApplyResult>
 */
export async function financeApply(params: FinanceApplyParams): Promise<FinanceApplyResult> {
  try {
    const body = {
      companyId: params.companyId,
      deltaCents: params.deltaCents,
      type: params.type,
      description: params.description ?? '',
      idempotencyKey: params.idempotencyKey ?? undefined
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (params.token) headers['Authorization'] = `Bearer ${params.token}`;

    const resp = await fetch('/.netlify/functions/finance-apply', {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    const text = await resp.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = text; }

    if (!resp.ok) {
      const errMsg = (json && (json.error || json.message)) || (typeof json === 'string' ? json : `HTTP ${resp.status}`);
      return { success: false, error: String(errMsg) };
    }

    // Normalize expected response shapes. Common keys: transaction, new_balance_cents, newBalanceCents, balance_after
    const transaction = json?.transaction ?? json?.tx ?? null;
    const newBalanceCents = (json?.new_balance_cents ?? json?.newBalanceCents ?? json?.balance_after ?? null);

    return {
      success: true,
      transaction,
      newBalanceCents: typeof newBalanceCents === 'number' ? newBalanceCents : null
    };
  } catch (err: any) {
    return { success: false, error: err?.message ?? String(err) };
  }
}