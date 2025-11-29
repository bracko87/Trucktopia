/**
 * scripts/local-migrate-runner.js
 *
 * Local migration runner:
 * - Reads a migration payload JSON (default: scripts/migration-payload.json)
 * - Normalizes the payload into rows: { collection_key, collection_name, data, metadata }
 * - Supports dry-run preview, chunked inserts and optional upsert to Supabase REST.
 *
 * Usage:
 *   node scripts/local-migrate-runner.js [payloadPath] [--dry-run] [--upsert] [--batch-size=1]
 *
 * Notes:
 * - Requires Node 18+ for global fetch.
 * - When doing real inserts provide SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.
 */

/**
 * @description Parse CLI args into options
 * @returns {{payloadPath:string,dryRun:boolean,upsert:boolean,batchSize:number}}
 */
function parseArgs() {
  const argv = process.argv.slice(2);
  const out = {
    payloadPath: require('path').join(process.cwd(), 'scripts', 'migration-payload.json'),
    dryRun: false,
    upsert: false,
    batchSize: 1
  };

  argv.forEach(a => {
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--upsert') out.upsert = true;
    else if (a.startsWith('--batch-size=')) out.batchSize = Math.max(1, Number(a.split('=')[1]) || 1);
    else out.payloadPath = a;
  });

  return out;
}

const fs = require('fs');
const path = require('path');

/**
 * @description Read and parse JSON payload file
 * @param {string} p
 * @returns {any}
 */
function readPayload(p) {
  const resolved = path.resolve(p);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Payload file not found: ${resolved}`);
  }
  const raw = fs.readFileSync(resolved, 'utf8');
  return JSON.parse(raw);
}

/**
 * @description Ensure collection_name exists on a payload object
 * @param {any} payload
 * @returns {any}
 */
function ensureCollectionName(payload) {
  const out = { ...(payload || {}) };
  if (typeof out.collection_key === 'string' && (!out.collection_name || out.collection_name === null)) {
    out.collection_name = out.collection_key;
  }
  return out;
}

/**
 * @description Convert the top-level payload into rows to insert
 * Each collection becomes one row:
 * { collection_key, collection_name, data, metadata }
 * @param {any} payload
 * @returns {Array<object>}
 */
function buildRowsFromPayload(payload) {
  const rows = [];

  if (payload && typeof payload.collections === 'object' && !Array.isArray(payload.collections)) {
    const meta = payload.metadata || null;
    for (const [collectionKey, collectionData] of Object.entries(payload.collections)) {
      rows.push({
        collection_key: collectionKey,
        collection_name: collectionKey,
        data: collectionData,
        metadata: meta
      });
    }
  } else if (Array.isArray(payload)) {
    return payload;
  } else if (payload && (payload.collection_key || payload.collection_name)) {
    rows.push({
      collection_key: payload.collection_key || payload.collection_name,
      collection_name: payload.collection_name || payload.collection_key,
      data: payload.data ?? null,
      metadata: payload.metadata ?? null
    });
  }

  return rows;
}

/**
 * @description Chunk array into smaller arrays
 * @param {Array<any>} arr
 * @param {number} size
 * @returns {Array<Array<any>>}
 */
function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * @description Insert a batch of rows into Supabase table migrated_collections
 * @param {string} baseUrl
 * @param {string} serviceKey
 * @param {Array<any>} batch
 * @param {boolean} upsert
 */
async function insertBatchToSupabase(baseUrl, serviceKey, batch, upsert) {
  // Normalize base URL: remove trailing slash
  const normalizedBase = baseUrl.replace(/\/$/, '');
  const endpoint = `${normalizedBase}/rest/v1/migrated_collections`;
  const headers = {
    'Content-Type': 'application/json',
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    Prefer: 'return=representation'
  };

  if (upsert) {
    // Ask PostgREST to try merge-duplicates (upsert) when available
    headers.Prefer = 'return=representation,resolution=merge-duplicates';
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(batch)
  });

  const text = await res.text();
  let parsed;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }

  if (!res.ok) {
    const msg = parsed || text;
    const err = new Error(`Supabase insert failed: ${res.status} ${res.statusText} - ${JSON.stringify(msg)}`);
    err.responseBody = parsed;
    throw err;
  }

  return parsed;
}

/**
 * Main runner
 */
(async function main() {
  try {
    const { payloadPath, dryRun, upsert, batchSize } = parseArgs();
    const payload = readPayload(payloadPath);
    const normalizedPayload = ensureCollectionName(payload);
    const rows = buildRowsFromPayload(normalizedPayload);

    if (!rows || rows.length === 0) {
      console.error('No rows to migrate. Check the payload shape (expecting { collections: { ... } }).');
      process.exit(4);
    }

    const keys = rows.map(r => r.collection_key);
    const preview = {
      computedRowsCount: rows.length,
      keys,
      rowsPreview: rows.slice(0, 10)
    };

    if (dryRun) {
      console.log(JSON.stringify(preview, null, 2));
      process.exit(0);
    }

    // Real run: require Supabase credentials
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment. Set them and re-run.');
      process.exit(5);
    }

    const batches = chunkArray(rows, Math.max(1, batchSize));
    console.log(`Inserting ${rows.length} row(s) in ${batches.length} batch(es) (batch-size=${batchSize})`);
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`Inserting batch ${i + 1}/${batches.length} (${batch.length} row(s))...`);
      try {
        const res = await insertBatchToSupabase(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, batch, upsert);
        console.log(`Batch ${i + 1} OK. Inserted rows: ${Array.isArray(res) ? res.length : (res ? 1 : 0)}`);
      } catch (err) {
        console.error(`Batch ${i + 1} failed:`, err.message || err);
        if (err.responseBody) console.error('Response body:', JSON.stringify(err.responseBody, null, 2));
        process.exit(6);
      }
    }

    console.log('Done. All batches processed.');
    process.exit(0);
  } catch (err) {
    console.error('Fatal error:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();