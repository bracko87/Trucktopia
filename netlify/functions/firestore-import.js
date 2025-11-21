/**
 * netlify/functions/firestore-import.js
 *
 * Serverless function to migrate prepared localStorage items to Firestore.
 *
 * Responsibilities:
 * - Accept POST requests with a JSON payload describing migration items.
 * - Validate an admin key header against FIRESTORE_ADMIN_KEY (if set).
 * - Read service account JSON from FIRESTORE_SA environment variable (base64).
 * - Create a signed JWT (RS256), exchange it for an OAuth2 access token.
 * - Sequentially write documents to Firestore via the REST API.
 * - Return per-item statuses and errors to the caller.
 *
 * Security & CORS:
 * - This version adds CORS handling and OPTIONS preflight support.
 * - Allowed origins can be configured via ALLOWED_ORIGINS (comma separated).
 * - If ALLOWED_ORIGINS is not set, the function will echo the request Origin (if present),
 *   or fall back to process.env.URL (Netlify site URL), or '*' as last resort.
 *
 * Notes:
 * - Do NOT store service account JSON in the repository. Use Netlify environment
 *   variable FIRESTORE_SA (base64 encoded service account JSON).
 * - Provide a strong FIRESTORE_ADMIN_KEY in your Netlify env vars and include the
 *   same key in the X-ADMIN-KEY request header from the admin UI.
 */

/* eslint-disable no-await-in-loop */
const crypto = require('crypto');

/**
 * base64UrlEncode
 * @description Utility: base64url encode string / buffer
 * @param {Buffer | string} input
 * @returns {string}
 */
function base64UrlEncode(input) {
  const b = Buffer.isBuffer(input) ? input : Buffer.from(String(input));
  return b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * createSignedJwt
 * @description Create a signed JWT (RS256) using the provided service account object.
 * @param {Object} serviceAccount
 * @param {string} scope
 * @param {number} expiresInSeconds
 * @returns {string} signed JWT
 */
function createSignedJwt(serviceAccount, scope, expiresInSeconds = 3600) {
  if (!serviceAccount || !serviceAccount.private_key || !serviceAccount.client_email) {
    throw new Error('Invalid service account JSON. Missing client_email or private_key.');
  }

  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope,
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + expiresInSeconds,
    iat: now
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signingInput);
  sign.end();

  const signature = sign.sign(serviceAccount.private_key);
  const signatureBase64Url = base64UrlEncode(signature);

  return `${signingInput}.${signatureBase64Url}`;
}

/**
 * fetchAccessTokenFromJwt
 * @description Exchange signed JWT for OAuth2 access token
 * @param {string} signedJwt
 * @returns {Promise<string>} access_token
 */
