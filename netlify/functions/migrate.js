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

exports.handler = async function (event) {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const body = JSON.parse(event.body || '{}');

    // Normalize payload and ensure collection_name exists
    const payload = ensureCollectionName(body);

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Supabase credentials not configured' }) };
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

    const insertJson = await insertRes.json();

    if (!insertRes.ok) {
      return {
        statusCode: insertRes.status || 500,
        body: JSON.stringify({ error: 'Insert failed', detail: insertJson })
      };
    }

    return { statusCode: 200, body: JSON.stringify({ data: insertJson }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal error', detail: String(err) }) };
  }
};