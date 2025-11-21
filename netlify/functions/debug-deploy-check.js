/**
 * netlify/functions/debug-deploy-check.js
 *
 * Simple debug function to verify that a code change/deploy reached the live Netlify site.
 *
 * - Returns { ok: true, deployedAt, receivedTokenHash? } on a POST or GET.
 * - If an Authorization header is present, the function computes a SHA-256 hex of the received token
 *   and returns that as receivedTokenHash (safe, one-way) so you can verify what the server received.
 * - This file is temporary — remove it after debugging.
 */

/**
 * @module debug-deploy-check
 */
const crypto = require('crypto');

/**
 * buildCorsHeaders
 * @description Build consistent CORS response headers for the debug function.
 * @returns {Record<string,string>}
 */
const buildCorsHeaders = () => ({
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
});

/**
 * hashToken
 * @description Compute SHA-256 hex of a token string. Returns null on error.
 * @param {string} token
 * @returns {string|null}
 */
const hashToken = (token) => {
  try {
    return crypto.createHash('sha256').update(String(token)).digest('hex');
  } catch (e) {
    return null;
  }
};

/**
 * handler
 * @description Netlify function handler for deploy-check.
 * @param {object} event
 * @param {object} context
 */
exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: buildCorsHeaders(),
      body: '',
    };
  }

  // Normalize header keys
  const headers = event.headers || {};
  const authHeader = (headers.authorization || headers.Authorization || '').toString();
  const token = authHeader && authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : null;
  const receivedTokenHash = token ? hashToken(token) : null;

  const body = {
    ok: true,
    message: 'debug-deploy-check live',
    deployedAt: new Date().toISOString(),
    receivedTokenHash, // safe one-way hash if Authorization header sent
  };

  return {
    statusCode: 200,
    headers: buildCorsHeaders(),
    body: JSON.stringify(body),
  };
};
