/**
 * scripts/import-migrated-collections.js
 *
 * Small safe importer for migrated_collections -> migration_items (unified table).
 *
 * Purpose:
 * - Fetch staged rows from migrated_collections (defaults to collection_name like 'tm_%').
 * - Insert their data into migration_items as jsonb rows.
 * - Support --dry-run to preview inserts without writing or marking rows imported.
 * - Accept credentials via env vars or CLI flags (--url, --key).
 *
 * Change note:
 * - This version preserves primitive-typed staged values (string/number/boolean)
 *   by wrapping them into an object { value: <original>, _type: '<type>' } so they
 *   are stored in migration_items instead of being skipped.
 *
 * Usage:
 *  node scripts/import-migrated-collections.js --dry-run --url "..." --key "..."
 *  or set env vars SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY and run without flags.
 */

/**
 * Parse CLI args (simple, no external dependency).
 * Recognised flags:
 *  --dry-run
 *  --only=<collection_name>
 *  --url=<supabase_url>
 *  --key=<service_role_key>
 */
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const onlyArg = args.find(a => a.startsWith('--only='));
const onlyCollection = onlyArg ? onlyArg.split('=')[1].replace(/^"|"$/g, '') : null;
const urlFlag = args.find(a => a.startsWith('--url='));
const keyFlag = args.find(a => a.startsWith('--key='));
const SUPABASE_URL = urlFlag ? urlFlag.split('=')[1].replace(/^"|"$/g, '') : process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = keyFlag ? keyFlag.split('=')[1].replace(/^"|"$/g, '') : process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Ensure we have the necessary credentials
 */
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: Missing Supabase credentials. Provide via env vars SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY or CLI flags --url and --key.');
  process.exit(2);
}

/**
 * Helper: normalize base URL (remove trailing slash)
 * @param {string} u
 * @returns {string}
 */
function normalizeBase(u) {
  return u.replace(/\/$/, '');
}

/**
 * @description Make a request to Supabase REST API.
 * @param {string} path - path after base URL (e.g. /rest/v1/table?... )
 * @param {object} options - fetch options
 */
async function supabaseFetch(path, options = {}) {
  const url = `${normalizeBase(SUPABASE_URL)}${path}`;
  const headers = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    ...(options.headers || {})
  };
  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let parsed;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
  if (!res.ok) {
    const msg = `Supabase REST error (${res.status} ${res.statusText}): ${JSON.stringify(parsed)}`;
    const err = new Error(msg);
    err.status = res.status;
    err.body = parsed;
    throw err;
  }
  return parsed;
}

/**
 * @description Fetch rows from migrated_collections for collection_name like 'tm_%'
 * If --only specified, fetch only that single collection row (exact match).
 */
async function fetchStagedRows() {
  let filter = `collection_name=like.tm_%25`; // like 'tm_%' ; % -> %25
  if (onlyCollection) {
    filter = `collection_name=eq.${encodeURIComponent(onlyCollection)}`;
  }
  const path = `/rest/v1/migrated_collections?select=id,collection_name,data,status,migrated_at&${filter}&limit=10000`;
  return await supabaseFetch(path, { method: 'GET' });
}

/**
 * Chunk an array into subarrays of given size.
 * @param {any[]} arr
 * @param {number} n
 * @returns {any[][]}
 */
function chunkArray(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) {
    out.push(arr.slice(i, i + n));
  }
  return out;
}

/**
 * @description Insert a batch of items into migration_items via Supabase REST.
 * @param {Array<{collection_name:string, migrated_collection_id: number|null, item: any}>} rowsToInsert
 */
async function insertBatch(rowsToInsert) {
  const path = `/rest/v1/migration_items`;
  const body = JSON.stringify(rowsToInsert);
  const headers = {
    'Content-Type': 'application/json',
    Prefer: 'return=representation'
  };
  return await supabaseFetch(path, { method: 'POST', body, headers });
}

/**
 * @description Mark migrated_collections row as imported by updating status and imported_at
 * @param {number} migratedId
 */
async function markRowImported(migratedId) {
  const path = `/rest/v1/migrated_collections?id=eq.${migratedId}`;
  const body = JSON.stringify({ status: 'imported', imported_at: new Date().toISOString() });
  const headers = {
    'Content-Type': 'application/json',
    Prefer: 'return=representation'
  };
  return await supabaseFetch(path, { method: 'PATCH', body, headers });
}

/**
 * @description Normalize staged data into an array of items ready for insertion.
 * Handles:
 *  - array => returns array items
 *  - object => returns [object]
 *  - primitive (string|number|boolean) => wraps into { value: <original>, _type: '<type>' }
 *  - null/undefined => returns []
 * @param {any} data
 * @returns {Array<any>}
 */
function normalizeStagedData(data) {
  if (data === null || data === undefined) return [];
  if (Array.isArray(data)) return data;
  const t = typeof data;
  if (t === 'object') return [data];
  if (t === 'string' || t === 'number' || t === 'boolean') {
    // Wrap primitive into an object so it is stored as jsonb without loss
    return [{ value: data, _type: t }];
  }
  // unsupported (symbol/function etc) => skip
  return [];
}

/**
 * Main runner
 */
(async function main() {
  try {
    console.log('Importer started');
    console.log(`Dry run: ${dryRun}`);
    if (onlyCollection) console.log(`Only: ${onlyCollection}`);

    const staged = await fetchStagedRows();
    if (!Array.isArray(staged) || staged.length === 0) {
      console.log('No staged tm_* rows found. Exiting.');
      return;
    }

    console.log(`Found ${staged.length} staged rows`);

    for (const row of staged) {
      const { id: migrated_collection_id = null, collection_name, data } = row;
      const type = (data === null) ? 'null' : (Array.isArray(data) ? 'array' : (typeof data === 'object' ? 'object' : typeof data));

      // Normalize data into items array; primitive types will be wrapped
      const items = normalizeStagedData(data);

      if (!items || items.length === 0) {
        console.warn(`Skipping collection ${collection_name} (unsupported or empty data type: ${type})`);
        continue;
      }

      console.log(`Processing collection "${collection_name}" — items: ${items.length}`);

      const toInsert = items.map(it => ({
        collection_name,
        migrated_collection_id,
        item: it
      }));

      const chunks = chunkArray(toInsert, 200);
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`  Inserting chunk ${i + 1}/${chunks.length} (${chunk.length} items)`);
        if (dryRun) {
          console.log('  [dry-run] sample item:', JSON.stringify(chunk[0].item).slice(0, 400));
        } else {
          try {
            await insertBatch(chunk);
            console.log('    Insert OK');
          } catch (err) {
            console.error('    Insert failed for chunk:', err && err.message ? err.message : err);
            console.error('    Aborting further chunks for this collection.');
            break;
          }
        }
      }

      if (!dryRun) {
        try {
          await markRowImported(migrated_collection_id);
          console.log(`  Marked migrated_collections id=${migrated_collection_id} as imported`);
        } catch (err) {
          console.error('  Failed to mark staging row as imported:', err && err.message ? err.message : err);
        }
      }
    }

    console.log('Importer finished');
  } catch (err) {
    console.error('Fatal error:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();