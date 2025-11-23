/**
 * netlify/functions/migrate.js
 *
 * Netlify function handler for migration endpoint.
 *
 * Improvements made:
 * - Robust CORS handling: echoes origin when MIGRATION_ALLOW_ORIGIN is configured,
 *   includes Vary: Origin, and sets Access-Control-Allow-Credentials when appropriate.
 * - Ensures CORS headers are always present (including on OPTIONS preflight and errors).
 *
 * Keep DEBUG=true to see debug logs in Netlify function logs.
 */

/**
 * detectMethod
 * @description Determine HTTP method across Netlify event shapes.
 * @param {object} event
 * @returns {string}
 */
const detectMethod = (event) => {
  if (!event) return '';
  if (typeof event.httpMethod === 'string') return event.httpMethod.toUpperCase();
  if (event.requestContext && event.requestContext.http && event.requestContext.http.method) {
    return String(event.requestContext.http.method).toUpperCase();
  }
  if (event.method) return String(event.method).toUpperCase();
  return '';
};

/**
 * hashToken
 * @description Return SHA-256 hex string or null on failure.
 * @param {string} token
 * @returns {string|null}
 */
const hashToken = (token) => {
  try {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(String(token)).digest('hex');
  } catch (e) {
    return null;
  }
};

/**
 * buildCorsHeaders
 * @description Build CORS headers. If MIGRATION_ALLOW_ORIGIN is a specific origin (or list of origins),
 *              the function will echo the request origin when allowed (required for credentials).
 * @param {string} requestOrigin - Origin header from the incoming request (may be undefined)
 * @returns {{[k:string]:string}}
 */
const buildCorsHeaders = (requestOrigin) => {
  const RAW_ALLOW = (process.env.MIGRATION_ALLOW_ORIGIN || '*').trim();
  // Accept comma-separated list of allowed origins in env var
  const allowedList = RAW_ALLOW === '*' ? ['*'] : RAW_ALLOW.split(',').map(s => s.trim()).filter(Boolean);

  let originHeader = '*';
  if (allowedList.length === 1 && allowedList[0] === '*') {
    originHeader = '*';
  } else if (requestOrigin && allowedList.includes(requestOrigin)) {
    // Echo the incoming origin if explicitly allowed
    originHeader = requestOrigin;
  } else if (allowedList.length === 1) {
    // Single configured origin (not '*'), use it
    originHeader = allowedList[0];
  } else {
    // If requestOrigin not in allowed list, fall back to first configured origin
    originHeader = allowedList[0] || '*';
  }

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': originHeader,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, Prefer, Origin',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };

  // If not wildcard, allow credentials (useful if you use cookies or Authorization in browser)
  if (originHeader !== '*') {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
};

/**
 * makeResponse
 * @description Return response shape that includes CORS headers.
 * @param {number} statusCode
 * @param {object} bodyObj
 * @param {string} requestOrigin
 * @returns {{statusCode:number, headers:object, body:string}}
 */
const makeResponse = (statusCode, bodyObj, requestOrigin) => {
  return {
    statusCode,
    headers: buildCorsHeaders(requestOrigin),
    body: JSON.stringify(bodyObj)
  };
};

/**
 * insertCollection
 * @description Insert a single collection row into Supabase via REST API (if configured).
 *              Dry-run detection via metadata._dryRun or MIGRATION_DRY_RUN env var.
 * @param {string} collectionKey
 * @param {any} value
 * @param {object} metadata
 * @returns {Promise<object>}
 */
