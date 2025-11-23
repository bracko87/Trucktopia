/**
 * scripts/local-migrate.ts
 *
 * Local TypeScript migration utility.
 *
 * Purpose:
 * - Read a migration payload JSON file (default: scripts/migration-payload.json).
 * - If SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided, insert each collection
 *   as a single row into a Supabase REST table (MIGRATION_TABLE, default: migrated_collections).
 * - Otherwise, can post the entire payload to TARGET_FUNCTION_URL with ADMIN_TOKEN.
 *
 * Notes:
 * - Designed for local use during migration. Requires Node 18+ for built-in fetch.
 * - If you use older Node, please run the compiled JS (scripts/local-migrate.js) with Node 18+
 *   or install a fetch polyfill.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

type MigrationPayload = {
  metadata?: Record<string, any>;
  collections: Record<string, any>;
};

/**
 * @description Safe environment variable lookup
 * @param key - env var name
 * @returns string | undefined
 */
function env(key: string): string | undefined {
  const v = process.env[key];
  return v === undefined || v === '' ? undefined : v;
}

/**
 * @description Read and parse migration payload JSON file
 * @param payloadPath - path to JSON file
 * @returns MigrationPayload
 */
async function readPayload(payloadPath: string): Promise<MigrationPayload> {
  const raw = await fs.readFile(payloadPath, { encoding: 'utf8' });
  return JSON.parse(raw);
}

/**
 * @description Insert a single row into Supabase REST table (one row per collection)
 * @param supabaseUrl - base Supabase URL (https://xyz.supabase.co)
 * @param serviceKey - Supabase service_role key
 * @param table - target table name
 * @param row - row payload
 * @returns parsed response from Supabase
 */
async function insertSupabaseRow(
  supabaseUrl: string,
  serviceKey: string,
  table: string,
  row: any
): Promise<any> {
  const endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/${encodeURIComponent(table)}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${serviceKey}`,
    apikey: serviceKey,
    Prefer: 'return=representation'
  };

  // Use global fetch (Node 18+) if available
  const fetchFn: typeof fetch = (global as any).fetch;
  if (!fetchFn) {
    throw new Error(
      'Global fetch is not available. Please run this script with Node 18+ or use the JS helper with node 18+. ' +
        'Alternatively install a fetch polyfill.'
    );
  }

  const res = await fetchFn(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(row)
  });

  const text = await res.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  if (!res.ok) {
    throw new Error(`Supabase insert failed: ${res.status} ${res.statusText} - ${JSON.stringify(parsed)}`);
  }

  return parsed;
}

/**
 * @description Main runner
 * - Priority: If SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY available -> use Supabase insert.
 * - Fallback: If TARGET_FUNCTION_URL & ADMIN_TOKEN available -> POST to function.
 * - Exits with code 0 on success, >=1 on error.
 */
async function main(): Promise<void> {
  try {
    const args = process.argv.slice(2);
    const payloadPath = args[0] || path.join(process.cwd(), 'scripts', 'migration-payload.json');

    // Resolve path and ensure file exists
    const resolved = path.resolve(payloadPath);
    await fs.access(resolved);

    console.log(`Using payload file: ${resolved}`);
    const payload = await readPayload(resolved);

    const SUPABASE_URL = env('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = env('SUPABASE_SERVICE_ROLE_KEY');
    const MIGRATION_TABLE = env('MIGRATION_TABLE') || 'migrated_collections';

    const TARGET_FUNCTION_URL = env('TARGET_FUNCTION_URL');
    const ADMIN_TOKEN = env('ADMIN_TOKEN');

    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      console.log('Detected Supabase credentials — inserting rows directly into Supabase.');
      const results: any[] = [];

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
        } catch (err: any) {
          results.push({ collection: collectionKey, success: false, error: String(err?.message || err) });
          console.error(`Failed inserting "${collectionKey}":`, err?.message || err);
        }
      }

      console.log('Done. Results:', JSON.stringify(results, null, 2));
      process.exit(0);
    }

    if (TARGET_FUNCTION_URL && ADMIN_TOKEN) {
      console.log('No Supabase credentials found — posting whole payload to target function URL.');
      // Use global fetch
      const fetchFn: typeof fetch = (global as any).fetch;
      if (!fetchFn) {
        throw new Error('Global fetch is not available. Please run this script with Node 18+.');
      }

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
      try {
        parsed = text ? JSON.parse(text) : text;
      } catch {
        parsed = text;
      }

      if (!res.ok) {
        throw new Error(`Function POST failed: ${res.status} ${res.statusText} - ${JSON.stringify(parsed)}`);
      }

      console.log('Function response:', JSON.stringify(parsed, null, 2));
      process.exit(0);
    }

    console.error('No destination configured. Please set either SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY OR TARGET_FUNCTION_URL & ADMIN_TOKEN as environment variables.');
    process.exit(3);
  } catch (err: any) {
    console.error('Migration failed with error:', err?.message || err);
    process.exit(1);
  }
}

main();