/**
 * netlify/functions/migrate.js
 *
 * Serverless migration endpoint for Netlify Functions with robust CORS & OPTIONS support.
 *
 * Responsibilities:
 * - Validate an admin token sent in the Authorization header ("Bearer <TOKEN>").
 * - Accept a migration payload { metadata, collections, options } via POST.
 * - Insert a single row per collection into the configured Supabase table
 *   (defaults to "migrated_collections") using Supabase REST API and the
 *   SUPABASE_SERVICE_ROLE_KEY environment variable.
 *
 * CORS:
 * - Supports OPTIONS preflight and sets Access-Control-Allow-* headers on all responses.
 * - Uses MIGRATION_ALLOW_ORIGIN env var or defaults to '*' for Access-Control-Allow-Origin.
 *
 * Security:
 * - SUPABASE_SERVICE_ROLE_KEY must be set in Netlify environment variables.
 * - ADMIN_TOKEN must be set to protect this endpoint.
 */

/**
 * buildCorsHeaders
 * @description Build consistent CORS headers for responses. Uses MIGRATION_ALLOW_ORIGIN env var or "*".
 * @returns {Record<string,string>} headers
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
 * @returns {object}
 */
const makeResponse = (statusCode, bodyObj) => {
  return {
    statusCode,
    headers: buildCorsHeaders(),
    body: JSON.stringify(bodyObj)
  };
};

/**
 * insertCollection
 * @description Insert a single collection row into Supabase via REST API.
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

  const endpoint = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${MIGRATION_TABLE}`;
  const row = {
    collection_key: collectionKey,
    data: value,
    metadata: metadata || {},
    migrated_by: metadata && metadata.requestedBy ? metadata.requestedBy : null,
    status: 'migrated'
  };

  try {
    const res = await fetch(endpoint, {
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
 * detectMethod
 * @description Robust method detection for different serverless event shapes (Netlify / Vercel / legacy).
 * @param {object} event
 * @returns {string} Uppercase HTTP method or empty string.
 */
const detectMethod = (event) => {
  // Common: Netlify uses event.httpMethod
  if (event && typeof event.httpMethod === 'string') return event.httpMethod.toUpperCase();
  // Newer wrappers may use requestContext.http.method
  if (event && event.requestContext && event.requestContext.http && event.requestContext.http.method) {
    return String(event.requestContext.http.method).toUpperCase();
  }
  // Some runtimes use event.method
  if (event && event.method) return String(event.method).toUpperCase();
  // Fallback
  return '';
};

/**
 * handler
 * @description Netlify function handler: supports OPTIONS preflight and POST migration logic.
 * @param {object} event
 * @param {object} context
 */
exports.handler = async (event, context) => {
  try {
    const method = detectMethod(event);

    // Handle CORS preflight (OPTIONS) early and return 204 No Content
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

    // Validate Authorization header: expects "Bearer <TOKEN>"
    const headers = event.headers || {};
    // Normalize header keys
    const authHeader = (headers.authorization || headers.Authorization || headers.Authorization || '').toString();
    const token = authHeader && authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : null;
    const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

    if (!token || token !== ADMIN_TOKEN) {
      return makeResponse(401, { ok: false, message: 'Unauthorized' });
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

    // Process collections sequentially for audit/safety.
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