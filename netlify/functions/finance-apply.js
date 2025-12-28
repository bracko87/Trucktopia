/**
 * netlify/functions/finance-apply.js
 *
 * Netlify function wrapper to call the Supabase RPC "finance_apply" and return a
 * consistent canonical response using cents-first money fields.
 *
 * Response shape (success):
 * {
 *   success: true,
 *   transaction: { id, company_id, created_at, type, amount /* cents */, balance_after /* cents */, description, meta, idempotency_key, actor_user_id },
 *   newBalanceCents: number
 * }
 *
 * Response shape (error):
 * { success: false, error: 'message' }
 */

/** @typedef {import('node-fetch').Response} FetchResponse */

const fetch = globalThis.fetch || require('node-fetch');

/**
 * handler
 * @description Netlify function handler that forwards request to Supabase RPC and normalizes the result.
 * Expects POST JSON body with:
 *  - companyId (uuid string)
 *  - deltaCents (integer number)
 *  - type (string)
 *  - description? (string)
 *  - meta? (object)
 *  - idempotencyKey? (string)
 *  - actorUserId? (uuid string)
 */
exports.handler = async function (event) {
  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ success: false, error: 'Method Not Allowed' })
      };
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ success: false, error: 'Supabase configuration missing on server' })
      };
    }

    let payload = null;
    try {
      payload = event.body ? JSON.parse(event.body) : {};
    } catch (err) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Invalid JSON body' }) };
    }

    const companyId = String(payload.companyId || payload.p_company_id || '').trim();
    const deltaCents = Number.isFinite(payload.deltaCents) ? Math.round(payload.deltaCents) : (Number.isFinite(payload.p_delta) ? Math.round(payload.p_delta) : null);
    const type = String(payload.type || payload.p_type || 'adjustment');
    const description = payload.description ?? payload.p_description ?? null;
    const meta = payload.meta ?? payload.p_meta ?? {};
    const idempotencyKey = payload.idempotencyKey ?? payload.p_idempotency_key ?? null;
    const actorUserId = payload.actorUserId ?? payload.p_actor_user_id ?? null;

    if (!companyId || deltaCents === null || Number.isNaN(deltaCents)) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: 'companyId and numeric deltaCents are required' }) };
    }

    const rpcUrl = `${SUPABASE_URL.replace(/\\/+$/, '')}/rest/v1/rpc/finance_apply`;

    const rpcBody = {
      p_company_id: companyId,
      p_delta: deltaCents,
      p_type: type,
      p_description: description,
      p_meta: meta,
      p_idempotency_key: idempotencyKey,
      p_actor_user_id: actorUserId
    };

    const resp = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'return=representation'
      },
      body: JSON.stringify(rpcBody)
    });

    const text = await resp.text().catch(() => null);
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = text; }

    if (!resp.ok) {
      const errMsg = (json && (json.error || json.message)) || (typeof json === 'string' ? json : `RPC returned status ${resp.status}`);
      return { statusCode: resp.status, body: JSON.stringify({ success: false, error: String(errMsg) }) };
    }

    // Supabase RPC typically returns an array of rows for table-returning functions.
    // Normalize to first row if array.
    let row = null;
    if (Array.isArray(json)) row = json[0] ?? null;
    else row = json ?? null;

    // Expected RPC returning columns: id, company_id, created_at, type, amount (bigint cents), balance_after (bigint cents), description, meta, idempotency_key, actor_user_id
    const transaction = row ? {
      id: row.id ?? null,
      company_id: row.company_id ?? row.companyId ?? null,
      created_at: row.created_at ?? row.createdAt ?? null,
      type: row.type ?? null,
      amount: typeof row.amount === 'number' ? Math.round(row.amount) : (row.amount ? Number(row.amount) : null), // cents
      balance_after: typeof row.balance_after === 'number' ? Math.round(row.balance_after) : (row.balance_after ? Number(row.balance_after) : null), // cents
      description: row.description ?? null,
      meta: row.meta ?? row.p_meta ?? null,
      idempotency_key: row.idempotency_key ?? null,
      actor_user_id: row.actor_user_id ?? null
    } : null;

    const newBalanceCents = transaction && (typeof transaction.balance_after === 'number') ? transaction.balance_after : (row && (typeof row.balance_after === 'number') ? row.balance_after : null);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        transaction,
        newBalanceCents
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: String(err && err.message ? err.message : err) })
    };
  }
};