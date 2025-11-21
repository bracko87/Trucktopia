/**
 * netlify/functions/firestore-import.js
 *
 * Debug wrapper for firestore-import Netlify Function.
 *
 * Purpose:
 * - Minimal, robust handler that logs on module load and on each invocation.
 * - Returns permissive CORS headers and clear JSON responses.
 * - Use this to force production invocation logs so we can inspect runtime errors.
 *
 * Note: This is a temporary debug function. Replace with the real implementation
 * after troubleshooting is complete.
 */

/**
 * buildCorsHeaders
 * @description Build permissive CORS headers for easier testing.
 * @returns {{[k:string]: string}}
 */
function buildCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Content-Type': 'application/json'
  };
}

/**
 * module-load log
 * @description Logged immediately when the function module is required by Netlify.
 */
try {
  console.log('firestore-import: module loaded', { time: new Date().toISOString(), pid: process.pid });
} catch (err) {
  // Ensure module-load logging never throws
}

/**
 * handler
 * @description Netlify function handler. Logs invocation details and returns safe responses.
 * @param {Object} event - Netlify event payload
 * @returns {Promise<{statusCode:number, headers:Object, body:string}>}
 */
exports.handler = async function handler(event) {
  const headers = buildCorsHeaders();

  try {
    console.log('firestore-import: invocation start', {
      time: new Date().toISOString(),
      method: event && event.httpMethod,
      path: event && event.path,
      query: (event && event.queryStringParameters) || null
    });

    // OPTIONS preflight
    if (event.httpMethod === 'OPTIONS') {
      console.log('firestore-import: OPTIONS preflight received');
      return {
        statusCode: 204,
        headers,
        body: ''
      };
    }

    // Health shortcut if path ends with /health or query param health=true
    const isHealthPath = event.path && event.path.endsWith('/health');
    const isHealthQuery = event.queryStringParameters && ('health' in event.queryStringParameters || 'run' in event.queryStringParameters);

    if (isHealthPath || isHealthQuery) {
      console.log('firestore-import: returning health OK');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: true, time: Date.now(), note: 'debug-health' })
      };
    }

    // Echo GET/POST
    let echo = null;
    if (event.httpMethod === 'POST') {
      try {
        echo = event.body ? JSON.parse(event.body) : null;
      } catch (e) {
        echo = event.body || null;
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        method: event.httpMethod,
        query: event.queryStringParameters || null,
        echo
      })
    };
  } catch (err) {
    console.error('firestore-import: handler error', err && (err.stack || String(err)));
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: String(err) })
    };
  }
};
