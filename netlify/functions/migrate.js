/**
 * netlify/functions/migrate.js
 *
 * Robust migration relay for Supabase (PostgREST).
 *
 * Responsibilities:
 * - Accept POST payloads in a variety of shapes and normalize them into rows.
 * - Prefer upserting into target tables using `source_id` as the conflict key.
 *   This avoids sending arbitrary non-UUID values into `id` columns (prevents 22P02).
 * - When `source_id` is not present, derive it from common fields (email lowercased,
 *   uuid id, or a legacy:id fallback).
 * - If upsert fails (table missing or constraint mismatch), fallback to inserting
 *   into the configured MIGRATION_TABLE (migration_items) with a replay_hash to
 *   allow future deduplication.
 * - Dry-run mode returns a clear "plan" of intended upserts without performing them.
 *
 * Notes:
 * - This function uses the Supabase service_role key; ensure it is set as
 *   SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL in environment.
 * - To avoid duplicate fallback-inserts we compute a SHA256 replay_hash of the
 *   serialized payload and skip insertion when an identical migration_items
 *   row already exists for the same collection + hash.
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
 * @description Check whether a value looks like a UUID (v4 style hex).
 * Very permissive — matches common UUID hex patterns.
 * @param {any} v
 * @returns {boolean}
 */
