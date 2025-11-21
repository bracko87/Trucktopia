/**
 * netlify/functions/firestore-import.js
 *
 * Debug Netlify function for migration testing.
 *
 * - Returns permissive CORS headers so we can confirm the function is deployed and reachable.
 * - GET /health returns a small JSON payload for quick checks.
 * - POST echoes payload (debug only).
 *
 * WARNING: This debug variant uses Access-Control-Allow-Origin: * — do NOT keep this in production.
 */

/**
 * buildCorsHeadersDebug
 * @returns {Record<string,string>} Headers used for debug responses
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
 * Netlify function handler (debug). Ensures CORS headers are present on every response.
 */
exports.handler = async function handler(event) {
  const cors = buildCorsHeadersDebug();

  try {
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 204,
        headers: cors,
        body: ''
      };
    }

    if (event.httpMethod === 'GET') {
      if (event.path && event.path.endsWith('/health')) {
        return {
          statusCode: 200,
          headers: cors,
          body: JSON.stringify({ ok: true, time: Date.now() })
        };
      }

      return {
        statusCode: 200,
        headers: cors,
        body: JSON.stringify({ message: 'firestore-import (debug) - use POST to echo payload', time: Date.now() })
      };
    }

    if (event.httpMethod === 'POST') {
      let body;
      try {
        body = event.body ? JSON.parse(event.body) : null;
      } catch (err) {
        body = event.body;
      }

      console.log('DEBUG POST received. body keys:', body && typeof body === 'object' ? Object.keys(body) : typeof body);

      return {
        statusCode: 200,
        headers: cors,
        body: JSON.stringify({ ok: true, echo: body })
      };
    }

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