async function fetchAccessTokenFromJwt(signedJwt) {
  const params = new URLSearchParams();
  params.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
  params.append('assertion', signedJwt);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${txt}`);
  }

  const json = await res.json();
  if (!json.access_token) {
    throw new Error('Token exchange did not return access_token: ' + JSON.stringify(json));
  }
  return json.access_token;
}

/**
 * writeDocument
 * @description Write a single document to Firestore via REST API.
 * Document contents are stored under a "data" stringValue to preserve arbitrary shapes.
 * @param {string} projectId
 * @param {string} collection
 * @param {string|undefined} docId
 * @param {any} obj
 * @param {string} token
 * @returns {Promise<any>}
 */
async function writeDocument(projectId, collection, docId, obj, token) {
  const urlBase = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${encodeURIComponent(collection)}`;
  const url = docId ? `${urlBase}?documentId=${encodeURIComponent(docId)}` : urlBase;

  const body = { fields: { data: { stringValue: JSON.stringify(obj) } } };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Failed to write document: ${res.status} ${txt}`);
  }

  return await res.json();
}

/**
 * buildCorsHeaders
 * @description Build Access-Control headers based on request origin and environment.
 * Supports ALLOWED_ORIGINS env var (comma separated). If not set, echoes request origin or falls back.
 * @param {string|null} requestOrigin
 * @returns {Object} headers
 */
function buildCorsHeaders(requestOrigin) {
  // Allowed origins configured by env: comma-separated list
  const configured = process.env.ALLOWED_ORIGINS; // e.g. "https://sider.ai,https://trucktopia.netlify.app"
  let allowedOrigin = '*';

  if (configured && configured.trim().length > 0) {
    const list = configured.split(',').map(s => s.trim()).filter(Boolean);
    if (requestOrigin && list.includes(requestOrigin)) {
      allowedOrigin = requestOrigin;
    } else {
      // If request origin not present or not in list, default to first configured origin
      allowedOrigin = list[0] || '*';
    }
  } else {
    // If no configured list, try to echo request origin (better compatibility for preview) or use Netlify site URL
    allowedOrigin = requestOrigin || process.env.URL || '*';
  }

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-ADMIN-KEY',
    'Access-Control-Max-Age': '600',
    'Content-Type': 'application/json'
  };
}

/**
 * handler
 * @description Netlify function handler with CORS and Firestore migration logic.
 * Accepts POST with { projectId, items: [{id, collection, docId, payload}, ...] }.
 */
exports.handler = async function handler(event) {
  try {
    const requestOrigin = (event.headers && (event.headers.origin || event.headers.Origin)) || null;
    const corsHeaders = buildCorsHeaders(requestOrigin);

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 204,
        headers: corsHeaders,
        body: ''
      };
    }

    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Method Not Allowed. Use POST.' })
      };
    }

    const adminKeyHeader = event.headers['x-admin-key'] || event.headers['X-ADMIN-KEY'] || event.headers['X-Admin-Key'];
    const expectedAdminKey = process.env.FIRESTORE_ADMIN_KEY;

    // If an admin key is configured, validate it
    if (expectedAdminKey && expectedAdminKey.length > 0) {
      if (!adminKeyHeader || adminKeyHeader !== expectedAdminKey) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Invalid or missing X-ADMIN-KEY header.' })
        };
      }
    }

    // Parse body
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (err) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid JSON body' })
      };
    }

    const projectId = body.projectId || process.env.GCP_PROJECT || (process.env.FIRESTORE_PROJECT_ID || '');
    if (!projectId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing projectId in body or FIRESTORE_PROJECT_ID env var.' })
      };
    }

    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'No items to migrate (items array is empty).' })
      };
    }

    const saBase64 = process.env.FIRESTORE_SA;
    if (!saBase64) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Service account not configured (FIRESTORE_SA).' })
      };
    }

    let serviceAccount;
    try {
      const saJson = Buffer.from(saBase64, 'base64').toString('utf8');
      serviceAccount = JSON.parse(saJson);
    } catch (err) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Failed to parse FIRESTORE_SA. Ensure it is base64(serviceAccountJson).' })
      };
    }

    // Create access token
    const scope = 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/cloud-platform';
    const signedJwt = createSignedJwt(serviceAccount, scope);
    const token = await fetchAccessTokenFromJwt(signedJwt);

    // Sequentially upload items
    const results = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      try {
        const docId = it.docId || undefined;
        await writeDocument(projectId, it.collection, docId, it.payload, token);
        results.push({ id: it.id || `${it.collection}:${i}`, collection: it.collection, docId: docId || null, status: 'success' });
      } catch (err) {
        results.push({ id: it.id || `${it.collection}:${i}`, collection: it.collection, docId: it.docId || null, status: 'error', error: String(err) });
      }
      // small delay to be gentle on quotas
      await new Promise(r => setTimeout(r, 150));
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ ok: true, projectId, results })
    };
  } catch (err) {
    // Ensure errors are returned with CORS headers so browser sees them
    const requestOrigin = (event && event.headers && (event.headers.origin || event.headers.Origin)) || null;
    const corsHeaders = buildCorsHeaders(requestOrigin);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: String(err) })
    };
  }
};