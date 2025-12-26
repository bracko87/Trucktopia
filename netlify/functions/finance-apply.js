/**
 * netlify/functions/finance-apply.js
 *
 * Netlify serverless function that:
 * - Authenticates the caller using Supabase access token (sent in Authorization header)
 * - Verifies the caller is allowed to operate on the requested company (owner check)
 * - Calls the Postgres RPC `finance_apply` (created in sql/003_create_finance_apply_function.sql)
 *   using the Supabase service role key to perform an atomic update + transaction insert
 * - Enforces idempotency via client-provided idempotency_key (passed through to RPC)
 *
 * Security:
 * - Requires these environment variables to be set in Netlify:
 *   SUPABASE_URL (e.g. https://your-project.supabase.co)
 *   SUPABASE_SERVICE_ROLE (service_role key, kept secret)
 *
 * Request (POST, JSON):
 * {
 *   "companyId": "<uuid>",
 *   "deltaCents": -3150000,
 *   "type": "expense",
 *   "description": "Purchase Heno XZU720",      // optional
 *   "meta": { "vehicleId": "truck-123" },      // optional
 *   "idempotencyKey": "uuid-..."               // optional but strongly recommended
 * }
 *
 * Headers:
 * - Authorization: Bearer <supabase_user_access_token>
 *
 * Response:
 * - 200 OK { success: true, transaction: {...}, newBalanceCents: <number> }
 * - 401 Unauthorized / 400 Bad Request / 500 Server Error as applicable
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
/**
 * Backwards-compatible resolution for the Supabase service role key.
 * Some deploys use SUPABASE_SERVICE_ROLE while others use SUPABASE_SERVICE_ROLE_KEY.
 * We prefer either in order to avoid env name mismatches causing silent failures.
 */
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * getUserFromToken
 * @description Validate a Supabase access token by calling /auth/v1/user.
 *              Returns user object { id, email, ... } or throws.
 * @param {string} accessToken
 */
async function getUserFromToken(accessToken) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    throw new Error('Supabase configuration missing on server');
  }
  const url = new URL('/auth/v1/user', SUPABASE_URL).toString();
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${accessToken}`
    }
  });
  if (res.status === 200) {
    return await res.json();
  }
  const body = await res.text().catch(() => null);
  const err = new Error('Invalid access token');
  err.info = { status: res.status, body };
  throw err;
}

/**
 * getCompanyOwner
 * @description Fetch company.owner_id using the service role key (server-side).
 * @param {string} companyId
 */
async function getCompanyOwner(companyId) {
  const url = new URL(`/rest/v1/companies?id=eq.${encodeURIComponent(companyId)}&select=owner_id`, SUPABASE_URL).toString();
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
      Accept: 'application/json'
    }
  });
  if (!res.ok) {
    const t = await res.text().catch(() => null);
    throw new Error(`Failed to fetch company (status=${res.status}): ${String(t)}`);
  }
  const json = await res.json();
  if (!Array.isArray(json) || json.length === 0) {
    throw new Error('company_not_found');
  }
  return json[0].owner_id || null;
}

/**
 * callFinanceApplyRpc
 * @description Call the finance_apply RPC created in DB to run the atomic update.
 *              Uses service role key and returns the RPC result.
 */
async function callFinanceApplyRpc(payload) {
  const url = new URL('/rest/v1/rpc/finance_apply', SUPABASE_URL).toString();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
      Prefer: 'return=representation' // ensure we get the function result back
    },
    body: JSON.stringify(payload)
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    throw new Error(`Invalid JSON response from RPC: ${text}`);
  }
  if (!res.ok) {
    const err = new Error('RPC failed');
    err.info = { status: res.status, body: data };
    throw err;
  }
  // The RPC returns an array (table-returning functions) -> take first element
  if (Array.isArray(data) && data.length > 0) {
    return data[0];
  }
  return data;
}

/**
 * validatePayload
 * @description Basic validation of incoming request body.
 */
function validatePayload(body) {
  if (!body) throw new Error('missing_body');
  const { companyId, deltaCents, type } = body;
  if (!companyId) throw new Error('companyId required');
  if (typeof deltaCents !== 'number' && typeof deltaCents !== 'bigint') throw new Error('deltaCents must be a number (cents)');
  const allowed = ['income', 'expense', 'tax', 'loan', 'repayment', 'adjustment', 'fee', 'refund'];
  if (!type || !allowed.includes(type)) throw new Error('invalid type');
}

/**
 * handler
 * Netlify function entrypoint
 */
exports.handler = async function (event) {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ success: false, message: 'Method Not Allowed' }) };
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
      return { statusCode: 500, body: JSON.stringify({ success: false, message: 'Server not configured' }) };
    }

    // Parse JSON body
    let body = null;
    try {
      body = event.body ? JSON.parse(event.body) : null;
    } catch (err) {
      return { statusCode: 400, body: JSON.stringify({ success: false, message: 'Invalid JSON body' }) };
    }

    try {
      validatePayload(body);
    } catch (err) {
      return { statusCode: 400, body: JSON.stringify({ success: false, message: err.message || 'Invalid payload' }) };
    }

    // Extract user token from Authorization header
    const authHeader = (event.headers && (event.headers.authorization || event.headers.Authorization)) || '';
    const tokenMatch = String(authHeader).replace('Bearer ', '').trim();
    if (!tokenMatch) {
      return { statusCode: 401, body: JSON.stringify({ success: false, message: 'Missing Authorization header' }) };
    }

    // Validate token and get user
    let user = null;
    try {
      user = await getUserFromToken(tokenMatch);
    } catch (err) {
      return { statusCode: 401, body: JSON.stringify({ success: false, message: 'Invalid access token' }) };
    }

    // Authorization: ensure user is owner of company (simple policy)
    let ownerId = null;
    try {
      ownerId = await getCompanyOwner(body.companyId);
    } catch (err) {
      if (String(err.message) === 'company_not_found') {
        return { statusCode: 404, body: JSON.stringify({ success: false, message: 'Company not found' }) };
      }
      return { statusCode: 500, body: JSON.stringify({ success: false, message: 'Failed to fetch company' }) };
    }

    // Compare owner id to user id (supabase user id is user.id from /auth/v1/user)
    // In some setups owner_id may be stored as text/email; adapt as needed.
    if (!ownerId || String(ownerId) !== String(user.id)) {
      return { statusCode: 403, body: JSON.stringify({ success: false, message: 'Forbidden: not company owner' }) };
    }

    // Prepare RPC payload (match function param names)
    const rpcPayload = {
      p_company_id: body.companyId,
      p_delta: Number(body.deltaCents), // ensure number
      p_type: body.type,
      p_description: body.description || null,
      p_meta: body.meta || {},
      p_idempotency_key: body.idempotencyKey || null,
      p_actor_user_id: user.id || null
    };

    // Call RPC (atomic operation)
    let txRow = null;
    try {
      txRow = await callFinanceApplyRpc(rpcPayload);
    } catch (err) {
      // Handle common RPC errors (e.g. insufficient funds if server enforces)
      const info = err.info || {};
      return { statusCode: 500, body: JSON.stringify({ success: false, message: 'Finance RPC failed', info }) };
    }

    // Successful
    const response = {
      success: true,
      transaction: txRow,
      newBalanceCents: txRow ? Number(txRow.balance_after) : null
    };

    return { statusCode: 200, body: JSON.stringify(response) };
  } catch (err) {
    console.error('[finance-apply] unexpected error', err);
    return { statusCode: 500, body: JSON.stringify({ success: false, message: 'Unexpected server error' }) };
  }
};