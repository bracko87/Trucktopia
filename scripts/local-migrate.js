/**
 * scripts/local-migrate.js
 *
 * Runnable Node.js migration helper (CommonJS).
 *
 * Purpose:
 * - Read scripts/migration-payload.json (or provided path).
 * - If SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY set -> inserts rows into Supabase REST.
 * - Otherwise, if TARGET_FUNCTION_URL & ADMIN_TOKEN set -> POSTs payload to target function.
 *
 * Notes:
 * - Recommended: run with Node 18+ (global fetch available).
 * - Example:
 *    Windows PowerShell:
 *      $env:SUPABASE_URL="https://your-supabase-url.supabase.co"; $env:SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"; node scripts/local-migrate.js
 */

const fs = require('fs');
const path = require('path');

/**
 * @description Safe environment variable lookup
 * @param {string} key
 * @returns {string|undefined}
 */
function env(key) {
  const v = process.env[key];
  return v === undefined || v === '' ? undefined : v;
}

/**
 * @description Read JSON file synchronously
 * @param {string} p
 * @returns {any}
 */
function readPayloadSync(p) {
  const raw = fs.readFileSync(p, 'utf8');
  return JSON.parse(raw);
}

/**
 * @description Insert a single row into Supabase REST table
 * @param {string} supabaseUrl
 * @param {string} serviceKey
 * @param {string} table
 * @param {any} row
 */
async function insertSupabaseRow(supabaseUrl, serviceKey, table, row) {
  /**
 * scripts/local-migrate.js
 *
 * @fileoverview Small fix: ensure trailing-slash removal uses a valid regex.
 *
 * The original file used /\\/$/ which may be parsed incorrectly in some contexts
 * (and caused "Invalid regular expression flags"). Using /\/$/ matches a forward
 * slash at the end of the string and is the intended behaviour for trimming a
 * trailing slash from the Supabase URL.
 */

/** Build the REST endpoint for the given table by normalizing the base URL. */
const endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/${encodeURIComponent(table)}`;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${serviceKey}`,
    apikey: serviceKey,
    Prefer: 'return=representation'
  };

  const fetchFn = (global.fetch);
  if (!fetchFn) {
    throw new Error('Global fetch not available. Run with Node 18+.');
  }

  const res = await fetchFn(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(row)
  });

  const text = await res.text();
  let parsed;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }

  if (!res.ok) {
    throw new Error(`Supabase insert failed: ${res.status} ${res.statusText} - ${JSON.stringify(parsed)}`);
  }

  return parsed;
}

/**
 * @description Main runner
 */
(async function main() {
  try {
    const args = process.argv.slice(2);
    const payloadPath = args[0] || path.join(process.cwd(), 'scripts', 'migration-payload.json');
    const resolved = path.resolve(payloadPath);

    if (!fs.existsSync(resolved)) {
      console.error('Payload file not found at', resolved);
      process.exit(2);
    }

    console.log('Using payload file:', resolved);
    const payload = readPayloadSync(resolved);

    const SUPABASE_URL = env('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = env('SUPABASE_SERVICE_ROLE_KEY');
    const MIGRATION_TABLE = env('MIGRATION_TABLE') || 'migrated_collections';

    const TARGET_FUNCTION_URL = env('TARGET_FUNCTION_URL');
    const ADMIN_TOKEN = env('ADMIN_TOKEN');

    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      console.log('Detected Supabase credentials — inserting rows directly into Supabase.');
      const results = [];

      for (const [collectionKey, items] of Object.entries(payload.collections || {})) {
        const row = {
          collection_key: collectionKey,
          data: items,
          metadata: payload.metadata || {},
          migrated_by: (payload.metadata && payload.metadata.requestedBy) || null,
          status: 'migrated'
        };

        try {
          const r = await insertSupabaseRow(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MIGRATION_TABLE, row);
          results.push({ collection: collectionKey, success: true, details: r });
          console.log(`Inserted collection "${collectionKey}"`);
        } catch (err) {
          results.push({ collection: collectionKey, success: false, error: String(err && err.message ? err.message : err) });
          console.error(`Failed inserting "${collectionKey}":`, err && err.message ? err.message : err);
        }
      }

      console.log('Done. Results:', JSON.stringify(results, null, 2));
      process.exit(0);
    }

    if (TARGET_FUNCTION_URL && ADMIN_TOKEN) {
      console.log('No Supabase credentials found — posting whole payload to target function URL.');
      const fetchFn = (global.fetch);
      if (!fetchFn) throw new Error('Global fetch not available. Run with Node 18+.');

      const res = await fetchFn(TARGET_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ADMIN_TOKEN}`
        },
        body: JSON.stringify(payload)
      });

      const text = await res.text();
      let parsed;
      try { parsed = text ? JSON.parse(text) : text; } catch { parsed = text; }

      if (!res.ok) throw new Error(`Function POST failed: ${res.status} ${res.statusText} - ${JSON.stringify(parsed)}`);

      console.log('Function response:', JSON.stringify(parsed, null, 2));
      process.exit(0);
    }

    console.error('No destination configured. Please set either SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY OR TARGET_FUNCTION_URL & ADMIN_TOKEN as environment variables.');
    process.exit(3);
  } catch (err) {
    console.error('Migration failed with error:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();