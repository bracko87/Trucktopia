/**
 * netlify/functions/migrate.js
 *
 * Debugging Netlify function for migration payload normalization.
 *
 * Responsibilities:
 * - Parse incoming event.body and normalize several accepted shapes into rows:
 *     { collection_name: string, payload: object, metadata: object }
 * - Guarantee payload and metadata are plain objects (never undefined).
 * - Return the exact JSON string that WOULD be sent to Supabase as "requestBody"
 *   so we can inspect why Supabase's jsonb fields end up empty.
 *
 * NOTE: This debug version intentionally does NOT perform any insert to Supabase.
 * Deploy this temporarily, run your dry-run request and paste the response here.
 */

/**
 * @description Safe JSON parse. Returns null on parse error.
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
 * @description Build a canonical row for preview/insertion.
 * Ensures payload is an object (wraps arrays into { items: [...] }).
 * @param {string} collectionName
 * @param {any} payload
 * @param {any} metadata
 * @returns {{collection_name: string, payload: object, metadata: object}}
 */
function makeRow(collectionName, payload, metadata) {
  const p = payload == null ? {} : payload;
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
 * - top-level array -> becomes payload.items
 * - { collections: { name: [...] } } -> multiple rows
 * - { collection_name || collection_key || collection_key, items|payload|... }
 * - fallback: treat whole body as single payload
 *
 * @param {any} body
 * @returns {Array}
 */
function normalizeBodyToRows(body) {
  const rows = [];

  // Top-level array -> unnamed_collection payload.items
  if (Array.isArray(body)) {
    rows.push(makeRow('unnamed_collection', { items: body }, {}));
    return rows;
  }

  if (!body || typeof body !== 'object') {
    rows.push(makeRow('unnamed_collection', { items: [body] }, {}));
    return rows;
  }

  // collections envelope
  if (body.collections && typeof body.collections === 'object') {
    const globalMetadata = asObject(body.metadata);
    for (const key of Object.keys(body.collections)) {
      const value = body.collections[key];
      const payload = Array.isArray(value) ? { items: value } : value;
      rows.push(makeRow(key, payload, globalMetadata));
    }
    return rows;
  }

  // explicit collection name / key detection
  const collectionName =
    body.collection_name ?? body.collectionKey ?? body.collection_key ?? body.collection ?? null;

  if (collectionName) {
    if (body.items && Array.isArray(body.items)) {
      rows.push(makeRow(collectionName, { items: body.items }, body.metadata ?? {}));
      return rows;
    }
    if (body.payload) {
      rows.push(makeRow(collectionName, body.payload, body.metadata ?? {}));
      return rows;
    }
    // treat other keys as payload
    const cloned = { ...body };
    delete cloned.collection_name;
    delete cloned.collectionKey;
    delete cloned.collection_key;
    delete cloned.collection;
    delete cloned.metadata;
    delete cloned.items;
    delete cloned.payload;
    if (Object.keys(cloned).length === 0 && body.items && Array.isArray(body.items)) {
      rows.push(makeRow(collectionName, { items: body.items }, body.metadata ?? {}));
    } else if (Object.keys(cloned).length === 0 && body.payload) {
      rows.push(makeRow(collectionName, body.payload, body.metadata ?? {}));
    } else {
      rows.push(makeRow(collectionName, cloned, body.metadata ?? {}));
    }
    return rows;
  }

  // top-level items -> unnamed
  if (body.items && Array.isArray(body.items)) {
    rows.push(makeRow('unnamed_collection', { items: body.items }, body.metadata ?? {}));
    return rows;
  }

  // fallback: whole body as payload
  rows.push(makeRow('unnamed_collection', body, body.metadata ?? {}));
  return rows;
}

/**
 * @description Remove trailing slash from a URL (safe regex - no flags).
 * @param {string} url
 * @returns {string}
 */
function stripTrailingSlash(url) {
  if (!url) return url;
  return url.replace(/\/$/, '');
}

/**
 * @description Netlify function handler (debug-only).
 * This function does NOT insert into Supabase. It returns:
 *  - ok: true
 *  - dryRun: true
 *  - normalizedRows: array
 *  - requestBody: string (JSON.stringify(normalizedRows)) - exact body that would be sent
 *
 * @param {import('aws-lambda').APIGatewayEvent} event
 * @param {any} context
 */
exports.handler = async function (event, context) {
  try {
    const headers = event.headers || {};
    const qp = event.queryStringParameters || {};
    const dryRunHeader =
      headers['x-dry-run'] ?? headers['X-Dry-Run'] ?? headers['x-dryrun'] ?? headers['X-DryRun'];
    const dryRun =
      String(dryRunHeader || '').toLowerCase() === 'true' ||
      String(qp.dryRun || qp.dryrun || '').toLowerCase() === 'true';

    // Parse body safely; Netlify supplies event.body as string
    const rawBody = event.body;
    const body = safeJsonParse(rawBody) ?? {};

    // Normalize incoming shapes
    const normalizedRows = normalizeBodyToRows(body);

    // Ensure payload and metadata are plain objects in every row
    for (let i = 0; i < normalizedRows.length; i++) {
      normalizedRows[i].payload = asObject(normalizedRows[i].payload);
      normalizedRows[i].metadata = asObject(normalizedRows[i].metadata);
    }

    // Build exact request body we'd send to Supabase/PostgREST
    const requestBody = JSON.stringify(normalizedRows);

    // Debug response (never insert in this debug handler)
    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        dryRun: true,
        normalizedRows,
        requestBody,
        note:
          'DEBUG MODE: This function will NOT insert to Supabase. Deploy production version to perform inserts.'
      })
    };
  } catch (err) {
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