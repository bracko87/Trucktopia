/**
 * netlify/functions/migrate.js
 *
 * Netlify Function to accept migration payloads and insert them into Supabase
 * (or run a dry-run to preview normalized rows).
 *
 * Responsibilities:
 * - Normalizes a variety of incoming shapes into rows of:
 *     { collection_name: string, payload: object, metadata: object }
 * - Respects dry-run mode (query param dryRun=true OR header X-Dry-Run: true)
 * - When not dry-run, inserts rows into the Supabase REST table configured by
 *   MIGRATION_TABLE env var (defaults to 'migrated_collections').
 *
 * Notes:
 * - Avoids any invalid regular expression flags.
 * - Returns normalizedRows in all responses to aid debugging.
 */

/**
 * @description Safe JSON parse
 * @param {string|undefined|null} str
 * @returns {any|null}
 */
function safeJsonParse(str) {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch (err) {
    return null;
  }
}

/**
 * @description Ensure a value is a plain object. Returns {} when invalid.
 * @param {any} v
 * @returns {object}
 */
function asObject(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  return v;
}

/**
 * @description Build a canonical row for insertion/preview.
 * @param {string} collectionName
 * @param {any} payload
 * @param {any} metadata
 * @returns {{collection_name: string, payload: object, metadata: object}}
 */
function makeRow(collectionName, payload, metadata) {
  const p = payload == null ? {} : payload;
  // If payload is an array, wrap it into payload.items
  const payloadObj = Array.isArray(p) ? { items: p } : (typeof p === 'object' ? p : { value: p });
  const metaObj = asObject(metadata);
  return {
    collection_name: String(collectionName || 'unnamed_collection'),
    payload: payloadObj,
    metadata: metaObj
  };
}

/**
 * @description Normalize different incoming shapes into canonical rows.
 * Accepts:
 * - { collections: { name: [...] , ... }, metadata? }
 * - top-level array -> single row with collection_name "unnamed_collection"
 * - { collection_name / collection_key, payload|items|... }
 * - single object with items -> moved into payload.items
 *
 * @param {any} body
 * @returns {Array}
 */
function normalizeBodyToRows(body) {
  const rows = [];

  // If client posted an array at top-level: wrap into payload.items
  if (Array.isArray(body)) {
    rows.push(makeRow('unnamed_collection', { items: body }, {}));
    return rows;
  }

  if (!body || typeof body !== 'object') {
    // Unknown shape: return a single row using raw body as payload
    rows.push(makeRow('unnamed_collection', { items: [body] }, {}));
    return rows;
  }

  // If collections envelope is present
  if (body.collections && typeof body.collections === 'object') {
    const globalMetadata = asObject(body.metadata);
    for (const key of Object.keys(body.collections)) {
      const value = body.collections[key];
      // value might be array or object
      const payload = Array.isArray(value) ? { items: value } : value;
      rows.push(makeRow(key, payload, globalMetadata));
    }
    return rows;
  }

  // If explicit collection_name(s) provided
  const collectionName = body.collection_name ?? body.collectionKey ?? body.collection_key ?? body.collection ?? null;
  if (collectionName) {
    // If body.items exists move into payload.items
    if (body.items && Array.isArray(body.items)) {
      rows.push(makeRow(collectionName, { items: body.items }, body.metadata ?? {}));
      return rows;
    }
    // If payload present
    if (body.payload) {
      rows.push(makeRow(collectionName, body.payload, body.metadata ?? {}));
      return rows;
    }
    // If body itself has keys other than collection_name and metadata, treat as payload
    const cloned = { ...body };
    delete cloned.collection_name;
    delete cloned.collectionKey;
    delete cloned.collection_key;
    delete cloned.collection;
    delete cloned.metadata;
    delete cloned.items;
    delete cloned.payload;
    // If leftover keys are empty, fallback to items if present earlier; otherwise wrap leftover
    if (Object.keys(cloned).length === 0 && body.items && Array.isArray(body.items)) {
      rows.push(makeRow(collectionName, { items: body.items }, body.metadata ?? {}));
    } else if (Object.keys(cloned).length === 0 && body.payload) {
      rows.push(makeRow(collectionName, body.payload, body.metadata ?? {}));
    } else {
      rows.push(makeRow(collectionName, cloned, body.metadata ?? {}));
    }
    return rows;
  }

  // If body has top-level items and no collection name -> unnamed_collection
  if (body.items && Array.isArray(body.items)) {
    rows.push(makeRow('unnamed_collection', { items: body.items }, body.metadata ?? {}));
    return rows;
  }

  // Last fallback: treat the whole body as a single payload
  rows.push(makeRow('unnamed_collection', body, body.metadata ?? {}));
  return rows;
}

/**
 * @description Helper to remove trailing slash from a URL (no invalid flags)
 * @param {string} url
 * @returns {string}
 */
function stripTrailingSlash(url) {
  if (!url) return url;
  // safe regex - no flags
  return url.replace(/\/$/, '');
}

const fetch = globalThis.fetch || require('node-fetch');

/**
 * @description Netlify function handler
 * @param {import('aws-lambda').APIGatewayEvent} event
 * @param {any} context
 */
exports.handler = async function (event, context) {
  try {
    const headers = event.headers || {};
    const qp = event.queryStringParameters || {};
    const dryRunHeader = headers['x-dry-run'] ?? headers['X-Dry-Run'] ?? headers['x-dryrun'] ?? headers['X-DryRun'];
    const dryRun = (String(dryRunHeader || '').toLowerCase() === 'true') || (String(qp.dryRun || qp.dryrun || '').toLowerCase() === 'true');

    // Parse body safely; Netlify supplies event.body as string
    const rawBody = event.body;
    const body = safeJsonParse(rawBody) ?? {};

    // Normalize incoming shapes
    const normalizedRows = normalizeBodyToRows(body);

    // If dry-run -> return normalizedRows and do not insert
    if (dryRun) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: true,
          dryRun: true,
          normalizedRows
        })
      };
    }

    // Not dry-run -> perform Supabase insert
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const MIGRATION_TABLE = process.env.MIGRATION_TABLE || 'migrated_collections';

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          ok: false,
          error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment',
          normalizedRows
        })
      };
    }

    const endpoint = `${stripTrailingSlash(SUPABASE_URL)}/rest/v1/${encodeURIComponent(MIGRATION_TABLE)}`;

    // PostgREST expects array for bulk insert; send normalizedRows as body
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: 'return=representation'
      },
      body: JSON.stringify(normalizedRows)
    });

    const text = await res.text();
    let parsed;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch (e) {
      parsed = text;
    }

    if (!res.ok) {
      return {
        statusCode: res.status || 500,
        body: JSON.stringify({
          ok: false,
          status: res.status,
          statusText: res.statusText,
          error: parsed,
          normalizedRows
        })
      };
    }

    // Success — return inserted rows (PostgREST returns an array)
    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        inserted: parsed,
        normalizedRows
      })
    };
  } catch (err) {
    // Ensure we never throw a syntax error at top-level again
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: String(err && err.message ? err.message : err),
        stack: err && err.stack ? String(err.stack) : undefined
      })
    };
  }
};