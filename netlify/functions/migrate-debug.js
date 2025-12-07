/**
 * netlify/functions/migrate-debug.js
 *
 * @description Temporary debug Netlify Function to help diagnose Authorization / env issues
 * - Safe-by-default: does NOT return ADMIN_TOKEN value.
 * - Returns: whether ADMIN_TOKEN is present, its length, which header names arrived,
 *   whether an Authorization header was present, a masked form of the token (if present),
 *   and the SHA-256 hex of the received token (receivedTokenHash).
 *
 * Usage (curl):
 *   curl -i -X GET "https://your-site.netlify.app/.netlify/functions/migrate-debug" \
 *     -H "Authorization: Bearer <YOUR_TOKEN>"
 *
 * IMPORTANT:
 * - This endpoint is temporary and intended only for debugging. Remove it after you finish debugging.
 */

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
 * maskToken
 * @description Mask a token for safe debugging (first 6 and last 6 chars visible).
 * @param {string} token
 * @returns {string}
 */
const maskToken = (token) => {
  if (!token || token.length <= 12) return '***';
  return `${token.slice(0, 6)}...${token.slice(token.length - 6)}`;
};

exports.handler = async (event) => {
  try {
    const method = detectMethod(event);

    // Only support GET for quick inspection
    if (method !== 'GET') {
      return {
        statusCode: 405,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, message: 'Method Not Allowed - use GET for debugging' })
      };
    }

    const headers = event.headers || {};
    const headerNames = Object.keys(headers).map(h => String(h));

    // Normalize header lookup
    const authHeaderRaw = (headers.authorization || headers.Authorization || '') .toString();

    // Determine if Authorization header had Bearer token
    const hasBearer = authHeaderRaw && authHeaderRaw.toLowerCase().startsWith('bearer ');
    const token = hasBearer ? authHeaderRaw.slice(7).trim() : null;
    const receivedTokenHash = token ? hashToken(token) : null;

    const response = {
      ok: true,
      info: {
        method,
        adminTokenPresentInEnv: !!process.env.ADMIN_TOKEN,
        adminTokenLength: process.env.ADMIN_TOKEN ? String(process.env.ADMIN_TOKEN).length : 0,
        headerNames,
        authorizationHeaderPresent: !!authHeaderRaw,
        authorizationHeaderLooksLikeBearer: hasBearer,
        receivedTokenHash: receivedTokenHash || null,
        maskedReceivedToken: token ? maskToken(token) : null,
        note: 'This function does NOT reveal the ADMIN_TOKEN value. Use the receivedTokenHash to compare locally computed SHA-256.'
      }
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        // Keep CORS headers consistent with migrate.js shape so browser requests behave similarly.
        'Access-Control-Allow-Origin': process.env.MIGRATION_ALLOW_ORIGIN || '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, Prefer, Origin'
      },
      body: JSON.stringify(response)
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, message: 'Server error', error: String(err && err.message ? err.message : err) })
    };
  }
};
