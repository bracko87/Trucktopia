/**
 * netlify/functions/migrate.js
 *
 * Serverless migration endpoint for Netlify.
 *
 * Purpose:
 * - Accepts a POSTed migration payload (same shape as scripts/migration-payload.json).
 * - Validates an ADMIN token provided in the Authorization header.
 * - Uses SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL from environment variables to insert
 *   collections into the Supabase REST API (table defined by MIGRATION_TABLE).
 *
 * Security:
 * - The service role key MUST be set as a Netlify environment variable and NOT committed
 *   to the repository.
 * - The endpoint requires an ADMIN token (MIGRATE_ADMIN_TOKEN) passed as:
 *     Authorization: Bearer <token>
 *
 * Notes:
 * - This function intentionally mirrors the logic of scripts/local-migrate.js but runs
 *   on the server so the Supabase service role key remains secret in hosting env.
 * - Do not accept payloads from untrusted sources without additional protections.
 */

const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2 MB

/**
 * @description Normalize a base URL by removing a trailing slash (if present).
 * @param {string} url
 * @returns {string}
 */
function normalizeUrl(url) {
  return url.replace(/\/$/, '');
}

/**
 * @description Insert a single row into Supabase REST table.
 * @param {string} supabaseUrl
 * @param {string} serviceKey
 * @param {string} table
 * @param {any} row
 * @returns {Promise<any>}
 */
async function insertSupabaseRow(supabaseUrl, serviceKey, table, row) {
  const endpoint = `${normalizeUrl(supabaseUrl)}/rest/v1/${encodeURIComponent(table)}`;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${serviceKey}`,
    apikey: serviceKey,
    Prefer: 'return=representation'
  };

  const fetchFn = global.fetch;
  if (!fetchFn) {
    throw new Error('Global fetch not available in runtime.');
  }

  const res = await fetchFn(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(row)
  });

  const text = await res.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  if (!res.ok) {
    throw new Error(`Supabase insert failed: ${res.status} ${res.statusText} - ${JSON.stringify(parsed)}`);
  }

  return parsed;
}

/**
 * @description Netlify function handler: receives migration payload and inserts into Supabase.
 * @param {import('./index').NetlifyEvent} event - Netlify function event (simplified)
 * @returns {Promise<{ statusCode: number, body: string, headers?: Record<string,string> }>}
 */
module.exports.handler = async function handler(event) {
  try {
    // Allow only POST
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Method Not Allowed. Use POST.' })
      };
    }

    // Basic body size check
    const rawBody = event.body || '';
    if (rawBody.length > MAX_BODY_BYTES) {
      return {
        statusCode: 413,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Payload too large' })
      };
    }

    // Authorization header check
    const authHeader = (event.headers && (event.headers.authorization || event.headers.Authorization)) || '';
    const suppliedToken = authHeader.replace(/^Bearer\s+/i, '').trim();
    const ADMIN_TOKEN = process.env.MIGRATE_ADMIN_TOKEN || process.env.ADMIN_TOKEN;
    if (!ADMIN_TOKEN) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Server misconfigured: MIGRATE_ADMIN_TOKEN not set' })
      };
    }
    if (!suppliedToken || suppliedToken !== ADMIN_TOKEN) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    // Supabase credentials from environment
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const MIGRATION_TABLE = process.env.MIGRATION_TABLE || 'migrated_collections';

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Server misconfigured: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing' })
      };
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (err) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid JSON payload' })
      };
    }

    // If payload contains collections, iterate and insert rows
    const collections = payload.collections || {};
    if (Object.keys(collections).length === 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'No collections found in payload' })
      };
    }

    const results = [];

    for (const [collectionKey, items] of Object.entries(collections)) {
      const row = {
        collection_key: collectionKey,
        data: items,
        metadata: payload.metadata || {},
        migrated_by: (payload.metadata && payload.metadata.requestedBy) || null,
        status: 'migrated'
      };

      try {
        const details = await insertSupabaseRow(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MIGRATION_TABLE, row);
        results.push({ collection: collectionKey, success: true, details });
        console.log(`Inserted collection "${collectionKey}"`);
      } catch (err) {
        const errMsg = String(err && (err.message || err));
        results.push({ collection: collectionKey, success: false, error: errMsg });
        console.error(`Failed inserting "${collectionKey}":`, errMsg);
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ results }, null, 2)
    };
  } catch (err) {
    console.error('Migration function error:', err && err.message ? err.message : err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error', details: String(err && err.message ? err.message : err) })
    };
  }
};