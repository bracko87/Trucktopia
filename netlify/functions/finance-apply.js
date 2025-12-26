/**
 * finance-apply.js
 *
 * Netlify function: safe finance apply wrapper using Supabase REST.
 *
 * Responsibilities:
 * - Validate incoming payload
 * - Ensure finances_transactions.meta is never NULL (DB has NOT NULL constraint)
 * - Provide idempotent behavior by checking existing idempotency_key
 * - Update company.capital (PATCH) and insert finances_transactions (POST)
 *
 * Notes:
 * - This function requires SUPABASE_URL and a service role key (SUPABASE_SERVICE_ROLE or SUPABASE_SERVICE_ROLE_KEY).
 * - For local testing use `netlify dev` and set those env vars locally to avoid incurring cloud costs.
 */

/**
 * svcFetch
 * @description Perform fetch calls with Service Role headers and return parsed body.
 *              Uses resolved SERVICE_ROLE (reads SUPABASE_SERVICE_ROLE || SUPABASE_SERVICE_ROLE_KEY).
 * @param {string} url
 * @param {object} opts
 */
async function svcFetch(url, opts) {
  opts = opts || {};

  // Resolve service role key at runtime from either env var name to avoid 401 when only KEY name is set.
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  const headers = Object.assign(
    {
      'Content-Type': 'application/json',
      apikey: SERVICE_ROLE,
      Authorization: 'Bearer ' + SERVICE_ROLE
    },
    opts.headers || {}
  );
  const res = await fetch(url, Object.assign({}, opts, { headers }));
  const text = await res.text().catch(() => '');
  let json;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { ok: res.ok, status: res.status, json, text };
}

/**
 * handler
 * @description Netlify function entrypoint
 */
exports.handler = async function (event) {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ success: false, message: 'Method Not Allowed' }) };
    }

    const SUPABASE_URL = process.env.SUPABASE_URL || '';
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      console.error('[finance-apply] missing SUPABASE_URL or SERVICE_ROLE env var');
      return { statusCode: 500, body: JSON.stringify({ success: false, message: 'Server not configured' }) };
    }

    // Parse body safely (handle base64-encoded Netlify body)
    let bodyRaw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
    let body;
    try {
      body = typeof bodyRaw === 'string' ? JSON.parse(bodyRaw) : bodyRaw;
    } catch (err) {
      console.warn('[finance-apply] invalid JSON body');
      return { statusCode: 400, body: JSON.stringify({ success: false, message: 'Invalid JSON body' }) };
    }

    // Basic validation & mapping
    const companyId = body && body.companyId ? String(body.companyId) : null;
    const delta = typeof body.deltaCents === 'number' ? Math.round(Number(body.deltaCents)) : (body.deltaCents ? Math.round(Number(body.deltaCents)) : NaN);
    if (!companyId) return { statusCode: 400, body: JSON.stringify({ success: false, message: 'companyId required' }) };
    if (!Number.isFinite(delta)) return { statusCode: 400, body: JSON.stringify({ success: false, message: 'deltaCents must be a number (cents)' }) };

    const idempotencyKey = body.idempotencyKey ? String(body.idempotencyKey) : null;
    const txType = body.type ? String(body.type) : null;
    const description = body.description ?? null;
    let meta = body.meta ?? {}; // default to empty object

    // Defensive: if caller provided "null" string or non-object, coerce to {}
    if (meta === null || (typeof meta === 'string' && meta.toLowerCase() === 'null')) meta = {};
    if (typeof meta !== 'object' || Array.isArray(meta)) meta = {};

    const actorUserId = body.actorUserId ?? null;

    const base = SUPABASE_URL.replace(/\/+$/, '');

    // Idempotency check: return existing transaction if idempotencyKey matches
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

    // 1) Read company current balance
    const companyUrl = `${base}/rest/v1/companies?id=eq.${companyId}&select=capital_cents`;
    const companyRes = await svcFetch(companyUrl, { method: 'GET' });
    if (!companyRes.ok) {
      console.error('[finance-apply] failed to read company', companyRes.status, companyRes.text);
      return { statusCode: companyRes.status || 500, body: JSON.stringify({ success: false, message: 'Failed to read company data', info: companyRes.text }) };
    }
    const companyData = Array.isArray(companyRes.json) && companyRes.json.length > 0 ? companyRes.json[0] : null;
    if (!companyData) {
      return { statusCode: 404, body: JSON.stringify({ success: false, message: 'Company not found' }) };
    }

    const currentBalance = typeof companyData.capital_cents === 'number' ? companyData.capital_cents : (companyData.capital_cents ? Number(companyData.capital_cents) : 0);
    const newBalance = currentBalance + Number(delta);

    // 2) Patch company balance
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

    // 3) Insert transaction row. Ensure meta is a non-null object.
    const insertUrl = `${base}/rest/v1/finances_transactions`;
    const txBody = {
      company_id: companyId,
      type: txType,
      amount: delta,
      balance_after: newBalance,
      description: description,
      meta: meta ?? {}, // ensure non-null for NOT NULL column
      idempotency_key: idempotencyKey,
      actor_user_id: actorUserId
    };

    // Debug: log txBody server-side to inspect what is being inserted (helps catch meta=null issues)
    try {
      console.log('finance-apply txBody:', JSON.stringify(txBody));
    } catch (e) {
      // ignore logging errors
    }

    const insertRes = await svcFetch(insertUrl, {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(txBody)
    });

    if (!insertRes.ok) {
      console.error('[finance-apply] insert failed', insertRes.status, insertRes.text);
      // Try to detect concurrent insert by idempotency key
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