function looksLikeUuid(v) {
  if (typeof v !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

/**
 * @description Compute a SHA256 hex hash for dedupe checks.
 * Uses Node built-in crypto if available, otherwise falls back to null.
 * @param {string} str
 * @returns {string|null}
 */
function sha256Hex(str) {
  try {
    // Node.js crypto
    // eslint-disable-next-line global-require
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
  } catch (e) {
    return null;
  }
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
 * @description Build an upsert plan for a row's items:
 *  - ensure each item has a source_id (derived from email / uuid id / legacy)
 *  - strip non-UUID id fields to avoid invalid UUID errors
 * @param {any[]} items
 * @returns {{plannedRows:any[], warnings:string[]}}
 */
function buildUpsertPlan(items) {
  const plannedRows = [];
  const warnings = [];

  for (const it of items) {
    const clone = Object.assign({}, it);
    let source_id = null;

    if (clone.source_id) {
      source_id = String(clone.source_id);
    } else if (clone.email) {
      source_id = `email:${String(clone.email).toLowerCase()}`;
    } else if (clone.id && looksLikeUuid(clone.id)) {
      source_id = `id:${clone.id}`;
    } else if (clone.id !== undefined && clone.id !== null) {
      // Legacy non-UUID identifier: preserve as legacy source key to avoid forcing it into id.
      source_id = `legacy:${String(clone.id)}`;
    } else {
      // Last resort: generate a time-based source id (not ideal but deterministic for this run)
      source_id = `generated:${Date.now()}:${Math.floor(Math.random() * 100000)}`;
    }

    // Avoid sending a non-UUID into id column: remove id unless it's UUID
    if (!looksLikeUuid(clone.id)) {
      if (clone.id !== undefined) {
        delete clone.id;
        warnings.push(`Stripped non-UUID id for source_id=${source_id}`);
      }
    }

    // Ensure source_id present on the object
    clone.source_id = source_id;

    plannedRows.push(clone);
  }

  return { plannedRows, warnings };
}

/**
 * @description Async handler for the Netlify function.
 * - GET -> health check (version 3)
 * - OPTIONS -> returns CORS headers
 * - POST -> normalize, plan, (dry-run) or upsert/fallback insert
 *
 * @param {import('aws-lambda').APIGatewayEvent} event
 * @param {any} context
 */
exports.handler = async function (event, context) {
  try {
    const headers = (event && (event.headers || {})) || {};
    const qp = (event && (event.queryStringParameters || {})) || {};

    // Accept multiple header casings
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

    // Build exact requestBody we'd send to Supabase/PostgREST
    const requestBody = JSON.stringify(normalizedRows);

    // Build a high level "plan" for dry-run: per collection plannedRows
    const plan = [];
    const allWarnings = [];
    for (const row of normalizedRows) {
      const items = Array.isArray(row.payload.items) ? row.payload.items : [row.payload];
      const { plannedRows, warnings } = buildUpsertPlan(items);
      plan.push({ collection: row.collection_name, plannedRows });
      if (warnings && warnings.length) allWarnings.push(...warnings);
    }

    // Dry-run: return normalized rows and request body with plan
    if (dryRun) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: true,
          dryRun: true,
          normalizedRows,
          requestBody,
          plan,
          warnings: allWarnings,
          note: 'DEBUG MODE: This function will NOT insert to Supabase. Deploy production version to perform inserts.'
        })
      };
    }

    // Production path: perform REST upserts/inserts into Supabase
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const MIGRATION_TABLE = process.env.MIGRATION_TABLE || 'migration_items';

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          ok: false,
          error: 'Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY'
        })
      };
    }

    const fetchFn = (typeof fetch === 'function' ? fetch : (globalThis && globalThis.fetch));
    if (!fetchFn) {
      return {
        statusCode: 500,
        body: JSON.stringify({ ok: false, error: 'Fetch is not available in this runtime' })
      };
    }

    const results = {
      upserted: [],
      fallbackInserted: [],
      skippedFallback: [],
      errors: []
    };

    // Iterate rows attempting upserts
    for (const row of normalizedRows) {
      const collection = String(row.collection_name || '').trim();
      const items = Array.isArray(row.payload.items) ? row.payload.items : [row.payload];
      const { plannedRows } = buildUpsertPlan(items);

      if (!collection) {
        results.errors.push({ collection, status: 400, body: { message: 'Empty collection name' } });
        continue;
      }

      // Attempt upsert into target collection using source_id as on_conflict key
      try {
        const targetUrl = `${stripTrailingSlash(SUPABASE_URL)}/rest/v1/${encodeURIComponent(collection)}?on_conflict=source_id`;
        // Prefer header: resolution=merge-duplicates to instruct PostgREST to merge
        const upsertResp = await fetchFn(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Prefer: 'resolution=merge-duplicates,return=representation'
          },
          body: JSON.stringify(plannedRows)
        });

        const text = await upsertResp.text();
        let parsedResp;
        try {
          parsedResp = text ? JSON.parse(text) : text;
        } catch (e) {
          parsedResp = text;
        }

        if (upsertResp.ok) {
          results.upserted.push({ collection, count: Array.isArray(parsedResp) ? parsedResp.length : 1, rows: parsedResp });
          continue;
        } else {
          // Upsert failed - capture error and fall back
          results.errors.push({ collection, status: upsertResp.status, body: parsedResp });
        }
      } catch (err) {
        results.errors.push({ collection, status: 500, body: String(err && err.message ? err.message : err) });
      }

      // Fallback path: insert into migration_items (dedupe by replay_hash)
      try {
        const replayHash = sha256Hex(JSON.stringify(row.payload)) || null;

        // If we computed a hash, check if migration_items already has a row with same collection + replay_hash
        if (replayHash) {
          const query = `${stripTrailingSlash(SUPABASE_URL)}/rest/v1/${encodeURIComponent(MIGRATION_TABLE)}?select=id&collection_name=eq.${encodeURIComponent(collection)}&metadata->>replay_hash=eq.${encodeURIComponent(replayHash)}&limit=1`;
          const dupCheckResp = await fetchFn(query, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              apikey: SUPABASE_SERVICE_ROLE_KEY
            }
          });
          const dupText = await dupCheckResp.text();
          let dupJson;
          try {
            dupJson = dupText ? JSON.parse(dupText) : dupText;
          } catch (e) {
            dupJson = dupText;
          }

          if (Array.isArray(dupJson) && dupJson.length > 0) {
            results.skippedFallback.push({ collection, reason: 'duplicate_replay_hash', existing: dupJson[0] });
            continue; // skip insertion
          }
        }

        // Insert a canonical row into migration_items with metadata.replay_hash
        const insertUrl = `${stripTrailingSlash(SUPABASE_URL)}/rest/v1/${encodeURIComponent(MIGRATION_TABLE)}`;
        const insertBody = [{
          collection_name: collection,
          payload: row.payload,
          metadata: Object.assign({}, row.metadata || {}, replayHash ? { replay_hash: replayHash } : {})
        }];
        const insertResp = await fetchFn(insertUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Prefer: 'return=representation'
          },
          body: JSON.stringify(insertBody)
        });

        const insertText = await insertResp.text();
        let insertJson;
        try {
          insertJson = insertText ? JSON.parse(insertText) : insertText;
        } catch (e) {
          insertJson = insertText;
        }

        if (insertResp.ok) {
          results.fallbackInserted.push({ collection, migrationResponse: insertJson });
        } else {
          results.errors.push({ collection, status: insertResp.status, body: insertJson });
        }
      } catch (err) {
        results.errors.push({ collection, status: 500, body: String(err && err.message ? err.message : err) });
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        inserted: (results.upserted.reduce((s, r) => s + (r.count || 0), 0) + results.fallbackInserted.length),
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