/**
 * netlify/functions/normalize-hubs-relay.js
 *
 * Relay function to securely request the server-side hubs normalizer.
 *
 * Purpose:
 * - Accept requests from a trusted internal server (your game backend) when hubs
 *   are created/updated so the authoritative normalizer runs immediately.
 * - Protects the authoritative write-secret (NORMALIZE_HUBS_SECRET) by only
 *   exposing a separate relay secret (NORMALIZE_HUBS_RELAY_SECRET) to the caller.
 *
 * Usage:
 * - Deploy this function and set the following environment variables in your host:
 *   - NORMALIZE_HUBS_URL: Full public URL to the normalize-hubs function
 *       e.g. https://your-site.netlify.app/.netlify/functions/normalize-hubs
 *   - NORMALIZE_HUBS_SECRET: Secret used by normalize-hubs to permit writes
 *   - NORMALIZE_HUBS_RELAY_SECRET: Secret trusted callers will present to this relay
 *
 * Caller:
 * - Your game server should POST to /.netlify/functions/normalize-hubs-relay
 *   with header 'x-relay-secret: <NORMALIZE_HUBS_RELAY_SECRET>' and optional JSON body.
 *
 * Behaviour:
 * - Validates relay secret.
 * - Forwards the request body to NORMALIZE_HUBS_URL with header
 *   'x-normalize-hubs-secret: <NORMALIZE_HUBS_SECRET>' so the normalizer can perform writes.
 * - Returns normalized function response to caller.
 */

const fetch = globalThis.fetch;

/**
 * sendResponse
 * @description Helper to build Netlify function response
 * @param {number} status HTTP status
 * @param {object} body JSON body
 * @returns {{ statusCode: number, headers: object, body: string }}
 */
function sendResponse(status, body) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body, null, 2)
  };
}

/**
 * handler
 * @description Netlify function handler - entry point
 * @param {object} event Netlify event
 * @returns {Promise<object>} Netlify response
 */
exports.handler = async function (event) {
  try {
    // Ensure POST
    if (event.httpMethod !== 'POST') {
      return sendResponse(405, { ok: false, message: 'Only POST allowed' });
    }

    const RELAY_SECRET = process.env.NORMALIZE_HUBS_RELAY_SECRET || null;
    const NORMALIZE_URL = process.env.NORMALIZE_HUBS_URL || null;
    const NORMALIZE_SECRET = process.env.NORMALIZE_HUBS_SECRET || null;

    if (!NORMALIZE_URL) {
      return sendResponse(500, { ok: false, message: 'NORMALIZE_HUBS_URL not configured' });
    }
    if (!NORMALIZE_SECRET) {
      return sendResponse(500, { ok: false, message: 'NORMALIZE_HUBS_SECRET not configured' });
    }
    if (!RELAY_SECRET) {
      return sendResponse(500, { ok: false, message: 'NORMALIZE_HUBS_RELAY_SECRET not configured' });
    }

    // Validate incoming relay secret header
    const incomingRelay = (event.headers && (event.headers['x-relay-secret'] || event.headers['X-Relay-Secret'])) || null;
    if (!incomingRelay || incomingRelay !== RELAY_SECRET) {
      return sendResponse(401, { ok: false, message: 'Invalid relay secret' });
    }

    // Forward the request to the authoritative normalize-hubs endpoint
    const forwardHeaders = {
      'Content-Type': 'application/json',
      // Authoritative write-secret injected here (kept server-side)
      'X-Normalize-Hubs-Secret': NORMALIZE_SECRET,
      // Optional: add a marker that this call came from the relay
      'X-Relay-Forwarded-By': 'normalize-hubs-relay'
    };

    const forwardOptions = {
      method: 'POST',
      headers: forwardHeaders,
      body: event.body || null,
      // Keep a reasonable timeout controlled by platform / upstream
    };

    const res = await fetch(NORMALIZE_URL, forwardOptions);
    const text = await res.text().catch(() => null);
    let parsed = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch (e) {
      parsed = text;
    }

    return {
      statusCode: res.status || 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        forwardedTo: NORMALIZE_URL,
        status: res.status,
        result: parsed
      }, null, 2)
    };
  } catch (err) {
    return sendResponse(500, { ok: false, message: 'Relay error', error: String(err) });
  }
};
