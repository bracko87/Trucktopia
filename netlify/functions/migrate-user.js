/**
 * migrate-user.js
 *
 * Netlify Function (server stub) to accept a migration payload for a single user
 * and apply idempotent finance transactions to Supabase using the service role key.
 *
 * Responsibilities:
 * - Validate incoming payload (companyId, transactions array)
 * - Ensure idempotency_key exists for each transaction (generate fallback when absent)
 * - Call Supabase RPC (finance_apply_atomic) sequentially for each transaction
 * - Return a summary of successes / failures for the client migration runner
 *
 * Notes:
 * - Expects SUPABASE_URL and SUPABASE_SERVICE_ROLE env variables to be set in Netlify.
 * - This function is a minimal stub and performs basic retry/backoff for transient failures.
 * - Keep logic simple and idempotent: finance RPC must honor idempotency_key.
 */

/**
 * generateIdempotencyKey
 * @description RFC4122-like UUIDv4 generator using crypto when available, fallback to Math.random.
 * @returns {string} uuid
 */
function generateIdempotencyKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  const randHex = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return `${randHex()}${randHex()}-${randHex()}-${randHex()}-${randHex()}-${randHex()}${randHex()}${randHex()}`;
}

/**
 * postToSupabaseRpc
 * @description Send a POST to Supabase REST RPC endpoint for finance_apply_atomic.
 *              Uses service role key from environment variables.
 * @param {string} supabaseUrl
 * @param {string} serviceKey
 * @param {object} payload - RPC named parameters
 * @returns {Promise<object>} response JSON
 */
async function postToSupabaseRpc(supabaseUrl, serviceKey, payload) {
  const rpcUrl = `${supabaseUrl.replace(/\/+$/, '')}/rest/v1/rpc/finance_apply_atomic`;
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: 'return=representation'
    },
    body: JSON.stringify(payload)
  });

  const text = await res.text().catch(() => '');
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }

  if (!res.ok) {
    const err = typeof json === 'string' ? json : (json && (json.message || json.error)) || `HTTP ${res.status}`;
    const error = new Error(String(err));
    error.details = json;
    throw error;
  }
  return json;
}

/**
 * handler
 * @description Netlify-compatible function handler. Accepts POST with:
 *  { companyId: string, transactions: [{ deltaCents, type, description?, meta?, idempotencyKey? }], actorUserId? }
 */
exports.handler = async function(event, context) {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.SUPABASE_REST_URL || null;
    const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_KEY || null;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Supabase configuration missing on server (SUPABASE_URL / SUPABASE_SERVICE_ROLE)' }) };
    }

    let payload;
    try {
      payload = event.body ? JSON.parse(event.body) : null;
    } catch (err) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
    }

    if (!payload || typeof payload.companyId !== 'string' || !Array.isArray(payload.transactions)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields: companyId (string) and transactions (array)' }) };
    }

    const companyId = payload.companyId;
    const actorUserId = payload.actorUserId ?? null;
    const results = [];

    // Sequentially apply transactions to keep ordering predictable
    for (const tx of payload.transactions) {
      const deltaCents = Number(tx.deltaCents ?? tx.amountCents ?? tx.delta ?? null);
      if (!Number.isFinite(deltaCents)) {
        results.push({ ok: false, error: 'Invalid deltaCents for transaction', transaction: tx });
        continue;
      }

      const type = String(tx.type || 'adjustment');
      const description = tx.description ?? null;
      const meta = tx.meta ?? {};
      const idempotencyKey = String(tx.idempotencyKey || tx.idempotency_key || generateIdempotencyKey());

      const rpcParams = {
        p_company_id: companyId,
        p_delta: Math.round(Number(deltaCents)),
        p_type: type,
        p_description: description,
        p_meta: meta,
        p_idempotency_key: idempotencyKey,
        p_actor_user_id: actorUserId
      };

      // Basic retry loop for transient failures
      const MAX_RETRIES = 2;
      let attempt = 0;
      let success = false;
      let lastErr = null;
      while (attempt <= MAX_RETRIES && !success) {
        try {
          attempt += 1;
          const res = await postToSupabaseRpc(SUPABASE_URL, SUPABASE_SERVICE_ROLE, rpcParams);
          results.push({ ok: true, response: res, idempotencyKey });
          success = true;
        } catch (err) {
          lastErr = err;
          // simple backoff
          if (attempt <= MAX_RETRIES) {
            await new Promise((r) => setTimeout(r, 250 * attempt));
            continue;
          }
          results.push({ ok: false, error: err?.message || String(err), details: err?.details ?? null, idempotencyKey });
        }
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, results })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Unexpected server error', message: err?.message ?? String(err) })
    };
  }
};