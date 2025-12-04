/**
 * netlify/functions/migrate.js
 *
 * Lightweight Netlify Function that normalizes a variety of migration payload
 * shapes and inserts them into Supabase REST (public.migrated_collections).
 *
 * Notes:
 * - Supports dry-run (header X-Dry-Run: true OR ?dryRun=true) — returns normalizedRows and never inserts.
 * - Normalizes common shapes:
 *   - body = array            -> payload.items = body
 *   - body.items present      -> payload.items = body.items
 *   - body.payload (array)    -> payload.items = body.payload
 *   - body.collections object -> each key => row (payload.items = value)
 *   - single object with collection_name/collection_key + payload/items -> normalized
 * - Inserts rows in batch (array) when not dry-run.
 *
 * JSDoc comments kept compact; logs and responses include normalizedRows to aid debugging.
 */

/**
 * getCorsHeaders
 * @description Provide consistent CORS headers for responses
 * @returns {Record<string,string>}
 */
function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, X-Dry-Run',
    'Access-Control-Max-Age': '600'
  };
}

/**
 * parseJsonSafe
 * @description Safely parse JSON, returning null on failure
 * @param {string} str
 * @returns {any|null}
 */
function parseJsonSafe(str) {
  try {
    return JSON.parse(str);
  } catch (err) {
    return null;
  }
}

/**
 * normalizeBodyToRows
 * @description Convert many possible incoming shapes into an array of normalized rows
 * Each row will have: { collection_name: string, payload: object, metadata: object|null }
 * @param {any} body
 * @returns {Array<object>}
 */
function normalizeBodyToRows(body) {
  const rows = [];

  // Helper to ensure payload is an object. If array, wrap under { items: array }
  const ensurePayloadObject = (maybePayload) => {
    if (maybePayload === null || maybePayload === undefined) return { items: [] };
    if (Array.isArray(maybePayload)) return { items: maybePayload };
    if (typeof maybePayload === 'object') return maybePayload;
    // Primitive -> wrap
    return { items: [maybePayload] };
  };

  // If top-level is an array -> create a single unnamed collection row
  if (Array.isArray(body)) {
    rows.push({
      collection_name: 'unnamed_collection',
      payload: { items: body },
      metadata: null
    });
    return rows;
  }

  // If collections envelope present: { collections: { name: [...] } }
  if (body && typeof body === 'object' && body.collections && typeof body.collections === 'object' && !Array.isArray(body.collections)) {
    const meta = body.metadata ?? null;
    for (const [collectionKey, collectionData] of Object.entries(body.collections)) {
      rows.push({
        collection_name: String(collectionKey),
        payload: ensurePayloadObject(collectionData),
        metadata: meta
      });
    }
    return rows;
  }

  // If body has explicit collection_key or collection_name -> single row
  const collectionName = (body && (body.collection_name || body.collection_key)) ? (body.collection_name || body.collection_key) : null;

  // If body.payload is present
  if (body && body.payload !== undefined) {
    rows.push({
      collection_name: collectionName || (body.collection_key ?? 'unnamed_collection'),
      payload: ensurePayloadObject(body.payload),
      metadata: body.metadata ?? null
    });
    return rows;
  }

  // If body.items present (top-level) -> move into payload.items
  if (body && body.items !== undefined) {
    rows.push({
      collection_name: collectionName || (body.collection_key ?? 'unnamed_collection'),
      payload: ensurePayloadObject(body.items),
      metadata: body.metadata ?? null
    });
    return rows;
  }

  // If body has single collection-like shape { collection_key, data } or { data }
  if (body && (body.data !== undefined)) {
    rows.push({
      collection_name: collectionName || (body.collection_key ?? 'unnamed_collection'),
      payload: ensurePayloadObject(body.data),
      metadata: body.metadata ?? null
    });
    return rows;
  }

  // Fallback: treat whole object as a single payload.items entry
  if (body && typeof body === 'object') {
    rows.push({
      collection_name: collectionName || (body.collection_key ?? 'unnamed_collection'),
      payload: ensurePayloadObject([body]),
      metadata: body.metadata ?? null
    });
    return rows;
  }

  // Nothing matched: return empty array
  return rows;
}

/**
 * handler
 * @description Netlify function handler — normalizes payloads and performs optional insert
 * @param {import('http').IncomingMessage} event
 * @param {import('http').ServerResponse} context
 */
exports.handler = async function (event) {
  const corsHeaders = getCorsHeaders();

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: ''
    };
  }

  // Only POST accepted
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  // Detect dry-run
  const queryParams = (event.queryStringParameters || {});
  const headers = Object.keys(event.headers || {}).reduce((acc, k) => {
    acc[k.toLowerCase()] = event.headers[k];
    return acc;
  }, {});
  const dryRun = (queryParams.dryRun === 'true' || headers['x-dry-run'] === 'true' || headers['x-dry-run'] === '1');

  // Parse body (Netlify provides event.body as string)
  if (!event.body) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Missing request body', normalizedRows: [] })
    };
  }

  const parsed = parseJsonSafe(event.body);
  if (parsed === null) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid JSON body', normalizedRows: [] })
    };
  }

  const normalizedRows = normalizeBodyToRows(parsed);

  // If no rows created, return helpful error
  if (!normalizedRows || normalizedRows.length === 0) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Could not derive rows from payload', normalizedRows: [] })
    };
  }

  // Dry-run: return normalized rows and skip any DB calls
  if (dryRun) {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        ok: true,
        dryRun: true,
        normalizedRows
      })
    };
  }

  // Real run: ensure Supabase env vars
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const MIGRATION_TABLE = process.env.MIGRATION_TABLE || 'migrated_collections';

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Supabase credentials not configured', normalizedRows })
    };
  }

  // Build endpoint and headers
  const endpoint = `${SUPABASE_URL.replace(/\\/$/, '')}/rest/v1/${encodeURIComponent(MIGRATION_TABLE)}`;
  const fetchHeaders = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    Prefer: 'return=representation'
  };

  try {
    // Insert in batch (array of rows)
    const fetchFn = (typeof fetch !== 'undefined') ? fetch : (global && global.fetch);
    if (!fetchFn) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Fetch API not available in runtime', normalizedRows })
      };
    }

    const res = await fetchFn(endpoint, {
      method: 'POST',
      headers: fetchHeaders,
      body: JSON.stringify(normalizedRows)
    });

    const text = await res.text();
    let parsedRes;
    try {
      parsedRes = text ? JSON.parse(text) : null;
    } catch (err) {
      parsedRes = text;
    }

    if (!res.ok) {
      return {
        statusCode: res.status || 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Insert failed', detail: parsedRes, normalizedRows })
      };
    }

    // Success: return inserted rows and normalizedRows for traceability
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        ok: true,
        inserted: parsedRes,
        normalizedRows
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal error', detail: String(err), normalizedRows })
    };
  }
};