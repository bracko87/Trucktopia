/**
 * debug-admin-token.js
 *
 * Simple Netlify Function for debugging ADMIN_TOKEN and incoming Authorization header.
 *
 * Purpose:
 * - Return SHA-256 hex of the server's ADMIN_TOKEN (if set) — safe one-way check.
 * - Return SHA-256 hex of the received Authorization token (if present) so you can compare hashes.
 * - Provide consistent CORS headers so browser preflight checks succeed.
 *
 * Usage:
 * - POST to /.netlify/functions/debug-admin-token with header:
 *     Authorization: Bearer <your-token>
 *   The response will contain { adminTokenHash, receivedTokenHash }.
 *
 * Security:
 * - This function intentionally does NOT return the raw ADMIN_TOKEN.
 * - Remove this file after debugging.
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

exports.handler = async (event) => {
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

    // Only allow POST for this debug endpoint
    if (method !== 'POST') {
      return {
        statusCode: 405,
        headers: buildCorsHeaders(),
        body: JSON.stringify({ ok: false, message: 'Method Not Allowed' })
      };
    }

    const headers = event.headers || {};
    // Normalize header lookup (Netlify usually lowercases headers)
    const authHeader = (headers.authorization || headers.Authorization || '').toString();
    const token = authHeader && authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : null;
    const receivedTokenHash = token ? hashToken(token) : null;

    const ADMIN_TOKEN = process.env.ADMIN_TOKEN || null;
    const adminTokenHash = ADMIN_TOKEN ? hashToken(ADMIN_TOKEN) : null;

    return {
      statusCode: 200,
      headers: buildCorsHeaders(),
      body: JSON.stringify({
        ok: true,
        note: 'Hashes only — raw tokens are never returned. Remove this debug endpoint after use.',
        adminTokenHash,
        receivedTokenHash,
        authHeaderPresent: !!authHeader,
        authHeaderRawExample: authHeader ? (authHeader.length > 32 ? authHeader.slice(0, 16) + '…' : authHeader) : null
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: buildCorsHeaders(),
      body: JSON.stringify({ ok: false, message: 'Server error', error: String(err && err.message ? err.message : err) })
    };
  }
};