/**
 * netlify/functions/migrate.js
 *
 * Lightweight Netlify Function to demonstrate safe insertion into
 * public.migrated_collections. This function ensures the payload always
 * contains collection_name (mirrors collection_key) before inserting.
 *
 * Notes:
 * - Uses Supabase REST (no client libraries) so no new npm installs required.
 * - Expects SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to be set in environment.
 * - Keep this function minimal: it forwards the normalized payload to Supabase.
 */

/**
 * ensureCollectionName
 * @description Inline helper mirroring the TypeScript utility used in server code.
 * Kept here as JS to avoid cross-TS require/import issues in Netlify functions.
 *
 * @param {object} payload
 * @returns {object}
 */
function ensureCollectionName(payload) {
  const out = { ...(payload || {}) };
  if (typeof out.collection_key === 'string' && (!out.collection_name || out.collection_name === null)) {
    out.collection_name = out.collection_key;
  }
  return out;
}

/**
 * netlify/functions/migrate.js
 *
 * Lightweight Netlify Function to demonstrate safe insertion into
 * public.migrated_collections. This function ensures the payload always
 * contains collection_name (mirrors collection_key) before inserting.
 *
 * Added: CORS preflight handling and consistent CORS headers on responses.
 * Notes:
 * - Uses Supabase REST (no client libraries) so no new npm installs required.
 * - Expects SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to be set in environment.
 * - If MIGRATE_ADMIN_TOKEN is set in environment, the function requires an
 *   Authorization: Bearer <MIGRATE_ADMIN_TOKEN> header to perform POSTs.
 */

/**
 * ensureCollectionName
 * @description Inline helper mirroring the TypeScript utility used in server code.
 * Kept here as JS to avoid cross-TS require/import issues in Netlify functions.
 *
 * @param {object} payload
 * @returns {object}
 */
function ensureCollectionName(payload) {
  const out = { ...(payload || {}) };
  if (typeof out.collection_key === 'string' && (!out.collection_name || out.collection_name === null)) {
    out.collection_name = out.collection_key;
  }
  return out;
}

/**
 * getCorsHeaders
 * @description Returns the standard CORS headers used by this function.
 * Adjust Access-Control-Allow-Origin to a specific origin if you want tighter security.
 * @returns {Record<string,string>}
 */
function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
    'Access-Control-Max-Age': '600'
  };
}

/**
 * handler
 * @description Netlify Lambda handler. Handles OPTIONS preflight and POST
 * requests. If MIGRATE_ADMIN_TOKEN is configured, requires Authorization header.
 */
exports.handler = async function (event) {
  try {
    const corsHeaders = getCorsHeaders();

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 204,
        headers: corsHeaders,
        body: ''
      };
    }

    // Only accept POST for the migration action
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Method Not Allowed' })
      };
    }

    // Optional: require admin token if provided in environment
    const MIGRATE_ADMIN_TOKEN = process.env.MIGRATE_ADMIN_TOKEN;
    if (MIGRATE_ADMIN_TOKEN) {
      const auth = (event.headers && (event.headers.authorization || event.headers.Authorization)) || '';
      if (!auth.startsWith('Bearer ') || auth.split(' ')[1] !== MIGRATE_ADMIN_TOKEN) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Unauthorized - invalid migration token' })
        };
      }
    }

    // Parse request body
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (err) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid JSON body' })
      };
    }

    // Normalize payload and ensure collection_name exists
    const payload = ensureCollectionName(body);

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Supabase credentials not configured' })
      };
    }

    // Insert via Supabase REST API
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/migrated_collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: 'return=representation'
      },
      body: JSON.stringify(payload)
    });

    let insertJson;
    try {
      insertJson = await insertRes.json();
    } catch (err) {
      insertJson = await insertRes.text().catch(() => null);
    }

    if (!insertRes.ok) {
      return {
        statusCode: insertRes.status || 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Insert failed', detail: insertJson })
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ data: insertJson })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: getCorsHeaders(),
      body: JSON.stringify({ error: 'Internal error', detail: String(err) })
    };
  }
};