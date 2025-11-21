/**
 * netlify/functions/firestore-import.js
 *
 * Debug helper Netlify Function for diagnosing runtime failures.
 *
 * Responsibilities:
 * - Log module load to help detect errors that occur during require/import time.
 * - Provide permissive CORS headers for testing.
 * - Handle OPTIONS/GET/POST and return clear JSON so invocations create logs.
 *
 * IMPORTANT: This is a debug-only function. Remove or replace with secure implementation
 * after you resolve the runtime issue.
 */

/**
 * buildCorsHeadersDebug
 * @description Returns permissive CORS headers used for debug responses.
 * @returns {Record<string,string>}
 */
function buildCorsHeadersDebug() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Headers': 'Content-Type, X-ADMIN-KEY, Accept',
    'Access-Control-Max-Age': '600',
    'Vary': 'Origin',
    'Content-Type': 'application/json'
  };
}

/**
 * logSafeEnv
 * @description Log a small, safe subset of environment variables for debug purposes.
 *              Avoid dumping secrets in long-term logs. This is for transient debugging.
 */
function logSafeEnv() {
  try {
    const safe = {
      NODE_ENV: process.env.NODE_ENV,
      NETLIFY_BUILD_VERSION: process.env.NETLIFY_BUILD_VERSION,
      NETLIFY_SITE_ID: process.env.NETLIFY_SITE_ID ? 'present' : 'missing',
      AWS_REGION: process.env.AWS_REGION ? 'present' : 'missing'
    };
    console.log('firestore-import: env snapshot', safe);
  } catch (err) {
    console.log('firestore-import: env log failed', String(err));
  }
}

/**
 * module-load log
 * @description This executes on module require. If the function fails before handler runs,
 *              logs here will show up in Netlify invocation / initialization logs.
 */
console.log('firestore-import: module loaded', { time: new Date().toISOString(), pid: process.pid });
logSafeEnv();

/**
 * handler
 * @param {import('http').IncomingMessage & { method?: string }} event
 * @returns {Promise<{statusCode:number,headers:Object,body:string}>}
 * @description Main Netlify function handler. Succeeds on OPTIONS/GET/POST and logs details.
 */
exports.handler = async function handler(event) {
  const cors = buildCorsHeadersDebug();
  try {
    console.log('firestore-import: invocation start', {
      time: new Date().toISOString(),
      method: event.httpMethod,
      path: event.path,
      query: event.queryStringParameters || null
    });

    // OPTIONS preflight
    if (event.httpMethod === 'OPTIONS') {
      console.log('firestore-import: handling OPTIONS');
      return {
        statusCode: 204,
        headers: cors,
        body: ''
      };
    }

    // GET /health quick-check
    if (event.httpMethod === 'GET') {
      const isHealth = (event.path && event.path.endsWith('/health')) || (event.queryStringParameters && ('health' in event.queryStringParameters || 'run' in event.queryStringParameters));
      if (isHealth) {
        console.log('firestore-import: returning health OK');
        return {
          statusCode: 200,
          headers: cors,
          body: JSON.stringify({ ok: true, time: Date.now(), note: 'debug-health' })
        };
      }

      // Generic GET: echo query
      return {
        statusCode: 200,
        headers: cors,
        body: JSON.stringify({ ok: true, method: 'GET', query: event.queryStringParameters || null })
      };
    }

    // POST: echo body
    if (event.httpMethod === 'POST') {
      let body = event.body;
      try {
        body = event.body ? JSON.parse(event.body) : null;
      } catch (err) {
        // Not JSON; leave raw
        console.log('firestore-import: POST body parse failed, returning raw', String(err));
      }

      console.log('firestore-import: POST body', body && typeof body === 'object' ? Object.keys(body) : typeof body);

      return {
        statusCode: 200,
        headers: cors,
        body: JSON.stringify({ ok: true, method: 'POST', echo: body })
      };
    }

    // Method not allowed
    console.log('firestore-import: method not allowed', event.httpMethod);
    return {
      statusCode: 405,
      headers: cors,
      body: JSON.stringify({ error: 'Method Not Allowed. Use POST/GET/OPTIONS.' })
    };
  } catch (err) {
    console.error('firestore-import: handler error', err && err.stack ? err.stack : String(err));
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: String(err) })
    };
  }
};