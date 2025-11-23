/**
 * netlify/functions/ping.js
 *
 * Simple health-check / ping function to verify Netlify Functions connectivity
 * and CORS header behavior. Use this to confirm functions are reachable from
 * your machine/browser before debugging the migrate function.
 */

/**
 * Build standard CORS headers.
 * Echoes the request Origin when MIGRATION_ALLOW_ORIGIN is configured to a
 * specific origin or list (keeps credentials-safe behavior).
 *
 * @param {string|undefined} requestOrigin
 * @returns {{[k:string]:string}}
 */
const buildCorsHeaders = (requestOrigin) => {
  const RAW_ALLOW = (process.env.MIGRATION_ALLOW_ORIGIN || '*').trim();
  const allowedList = RAW_ALLOW === '*' ? ['*'] : RAW_ALLOW.split(',').map(s => s.trim()).filter(Boolean);

  let originHeader = '*';
  if (allowedList.length === 1 && allowedList[0] === '*') {
    originHeader = '*';
  } else if (requestOrigin && allowedList.includes(requestOrigin)) {
    originHeader = requestOrigin;
  } else if (allowedList.length === 1 && allowedList[0]) {
    originHeader = allowedList[0];
  } else {
    originHeader = allowedList[0] || '*';
  }

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': originHeader,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, Prefer, Origin',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };

  if (originHeader !== '*') {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
};

/**
 * Netlify handler
 * - Responds to OPTIONS with 204 + CORS headers
 * - For GET/POST returns a small JSON { ok: true, message: 'pong' } + CORS
 */
exports.handler = async (event, context) => {
  try {
    const requestOrigin = (event.headers && (event.headers.origin || event.headers.Origin)) || undefined;
    const headers = buildCorsHeaders(requestOrigin);

    // Preflight
    const method = (event.httpMethod || event.method || '').toUpperCase();
    if (method === 'OPTIONS') {
      return { statusCode: 204, headers, body: '' };
    }

    // Normal response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, message: 'pong', timestamp: new Date().toISOString() })
    };
  } catch (err) {
    const requestOrigin = (event && event.headers && (event.headers.origin || event.headers.Origin)) || undefined;
    const headers = buildCorsHeaders(requestOrigin);
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: String(err && err.message ? err.message : err) }) };
  }
};