/**
 * finance-apply.js
 *
 * Netlify function wrapper implementing a safe REST-based finance apply flow.
 *
 * Responsibilities:
 * - Validate incoming payload
 * - Provide idempotent behaviour by checking finances_transactions for an existing idempotency_key
 * - Update company balance and insert finances_transactions using the Supabase REST API
 *   while running with the SERVICE_ROLE key (server-side)
 *
 * Rationale:
 * The previously used database RPC produced a "column reference ... ambiguous" error
 * in some environments. This implementation uses REST table operations with the
 * service role key to achieve the same result without depending on the RPC.
 *
 * Note:
 * - This implementation is best-effort and tries to keep behaviour compatible with
 *   the RPC (returns the inserted transaction and newBalanceCents). It does not
 *   provide full transactional atomicity across the two REST calls (check+update+insert),
 *   but it enforces idempotency by checking for an existing idempotency_key and will
 *   return the existing transaction if found.
 */

/**
 * handler
 * @description Netlify function entry. Accepts POST requests with JSON body:
 *  { companyId, deltaCents, type, description?, meta?, idempotencyKey?, actorUserId? }
 *
 * Returns:
 *  { success: true, transaction: {...}, newBalanceCents: number, raw: any }
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
    const delta = typeof body.deltaCents === 'number' ? Math.round(Number(body.deltaCents)) : (body.deltaCents ? Math.round(Number(body.deltaCents)) : NaN);
    if (!companyId) return { statusCode: 400, body: JSON.stringify({ success: false, message: 'companyId required' }) };
    if (!Number.isFinite(delta)) return { statusCode: 400, body: JSON.stringify({ success: false, message: 'deltaCents must be a number (cents)' }) };

    const idempotencyKey = body.idempotencyKey ? String(body.idempotencyKey) : null;
    const txType = body.type ? String(body.type) : null;
    const description = body.description ?? null;
    const meta = body.meta ?? null;
    const actorUserId = body.actorUserId ?? null;

    /**
     * svcFetch
     * @description perform fetch calls with Service Role headers and return parsed body
     */
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

    const base = SUPABASE_URL.replace(/\/+$/, '');

    // 1) If idempotencyKey provided, check for existing transaction
    if (idempotencyKey) {
      try {
        const existsUrl = `${base}/rest/v1/finances_transactions?company_id=eq.${companyId}&idempotency_key=eq.${encodeURIComponent(idempotencyKey)}&select=*`;
        const existsRes = await svcFetch(existsUrl, { method: 'GET' });
        if (existsRes.ok && Array.isArray(existsRes.json) && existsRes.json.length > 0) {
          const tx = existsRes.json[0];
          const newBalanceCents = typeof tx.balance_after === 'number' ? tx.balance_after : (tx.balance_after ? Number(tx.balance_after) : null);
          return {
            statusCode: 200,
            body: JSON.stringify({ success: true, transaction: tx, newBalanceCents, raw: tx })
          };
        }
      } catch (e) {
        console.warn('[finance-apply] idempotency check failed', e && e.message ? e.message : String(e));
        // continue to attempt the operation
      }
    }

    // 2) Read current company balance using an unambiguous select (capital_cents)
    const companyUrl = `${base}/rest/v1/companies?id=eq.${companyId}&select=capital_cents`;
    const companyRes = await svcFetch(companyUrl, { method: 'GET' });
    if (!companyRes.ok) {
      console.error('[finance-apply] failed to read company', companyRes.status, companyRes.text);
      return { statusCode: 500, body: JSON.stringify({ success: false, message: 'Failed to read company data', info: companyRes.text }) };
    }
    const companyData = Array.isArray(companyRes.json) && companyRes.json.length > 0 ? companyRes.json[0] : null;
    if (!companyData) {
      return { statusCode: 404, body: JSON.stringify({ success: false, message: 'Company not found' }) };
    }

    const currentBalance = typeof companyData.capital_cents === 'number' ? companyData.capital_cents : (companyData.capital_cents ? Number(companyData.capital_cents) : 0);
    const newBalance = currentBalance + Number(delta);

    // 3) Update company balance (PATCH) - use id-based filter 'id=eq.<companyId>'
    const updateUrl = `${base}/rest/v1/companies?id=eq.${companyId}`;
    const updateRes = await svcFetch(updateUrl, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ capital_cents: newBalance })
    });
    if (!updateRes.ok) {
      console.error('[finance-apply] failed to update company balance', updateRes.status, updateRes.text);
      return { statusCode: 500, body: JSON.stringify({ success: false, message: 'Failed to update company balance', info: updateRes.text }) };
    }

    // 4) Insert transaction row into finances_transactions
    const insertUrl = `${base}/rest/v1/finances_transactions`;
    const txBody = {
      company_id: companyId,
      type: txType,
      amount: delta,
      balance_after: newBalance,
      description: description,
      meta: meta,
      idempotency_key: idempotencyKey,
      actor_user_id: actorUserId
    };
    const insertRes = await svcFetch(insertUrl, {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(txBody)
    });

    if (!insertRes.ok) {
      // Attempt to detect concurrent insert with same idempotency_key and return it
      console.error('[finance-apply] insert failed', insertRes.status, insertRes.text);
      if (idempotencyKey) {
        try {
          const fetchAgainUrl = `${base}/rest/v1/finances_transactions?company_id=eq.${companyId}&idempotency_key=eq.${encodeURIComponent(idempotencyKey)}&select=*`;
          const fetchAgain = await svcFetch(fetchAgainUrl, { method: 'GET' });
          if (fetchAgain.ok && Array.isArray(fetchAgain.json) && fetchAgain.json.length > 0) {
            const tx = fetchAgain.json[0];
            const newBalanceCents = typeof tx.balance_after === 'number' ? tx.balance_after : (tx.balance_after ? Number(tx.balance_after) : null);
            return { statusCode: 200, body: JSON.stringify({ success: true, transaction: tx, newBalanceCents, raw: tx }) };
          }
        } catch (e) {
          console.warn('[finance-apply] post-insert idempotency fetch failed', e && e.message ? e.message : String(e));
        }
      }
      return { statusCode: 500, body: JSON.stringify({ success: false, message: 'Failed to insert transaction', info: insertRes.text }) };
    }

    // Normalize inserted transaction (Supabase returns an array when Prefer=return=representation)
    let inserted = insertRes.json;
    if (Array.isArray(inserted) && inserted.length > 0) inserted = inserted[0];

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        transaction: inserted,
        newBalanceCents: typeof newBalance === 'number' ? newBalance : null,
        raw: inserted
      })
    };
  } catch (err) {
    console.error('[finance-apply] unexpected error', err && err.message ? err.message : String(err));
    return { statusCode: 500, body: JSON.stringify({ success: false, message: 'Unexpected server error', info: String(err && err.message) }) };
  }
};