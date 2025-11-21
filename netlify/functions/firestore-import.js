/**
 * netlify/functions/firestore-import.js
 *
 * Debug Netlify function to verify CORS and reachability from browser.
 *
 * Responsibilities:
 * - Return permissive CORS headers for OPTIONS and all responses to help debug preflight issues.
 * - Provide a lightweight GET /health endpoint that returns JSON with CORS headers.
 * - For POST requests this debug version echoes received payload (DOES NOT PERFORM FIRESTORE MIGRATION).
 *
 * WARNING (debug-only):
 * - This file intentionally uses Access-Control-Allow-Origin: * to prove CORS is the issue.
 * - Do NOT keep this debug variant in production. After debugging, restore the secure migration implementation
 *   that validates X-ADMIN-KEY and uses server-side credentials to write to Firestore.
 */

/**
 * buildCorsHeadersDebug
 * @description Return permissive CORS headers for debugging. Uses wildcard Origin '*'.
 * @returns {Record<string,string>} headers
 */
function buildCorsHeadersDebug() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Headers': 'Content-Type, X-ADMIN-KEY',
    'Access-Control-Max-Age': '600',
    'Vary': 'Origin',
    'Content-Type': 'application/json'
  };
}

/**
 * handler
 * @description Netlify function handler (debug). Ensures CORS headers are present on every response.
 */
exports.handler = async function handler(event) {
  const cors = buildCorsHeadersDebug();

  try {
    // Always respond to OPTIONS (preflight) with permissive CORS headers.
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 204,
        headers: cors,
        body: ''
      };
    }

    // Simple health endpoint for quick browser check
    if (event.httpMethod === 'GET') {
      if (event.path && event.path.endsWith('/health')) {
        return {
          statusCode: 200,
          headers: cors,
          body: JSON.stringify({ ok: true, time: Date.now() })
        };
      }

      // Default GET response
      return {
        statusCode: 200,
        headers: cors,
        body: JSON.stringify({ message: 'firestore-import (debug) - use POST to echo payload', time: Date.now() })
      };
    }

    // For debugging, echo back any POST body so you can confirm the request reaches the function.
    if (event.httpMethod === 'POST') {
      let body;
      try {
        body = event.body ? JSON.parse(event.body) : null;
      } catch (err) {
        // If body isn't JSON, echo raw string
        body = event.body;
      }

      // Log minimal info for Netlify logs
      console.log('DEBUG POST received. body keys:', body && typeof body === 'object' ? Object.keys(body) : typeof body);

      return {
        statusCode: 200,
        headers: cors,
        body: JSON.stringify({ ok: true, echo: body })
      };
    }

    // If method not allowed
    return {
      statusCode: 405,
      headers: cors,
      body: JSON.stringify({ error: 'Method Not Allowed. Use POST/GET/OPTIONS.' })
    };
  } catch (err) {
    console.error('Debug handler error', err);
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: String(err) })
    };
  }
};