/**
 * migrate.js
 *
 * Netlify migration helper that performs migration tasks and (optionally)
 * applies finance operations using the Supabase finance_apply RPC.
 *
 * Responsibilities:
 * - Accept a POST payload containing migration instructions.
 * - For any financeOps provided, call the finance_apply RPC (cents-first) and
 *   return normalized results with transaction (cents) + newBalanceCents.
 * - Return a predictable JSON shape for callers to reconcile balances.
 *
 * File-level and function JSDoc comments present per repository standards.
 */

/**
 * Safe JSON parse helper
 * @param {string | null | undefined} body
 * @returns {any}
 */
function safeJson(body) {
  try {
    return body ? JSON.parse(body) : {};
  } catch {
    return {};
  }
}

/**
 * callFinanceRpc
 * @description Call Supabase finance_apply RPC and normalize the result.
 * @param {object} opts
 * @param {string} opts.supabaseUrl
 * @param {string} opts.supabaseKey
 * @param {string} opts.companyId
 * @param {number} opts.deltaCents
 * @param {string} [opts.type]
 * @param {string} [opts.description]
 * @param {string} [opts.idempotencyKey]
 * @returns {Promise<{ success: boolean, transaction?: any, newBalanceCents?: number, error?: string }>}
 */
async function callFinanceRpc({ supabaseUrl, supabaseKey, companyId, deltaCents, type = 'adjustment', description = null, idempotencyKey = null }) {
  try {
    const rpcUrl = `${supabaseUrl.replace(/\/+$/, '')}/rest/v1/rpc/finance_apply`;
    const body = {
      p_company_id: companyId,
      p_delta: Math.round(Number(deltaCents)),
      p_type: type,
      p_description: description,
      p_meta: null,
      p_idempotency_key: idempotencyKey
    };

    const resp = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Prefer: 'return=representation'
      },
      body: JSON.stringify(body)
    });

    const text = await resp.text().catch(() => null);
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = text; }

    if (!resp.ok) {
      const errMsg = (json && (json.error || json.message)) || (typeof json === 'string' ? json : `RPC returned status ${resp.status}`);
      return { success: false, error: String(errMsg) };
    }

    const row = Array.isArray(json) ? json[0] ?? null : json ?? null;
    const transaction = row ? {
      id: row.id ?? null,
      company_id: row.company_id ?? null,
      created_at: row.created_at ?? null,
      type: row.type ?? null,
      amount_cents: typeof row.amount === 'number' ? Math.round(row.amount) : (row.amount ? Number(row.amount) : null),
      balance_after_cents: typeof row.balance_after === 'number' ? Math.round(row.balance_after) : (row.balance_after ? Number(row.balance_after) : null),
      description: row.description ?? null,
      meta: row.meta ?? null,
      idempotency_key: row.idempotency_key ?? null,
      actor_user_id: row.actor_user_id ?? null
    } : null;

    const newBalanceCents = transaction && typeof transaction.balance_after_cents === 'number' ? transaction.balance_after_cents : null;

    return { success: true, transaction, newBalanceCents };
  } catch (err) {
    return { success: false, error: String(err && err.message ? err.message : err) };
  }
}

/**
 * handler
 * @description Netlify function entry point
 */
exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ success: false, error: 'Method Not Allowed' }) };
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: 'Supabase configuration missing on server' }) };
  }

  const payload = safeJson(event.body);

  try {
    const results = {
      success: true,
      migrated: null,
      financeResults: []
    };

    // Perform generic migration work here (best-effort placeholder)
    // Consumers may provide `migrationData` for non-finance tasks; we echo it back.
    if (payload.migrationData) {
      // NOTE: Implement specific migration steps as required by your project.
      results.migrated = { info: 'migrationData received', detail: payload.migrationData };
    }

    // If financeOps provided, run them sequentially and return normalized shapes.
    // Each finance op should be: { companyId, deltaCents } (deltaCents integer cents) OR { companyId, delta, deltaCentsFallback }
    if (Array.isArray(payload.financeOps) && payload.financeOps.length > 0) {
      for (const op of payload.financeOps) {
        try {
          // Normalize delta in cents: prefer deltaCents, else accept delta (decimal USD)
          let deltaCents = null;
          if (Number.isFinite(Number(op.deltaCents))) deltaCents = Math.round(Number(op.deltaCents));
          else if (Number.isFinite(Number(op.delta))) deltaCents = Math.round(Number(op.delta) * 100);
          else if (Number.isFinite(Number(op.amountCents))) deltaCents = Math.round(Number(op.amountCents));
          else deltaCents = 0;

          const res = await callFinanceRpc({
            supabaseUrl: SUPABASE_URL,
            supabaseKey: SUPABASE_KEY,
            companyId: String(op.companyId || op.p_company_id || op.company_id || ''),
            deltaCents,
            type: op.type || 'adjustment',
            description: op.description ?? null,
            idempotencyKey: op.idempotencyKey ?? op.p_idempotency_key ?? null
          });

          results.financeResults.push(res);

          // If a finance RPC failed, include error but continue processing other ops.
        } catch (err) {
          results.financeResults.push({ success: false, error: String(err && err.message ? err.message : err) });
        }
      }
    }

    // Determine canonical newBalanceCents if any finance result returned it (use last successful)
    const lastSuccess = results.financeResults.slice().reverse().find(r => r && r.success && typeof r.newBalanceCents === 'number');
    if (lastSuccess) results.newBalanceCents = lastSuccess.newBalanceCents;
    else results.newBalanceCents = null;

    return { statusCode: 200, body: JSON.stringify(results) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: String(err && err.message ? err.message : err) }) };
  }
};