/**
 * netlify/functions/migrate.js
 *
 * Production-ready Netlify function to import migration payloads into Supabase.
 *
 * Responsibilities:
 * - Normalize a variety of incoming payload shapes into canonical rows:
 *     { collection_name, payload: object, metadata: object }
 * - Honor dry-run via query param (?dryRun=true) or header X-Dry-Run: true.
 * - When not in dry-run, POST normalized rows to Supabase REST (table from MIGRATION_TABLE env).
 * - Validate required environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).
 * - Optionally require ADMIN_TOKEN header to authorize callers (if ADMIN_TOKEN env is set).
 *
 * Notes:
 * - This function avoids unsafe regular expressions. Uses /\/$/ to strip trailing slash.
 * - Responses always include normalizedRows and requestBody for auditability.
 */

/**
 * @description Safe JSON parse. Returns null on parse error.
 * @param {string|undefined|null} str
 * @returns {any|null}
 */
function safeJsonParse(str) {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch (err) {
    return null;
  }
}

/**
 * @description Ensure a value is a plain object. Returns {} when invalid.
 * @param {any} v
 * @returns {object}
 */
function asObject(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  return v;
}

/**
 * @description Remove trailing slash from a URL.
 * Uses a safe regex with no flags.
 * @param {string} url
 * @returns {string}
 */
function stripTrailingSlash(url) {
  if (!url) return url;
  return url.replace(/\/$/, '');
}

/**
 * @description Build a canonical row for preview/insertion.
 * Ensures payload is an object (wraps arrays into { items: [...] }).
 * @param {string} collectionName
 * @param {any} payload
 * @param {any} metadata
 * @returns {{collection_name: string, payload: object, metadata: object}}
 */
function makeRow(collectionName, payload, metadata) {
  const p = payload == null ? {} : payload;
  const payloadObj = Array.isArray(p) ? { items: p } : (typeof p === 'object' ? p : { value: p });
  const metaObj = asObject(metadata);
  return {
    collection_name: String(collectionName || 'unnamed_collection'),
    payload: payloadObj,
    metadata: metaObj
  };
}

/**
 * @description Normalize different incoming shapes into canonical rows.
 * Accepts:
 * - top-level array -> becomes payload.items
 * - { collections: { name: [...] } } -> multiple rows
 * - { collection_name || collection_key, items|payload|... }
 * - fallback: treat whole body as single payload
 *
 * @param {any} body
 * @returns {Array}
 */
function normalizeBodyToRows(body) {
  const rows = [];

  // Top-level array -> unnamed_collection payload.items
  if (Array.isArray(body)) {
    rows.push(makeRow('unnamed_collection', { items: body }, {}));
    return rows;
  }

  if (!body || typeof body !== 'object') {
    rows.push(makeRow('unnamed_collection', { items: [body] }, {}));
    return rows;
  }

  // collections envelope
  if (body.collections && typeof body.collections === 'object') {
    const globalMetadata = asObject(body.metadata);
    for (const key of Object.keys(body.collections)) {
      const value = body.collections[key];
      const payload = Array.isArray(value) ? { items: value } : value;
      rows.push(makeRow(key, payload, globalMetadata));
    }
    return rows;
  }

  // explicit collection name / key detection
  const collectionName =
    body.collection_name ?? body.collectionKey ?? body.collection_key ?? body.collection ?? null;

  if (collectionName) {
    if (body.items && Array.isArray(body.items)) {
      rows.push(makeRow(collectionName, { items: body.items }, body.metadata ?? {}));
      return rows;
    }
    if (body.payload) {
      rows.push(makeRow(collectionName, body.payload, body.metadata ?? {}));
      return rows;
    }
    // treat other keys as payload
    const cloned = { ...body };
    delete cloned.collection_name;
    delete cloned.collectionKey;
    delete cloned.collection_key;
    delete cloned.collection;
    delete cloned.metadata;
    delete cloned.items;
    delete cloned.payload;
    if (Object.keys(cloned).length === 0 && body.items && Array.isArray(body.items)) {
      rows.push(makeRow(collectionName, { items: body.items }, body.metadata ?? {}));
    } else if (Object.keys(cloned).length === 0 && body.payload) {
      rows.push(makeRow(collectionName, body.payload, body.metadata ?? {}));
    } else {
      rows.push(makeRow(collectionName, cloned, body.metadata ?? {}));
    }
    return rows;
  }

  // top-level items -> unnamed
  if (body.items && Array.isArray(body.items)) {
    rows.push(makeRow('unnamed_collection', { items: body.items }, body.metadata ?? {}));
    return rows;
  }

  // fallback: whole body as payload
  rows.push(makeRow('unnamed_collection', body, body.metadata ?? {}));
  return rows;
}

