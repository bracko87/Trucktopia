/**
 * netlify/functions/migrate.js
 *
 * Migration function for sandbox usage.
 *
 * Responsibilities:
 * - Normalize incoming payload shapes into canonical rows:
 *     { collection_name, payload: object, metadata: object }
 * - Support dry-run via query param (?dryRun=true) or header X-Dry-Run: true.
 * - When targeting known collections (users, companies, hubs), attempt direct upsert
 *   to the Supabase/PostgREST table using on_conflict=source_id.
 * - When not targeting known collections, or on errors, insert into the migration table
 *   (MIGRATION_TABLE). This preserves the previous fallback behaviour.
 * - Provide a clear health-check GET with a version so you can verify the deployed code.
 *
 * Notes:
 * - This file is self-contained and uses fetch available in the runtime.
 * - All functions below contain brief JSDoc comments as required.
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
 * @description Remove trailing slash from a URL.
 * Uses a safe regex with no flags.
 * @param {string} url
 * @returns {string}
 */
function stripTrailingSlash(url) {
  if (!url) return url;
  return url.replace(/\/$/, '');
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
 * - { collection_name || collection_key, items|payload|... }
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
 * @description Perform a POST to Supabase/PostgREST (REST) endpoint.
 * @param {string} url
 * @param {object} headers
 * @param {any} body
 * @returns {Promise<{ok:boolean,status:number,body:any}>}
 */
async function postToSupabase(url, headers, body) {
  const fetchFn = (typeof fetch === 'function' ? fetch : (globalThis && globalThis.fetch));
  if (!fetchFn) {
    throw new Error('Fetch is not available in this runtime');
  }

  const resp = await fetchFn(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  const text = await resp.text();
  let parsedResp;
  try {
    parsedResp = text ? JSON.parse(text) : text;
  } catch (e) {
    parsedResp = text;
  }

  return { ok: resp.ok, status: resp.status, body: parsedResp, rawStatus: resp.status };
}

/**
 * @description Netlify function handler.
 * - GET: simple health-check with version
 * - OPTIONS: CORS preflight
 * - POST: normalize and insert/upsert rows (dry-run supported)
 *
 * @param {import('aws-lambda').APIGatewayEvent} event
 * @param {any} context
 */
exports.handler = async function (event, context) {
  try {
    const headers = (event && (event.headers || {})) || {};
    const qp = (event && (event.queryStringParameters || {})) || {};

    // Accept multiple header casings for dry-run
    const dryRunHeader =
      headers['x-dry-run'] ?? headers['X-Dry-Run'] ?? headers['x-dryrun'] ?? headers['X-DryRun'];

    const dryRun =
      String(dryRunHeader || '').toLowerCase() === 'true' ||
      String(qp.dryRun || qp.dryrun || '').toLowerCase() === 'true' ||
      // Support env-driven dry-run override for safety (set MIGRATION_DRY_RUN=true)
      String(process.env.MIGRATION_DRY_RUN || '').toLowerCase() === 'true';

    // Accept simple health-check GET
    if (event.httpMethod === 'GET') {
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true, service: 'migrate', version: 3 })
      };
    }

    // OPTIONS preflight (useful for browser testing)
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Dry-Run'
        },
        body: ''
      };
    }

    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ ok: false, error: 'Method not allowed' })
      };
    }

    // Optional admin token check: if ADMIN_TOKEN is set in env, enforce it.
    const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
    const authHeader = (headers.authorization || headers.Authorization || '') || '';
    if (ADMIN_TOKEN) {
      const expected = `Bearer ${ADMIN_TOKEN}`;
      if (authHeader !== expected) {
        return {
          statusCode: 401,
          body: JSON.stringify({ ok: false, error: 'Unauthorized' })
        };
      }
    }

    // Parse body safely; Netlify supplies event.body as string
    const rawBody = event.body;
    const parsed = safeJsonParse(rawBody) ?? {};

    // Normalize incoming shapes
    const normalizedRows = normalizeBodyToRows(parsed);

    // Ensure payload and metadata are plain objects in every row
    for (let i = 0; i < normalizedRows.length; i++) {
      normalizedRows[i].payload = asObject(normalizedRows[i].payload);
      normalizedRows[i].metadata = asObject(normalizedRows[i].metadata);
    }

    // Build exact request body we'd send to Supabase/PostgREST
    const requestBody = JSON.stringify(normalizedRows);

    // If dry-run, return normalized rows and planned upsert targets
    if (dryRun) {
      // Build an additional "plan" describing attempted upserts for known collections
      const SUPABASE_URL = process.env.SUPABASE_URL || null;
      const plan = [];

      for (const row of normalizedRows) {
        const col = String(row.collection_name || '').toLowerCase();
        if (['users', 'companies', 'hubs'].includes(col)) {
          const items = Array.isArray(row.payload.items) ? row.payload.items : [];
          const planned = items.map((it) => {
            const itemObj = typeof it === 'object' ? { ...it } : { value: it };
            if (!itemObj.source_id) {
              if (itemObj.email) itemObj.source_id = `email:${String(itemObj.email).toLowerCase()}`;
            }
            return itemObj;
          });
          plan.push({ collection: col, plannedRows: planned.slice(0, 20) }); // sample up to 20
        } else {
          plan.push({ collection: col, action: 'fallback->migration_items' });
        }
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: true,
          dryRun: true,
          normalizedRows,
          requestBody,
          plan,
          note: 'DEBUG MODE: This function will NOT insert to Supabase. Deploy production version to perform inserts.'
        })
      };
    }

    // Production path: attempt per-collection upserts for known collections, otherwise fallback to migration_items
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const MIGRATION_TABLE = process.env.MIGRATION_TABLE || 'migration_items';

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      // Without Supabase credentials, fallback to inserting into MIGRATION_TABLE is pointless.
      return {
        statusCode: 500,
        body: JSON.stringify({
          ok: false,
          error: 'Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY'
        })
      };
    }

    const base = stripTrailingSlash(SUPABASE_URL);
    const results = {
      upserted: [],
      fallbackInserted: [],
      errors: []
    };

    // Helper headers for Supabase REST
    const supabaseHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Prefer: 'return=representation'
    };

    // Process each normalized row
    for (const row of normalizedRows) {
      const col = String(row.collection_name || '').toLowerCase();
      const items = Array.isArray(row.payload.items) ? row.payload.items : [];

      if (['users', 'companies', 'hubs'].includes(col)) {
        // Prepare rows for upsert: ensure objects and fallback source_id
        const toUpsert = items
          .map((it) => (typeof it === 'object' ? { ...it } : { value: it }))
          .map((itemObj) => {
            if (!itemObj.source_id) {
              if (itemObj.email) {
                itemObj.source_id = `email:${String(itemObj.email).toLowerCase()}`;
              } else if (itemObj.id) {
                // If payload contained an id but not source_id, preserve id as source_id prefix
                itemObj.source_id = `id:${String(itemObj.id)}`;
              }
            }
            return itemObj;
          });

        if (toUpsert.length === 0) {
          // nothing to upsert, skip to next row
          continue;
        }

        try {
          // PostgREST upsert via on_conflict=source_id
          const targetUrl = `${base}/rest/v1/${encodeURIComponent(col)}?on_conflict=source_id`;
          const upsertResp = await postToSupabase(targetUrl, supabaseHeaders, toUpsert);

          if (!upsertResp.ok) {
            // record error and fallback to migration table insertion for this normalized row
            results.errors.push({
              collection: col,
              status: upsertResp.status,
              body: upsertResp.body
            });

            // fallback: insert the normalized row into migration_items
            const migrUrl = `${base}/rest/v1/${encodeURIComponent(MIGRATION_TABLE)}`;
            const migrResp = await postToSupabase(migrUrl, supabaseHeaders, [row]);
            results.fallbackInserted.push({
              collection: col,
              migrationResponse: { ok: migrResp.ok, status: migrResp.status, body: migrResp.body }
            });
          } else {
            results.upserted.push({ collection: col, status: upsertResp.status, rows: upsertResp.body });
          }
        } catch (err) {
          // On unexpected errors, fallback to migration_items to preserve payload
          results.errors.push({ collection: col, error: String(err && err.message ? err.message : err) });
          try {
            const migrUrl = `${base}/rest/v1/${encodeURIComponent(MIGRATION_TABLE)}`;
            const migrResp = await postToSupabase(migrUrl, supabaseHeaders, [row]);
            results.fallbackInserted.push({
              collection: col,
              migrationResponse: { ok: migrResp.ok, status: migrResp.status, body: migrResp.body }
            });
          } catch (inner) {
            results.errors.push({
              collection: col,
              migrationFallbackError: String(inner && inner.message ? inner.message : inner)
            });
          }
        }
      } else {
        // Not a known collection: insert into migration table (previous default behaviour)
        try {
          const migrUrl = `${base}/rest/v1/${encodeURIComponent(MIGRATION_TABLE)}`;
          const migrResp = await postToSupabase(migrUrl, supabaseHeaders, [row]);
          results.fallbackInserted.push({
            collection: col,
            migrationResponse: { ok: migrResp.ok, status: migrResp.status, body: migrResp.body }
          });
        } catch (err) {
          results.errors.push({ collection: col, migrationFallbackError: String(err && err.message ? err.message : err) });
        }
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        inserted: results.upserted.reduce((acc, r) => acc + (Array.isArray(r.rows) ? r.rows.length : 0), 0) + results.fallbackInserted.length,
        results,
        normalizedRows,
        requestBody
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