const insertCollection = async (collectionKey, value, metadata) => {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const MIGRATION_TABLE = process.env.MIGRATION_TABLE || 'migrated_collections';

  const metadataDryRun = !!(metadata && metadata._dryRun === true);
  const envDryRun = String(process.env.MIGRATION_DRY_RUN || '').toLowerCase() === 'true';
  const dryRun = metadataDryRun || envDryRun;

  const row = {
    collection_key: collectionKey,
    data: value,
    metadata: metadata || {},
    migrated_by: metadata && metadata.requestedBy ? metadata.requestedBy : null,
    status: 'migrated'
  };

  if (dryRun) {
    return {
      collection: collectionKey,
      success: true,
      message: 'DRY_RUN: simulated insert',
      details: row
    };
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return { collection: collectionKey, success: false, message: 'Missing Supabase configuration' };
  }

  const endpoint = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${MIGRATION_TABLE}`;

  try {
    const fetchFn = typeof fetch !== 'undefined' ? fetch : require('node-fetch');
    const res = await fetchFn(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Prefer: 'return=representation'
      },
      body: JSON.stringify(row)
    });

    const text = await res.text();
    let parsed;
    try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }

    if (!res.ok) {
      return { collection: collectionKey, success: false, status: res.status, message: `${res.status} ${res.statusText}`, details: parsed };
    }

    return { collection: collectionKey, success: true, status: res.status, message: 'Inserted', details: parsed };
  } catch (err) {
    return { collection: collectionKey, success: false, message: String(err && err.message ? err.message : err) };
  }
};

/**
 * handler
 * @description Netlify function handler: supports OPTIONS preflight and POST migration logic.
 *              Always returns receivedTokenHash (if Authorization header present) to aid debugging.
 */
exports.handler = async (event, context) => {
  try {
    const requestOrigin = (event.headers && (event.headers.origin || event.headers.Origin)) || undefined;
    const method = detectMethod(event);

    // Ensure preflight responds with CORS headers
    if (method === 'OPTIONS') {
      return {
        statusCode: 204,
        headers: buildCorsHeaders(requestOrigin),
        body: ''
      };
    }

    if (method !== 'POST') {
      return makeResponse(405, { ok: false, message: 'Method Not Allowed' }, requestOrigin);
    }

    const headers = event.headers || {};
    const authHeader = (headers.authorization || headers.Authorization || '').toString();
    const token = authHeader && authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : null;
    const receivedTokenHash = token ? hashToken(token) : null;
    const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

    if (!token || token !== ADMIN_TOKEN) {
      const body = { ok: false, message: 'Unauthorized' };
      if (receivedTokenHash) body.receivedTokenHash = receivedTokenHash;
      return makeResponse(401, body, requestOrigin);
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const dryRun = String(process.env.MIGRATION_DRY_RUN || '').toLowerCase() === 'true';

    if (!dryRun && (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY)) {
      return makeResponse(500, { ok: false, message: 'Server misconfigured: missing Supabase URL or service role key' }, requestOrigin);
    }

    if (!event.body) {
      return makeResponse(400, { ok: false, message: 'Missing request body' }, requestOrigin);
    }

    let payload;
    try {
      payload = JSON.parse(event.body);
    } catch (err) {
      return makeResponse(400, { ok: false, message: 'Invalid JSON body' }, requestOrigin);
    }

    const { metadata = {}, collections = {} } = payload;
    if (!collections || typeof collections !== 'object' || Object.keys(collections).length === 0) {
      return makeResponse(400, { ok: false, message: 'No collections provided' }, requestOrigin);
    }

    if (dryRun) {
      const results = [];
      for (const [key, value] of Object.entries(collections)) {
        const simulatedRow = {
          collection_key: key,
          data: value,
          metadata: metadata || {},
          migrated_by: metadata && metadata.requestedBy ? metadata.requestedBy : null,
          status: 'migrated'
        };
        results.push({
          collection: key,
          success: true,
          message: 'DRY_RUN: simulated insert',
          details: simulatedRow
        });
      }
      return makeResponse(200, { ok: true, results }, requestOrigin);
    }

    const results = [];
    for (const [key, value] of Object.entries(collections)) {
      // eslint-disable-next-line no-await-in-loop
      const r = await insertCollection(key, value, { ...(metadata || {}), _dryRun: dryRun });
      results.push(r);
    }

    return makeResponse(200, { ok: true, results }, requestOrigin);
  } catch (err) {
    // Ensure all error responses include CORS headers
    const requestOrigin = (err && err.requestOrigin) || ( (process.env.MIGRATION_ALLOW_ORIGIN && process.env.MIGRATION_ALLOW_ORIGIN !== '*') ? process.env.MIGRATION_ALLOW_ORIGIN : undefined );
    return makeResponse(500, { ok: false, message: 'Server error', error: String(err && err.message ? err.message : err) }, requestOrigin);
  }
};