/**
 * @description Netlify function handler for migration.
 * - GET: health check
 * - POST: normalized insert (dry-run or real)
 *
 * @param {import('aws-lambda').APIGatewayEvent} event
 * @param {any} context
 */
exports.handler = async function (event, context) {
  try {
    const headers = (event && (event.headers || {})) || {};
    const qp = (event && (event.queryStringParameters || {})) || {};

    // Accept multiple header casings
    const dryRunHeader =
      headers['x-dry-run'] ?? headers['X-Dry-Run'] ?? headers['x-dryrun'] ?? headers['X-DryRun'];

    const dryRun =
      String(dryRunHeader || '').toLowerCase() === 'true' ||
      String(qp.dryRun || qp.dryrun || '').toLowerCase() === 'true' ||
      // Support env-driven dry-run override for safety (set MIGRATION_DRY_RUN=true)
      String(process.env.MIGRATION_DRY_RUN || '').toLowerCase() === 'true';

    // Accept simple health-check GET
    if (event.httpMethod === 'GET') {
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true, service: 'migrate', version: 1 })
      };
    }

    // OPTIONS preflight (useful for browser testing)
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Dry-Run'
        },
        body: ''
      };
    }

    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ ok: false, error: 'Method not allowed' })
      };
    }

    // Optional admin token check: if ADMIN_TOKEN is set in env, enforce it.
    const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
    const authHeader = (headers.authorization || headers.Authorization || '') || '';
    if (ADMIN_TOKEN) {
      const expected = `Bearer ${ADMIN_TOKEN}`;
      if (authHeader !== expected) {
        return {
          statusCode: 401,
          body: JSON.stringify({ ok: false, error: 'Unauthorized' })
        };
      }
    }

    // Parse body safely; Netlify supplies event.body as string
    const rawBody = event.body;
    const parsed = safeJsonParse(rawBody) ?? {};

    // Normalize incoming shapes
    const normalizedRows = normalizeBodyToRows(parsed);

    // Ensure payload and metadata are plain objects in every row
    for (let i = 0; i < normalizedRows.length; i++) {
      normalizedRows[i].payload = asObject(normalizedRows[i].payload);
      normalizedRows[i].metadata = asObject(normalizedRows[i].metadata);
    }

    // Build exact request body we'd send to Supabase/PostgREST
    const requestBody = JSON.stringify(normalizedRows);

    // Dry-run: return normalized rows and request body without inserting
    if (dryRun) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: true,
          dryRun: true,
          normalizedRows,
          requestBody,
          note: 'DEBUG MODE: This function will NOT insert to Supabase. Deploy production version to perform inserts.'
        })
      };
    }

    // Production path: perform REST insert into Supabase
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const MIGRATION_TABLE = process.env.MIGRATION_TABLE || 'migration_items';

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          ok: false,
          error: 'Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY'
        })
      };
    }

    const insertUrl = `${stripTrailingSlash(SUPABASE_URL)}/rest/v1/${encodeURIComponent(MIGRATION_TABLE)}`;

    // Perform the POST
    const fetchFn = (typeof fetch === 'function' ? fetch : (globalThis && globalThis.fetch));
    if (!fetchFn) {
      return {
        statusCode: 500,
        body: JSON.stringify({ ok: false, error: 'Fetch is not available in this runtime' })
      };
    }

    const resp = await fetchFn(insertUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Prefer: 'return=representation'
      },
      body: requestBody
    });

    const text = await resp.text();
    let parsedResp;
    try {
      parsedResp = text ? JSON.parse(text) : text;
    } catch (e) {
      parsedResp = text;
    }

    if (!resp.ok) {
      return {
        statusCode: 502,
        body: JSON.stringify({
          ok: false,
          error: 'Supabase REST insert failed',
          status: resp.status,
          body: parsedResp
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        inserted: Array.isArray(parsedResp) ? parsedResp.length : 1,
        rows: parsedResp,
        normalizedRows,
        requestBody
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: String(err && err.message ? err.message : err),
        stack: err && err.stack ? String(err.stack) : undefined
      })
    };
  }
};