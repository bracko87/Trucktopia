/**
 * netlify/functions/migrate.js
 *
 * Debug Netlify Function for migration endpoint.
 *
 * Responsibilities:
 * - Support OPTIONS preflight with proper CORS headers.
 * - Accept POST requests with { metadata, collections }.
 * - Validate an Authorization: Bearer <TOKEN> header against ADMIN_TOKEN env var.
 * - Always return a safe SHA-256 hex of the received token (receivedTokenHash) when an Authorization header is present.
 * - Insert collections into a Supabase REST endpoint when configured (uses SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY).
 *
 * Important: Do NOT include your real token in any public channels. Use the returned receivedTokenHash (one-way)
 * to compare with your local SHA-256.
 */

/**
 * buildCorsHeaders
 * @description Build consistent CORS headers for responses.
 * @returns {{[k:string]:string}}
 */
const buildCorsHeaders = () => {
  const ALLOW_ORIGIN = process.env.MIGRATION_ALLOW_ORIGIN || '*';
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': ALLOW_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, Prefer, Origin',
    'Access-Control-Max-Age': '86400'
  };
};

/**
 * makeResponse
 * @description Helper that returns response shapes including CORS headers.
 * @param {number} statusCode
 * @param {object} bodyObj
 * @returns {{statusCode:number, headers:object, body:string}}
 */
const makeResponse = (statusCode, bodyObj) => {
  return {
    statusCode,
    headers: buildCorsHeaders(),
    body: JSON.stringify(bodyObj)
  };
};

/**
 * detectMethod
 * @description Robust method detection for different serverless event shapes.
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
 * @description Compute SHA-256 hex of a token string. Returns null on error.
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
 * insertCollection
 * @description Insert a single collection row into Supabase via REST API (if configured).
 *              This is used when SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are present.
 * @param {string} collectionKey
 * @param {any} value
 * @param {object} metadata
 * @returns {Promise<object>}
 */
const insertCollection = async (collectionKey, value, metadata) => {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const MIGRATION_TABLE = process.env.MIGRATION_TABLE || 'migrated_collections';

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return { collection: collectionKey, success: false, message: 'Missing Supabase configuration' };
  }

  const endpoint = `${SUPABASE_URL.replace(/\\/$/, '')}/rest/v1/${MIGRATION_TABLE}`;
  const row = {
    collection_key: collectionKey,
    data: value,
    metadata: metadata || {},
    migrated_by: metadata && metadata.requestedBy ? metadata.requestedBy : null,
    status: 'migrated'
  };

  try {
    // Use global fetch if available (Netlify provides fetch), else try node-fetch
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
 * @param {object} event
 * @param {object} context
 */
exports.handler = async (event, context) => {
  try {
    const method = detectMethod(event);

    // Handle CORS preflight (OPTIONS)
    if (method === 'OPTIONS') {
      return {
        statusCode: 204,
        headers: buildCorsHeaders(),
        body: ''
      };
    }

    // Only POST allowed beyond this point
    if (method !== 'POST') {
      return makeResponse(405, { ok: false, message: 'Method Not Allowed' });
    }

    const headers = event.headers || {};
    const authHeader = (headers.authorization || headers.Authorization || '').toString();
    const token = authHeader && authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : null;
    const receivedTokenHash = token ? hashToken(token) : null;
    const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

    // If token missing or invalid, return 401 with receivedTokenHash (if present)
    if (!token || token !== ADMIN_TOKEN) {
      const body = { ok: false, message: 'Unauthorized' };
      if (receivedTokenHash) body.receivedTokenHash = receivedTokenHash;
      return makeResponse(401, body);
    }

    // Validate Supabase env
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return makeResponse(500, { ok: false, message: 'Server misconfigured: missing Supabase URL or service role key' });
    }

    if (!event.body) {
      return makeResponse(400, { ok: false, message: 'Missing request body' });
    }

    let payload;
    try {
      payload = JSON.parse(event.body);
    } catch (err) {
      return makeResponse(400, { ok: false, message: 'Invalid JSON body' });
    }

    const { metadata = {}, collections = {} } = payload;
    if (!collections || typeof collections !== 'object' || Object.keys(collections).length === 0) {
      return makeResponse(400, { ok: false, message: 'No collections provided' });
    }

    // Process collections sequentially for audit/safety
    const results = [];
    for (const [key, value] of Object.entries(collections)) {
      // eslint-disable-next-line no-await-in-loop
      const r = await insertCollection(key, value, metadata);
      results.push(r);
    }

    return makeResponse(200, { ok: true, results });
  } catch (err) {
    return makeResponse(500, { ok: false, message: 'Server error', error: String(err && err.message ? err.message : err) });
  }
};