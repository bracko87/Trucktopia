/**
 * finance-apply.js
 *
 * Netlify function wrapper that calls the atomic Supabase RPC "finance_apply_atomic".
 *
 * Responsibilities:
 * - Validate incoming payload
 * - Forward the request to the Supabase RPC endpoint using SERVICE ROLE credentials
 * - Normalize and return the RPC response
 *
 * Notes:
 * - The atomic RPC is expected to handle idempotency by idempotency_key.
 * - This function is a thin, audited wrapper: no local DB operations here.
 */

/**
 * handler
 * @description Netlify function entry. Accepts POST requests with JSON body:
 *  { companyId, deltaCents, type, description?, meta?, idempotencyKey?, actorUserId? }
 *
 * It maps to the RPC parameters (p_company_id, p_delta, p_type, p_description, p_meta, p_idempotency_key, p_actor_user_id)
 * and returns the RPC result as JSON.
 */
exports.handler = async function (event) {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ success: false, message: 'Method Not Allowed' }) };
    }

    const SUPABASE_URL = process.env.SUPABASE_URL || '';
    const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
      console.error('[finance-apply] missing SUPABASE_URL or SERVICE_ROLE');
      return { statusCode: 500, body: JSON.stringify({ success: false, message: 'Server not configured' }) };
    }

    // Parse body safely
    let bodyRaw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
    let body;
    try {
      body = typeof bodyRaw === 'string' ? JSON.parse(bodyRaw) : bodyRaw;
    } catch (err) {
      console.warn('[finance-apply] invalid JSON body');
      return { statusCode: 400, body: JSON.stringify({ success: false, message: 'Invalid JSON body' }) };
    }

    // Basic validation
    const companyId = body && body.companyId ? String(body.companyId) : null;
    const delta = typeof body.deltaCents === 'number' ? Number(body.deltaCents) : (body.deltaCents ? Number(body.deltaCents) : NaN);
    if (!companyId) return { statusCode: 400, body: JSON.stringify({ success: false, message: 'companyId required' }) };
    if (!Number.isFinite(delta)) return { statusCode: 400, body: JSON.stringify({ success: false, message: 'deltaCents must be a number (cents)' }) };

    const idempotencyKey = body.idempotencyKey ? String(body.idempotencyKey) : null;
    const txType = body.type ? String(body.type) : null;
    const description = body.description ?? null;
    const meta = body.meta ?? null;
    const actorUserId = body.actorUserId ?? null;

    // Build RPC payload matching the server-side function signature
    const rpcBody = {
      p_company_id: companyId,
      p_delta: delta,
      p_type: txType,
      p_description: description,
      p_meta: meta,
      p_idempotency_key: idempotencyKey,
      p_actor_user_id: actorUserId
    };

    // Helper to perform service-role fetch
    async function svcFetch(url, opts) {
      opts = opts || {};
      const headers = Object.assign(
        {
          'Content-Type': 'application/json',
          apikey: SUPABASE_SERVICE_ROLE,
          Authorization: 'Bearer ' + SUPABASE_SERVICE_ROLE
        },
        opts.headers || {}
      );
      const res = await fetch(url, Object.assign({}, opts, { headers }));
      const text = await res.text().catch(() => '');
      let json;
      try { json = text ? JSON.parse(text) : null; } catch { json = text; }
      return { ok: res.ok, status: res.status, json, text };
    }

    const rpcUrl = SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1/rpc/finance_apply_atomic';

    // Call RPC
    const rpcRes = await svcFetch(rpcUrl, {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(rpcBody)
    });

    if (!rpcRes.ok) {
      console.error('[finance-apply] rpc failed', rpcRes.status, rpcRes.text);
      const errMsg = (rpcRes.json && (rpcRes.json.error || rpcRes.json.message)) || rpcRes.text || `RPC status ${rpcRes.status}`;
      return { statusCode: 500, body: JSON.stringify({ success: false, message: `RPC failed: ${String(errMsg)}` }) };
    }

    // Normalize RPC response. Supabase RPC may return an array or object.
    let result = rpcRes.json;
    if (Array.isArray(result) && result.length > 0) result = result[0];

    // Expected keys: transaction (or id/balance_after). Try to normalize to { success, transaction, newBalanceCents }
    const transaction = result?.transaction ?? result ?? null;
    const newBalanceCents =
      result?.new_balance_cents ?? result?.newBalanceCents ?? (transaction && (transaction.balance_after ?? transaction.balance_after)) ?? null;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        transaction,
        newBalanceCents: typeof newBalanceCents === 'number' ? newBalanceCents : null,
        raw: result
      })
    };
  } catch (err) {
    console.error('[finance-apply] unexpected error', err && err.message ? err.message : String(err));
    return { statusCode: 500, body: JSON.stringify({ success: false, message: 'Unexpected server error', info: String(err && err.message) }) };
  }
};