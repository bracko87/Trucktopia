/**
 * scripts/migrate-local-users.ts
 *
 * Migration helper: import localStorage exported users into Supabase Authentication
 *
 * Usage (locally):
 *   1. Ensure environment variables are set:
 *      - SUPABASE_URL (your Supabase project URL, e.g. https://xyz.supabase.co)
 *      - SUPABASE_SERVICE_ROLE (the service_role key - keep it secret, do NOT expose to client)
 *   2. Place the export from the app (the JSON produced by the Migration Helper page) somewhere, e.g. ./tm_local_export.json
 *   3. Run:
 *      - npx ts-node scripts/migrate-local-users.ts ./tm_local_export.json
 *      or compile to JS with tsc and run node.
 *
 * Behavior:
 * - Looks for the 'tm_local_users' key in the exported JSON. Falls back to heuristics (scans for arrays with {email,password}).
 * - For every local user it attempts to create a Supabase Auth user using the admin API (service_role).
 * - If password is present it will be used (local adapter stores plain-text passwords); we mark email_confirm true by default.
 * - For created users the script can optionally insert one row into public.app_users for verification (this is small and safe).
 *
 * Security:
 * - This script MUST run server-side with SUPABASE_SERVICE_ROLE. Do NOT run this in the browser.
 */

/**
 * @file File-level: migration script to import local users into Supabase Auth using the admin key.
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

/**
 * @description Minimal shape of local users created by the LocalStorageAdapter.
 */
interface LocalUser {
  id?: string;
  email: string;
  password?: string;
  metadata?: Record<string, any>;
}

/**
 * @description Read and parse a JSON file from disk.
 * @param filePath Relative or absolute path to the JSON file.
 */
async function readJsonFile(filePath: string): Promise<any> {
  const absolute = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  const raw = await fs.promises.readFile(absolute, 'utf-8');
  return JSON.parse(raw);
}

/**
 * @description Detect an array of local users inside an exported payload.
 * Looks explicitly for key 'tm_local_users' then falls back to scanning values for an array of objects containing email keys.
 * @param payload Parsed JSON payload produced by the app export.
 */
function extractLocalUsers(payload: any): LocalUser[] {
  // Common key used by LocalStorageAdapter
  if (Array.isArray(payload?.tm_local_users)) {
    return payload.tm_local_users;
  }

  // Some exports may contain nested objects, search for the first array that looks like users
  const values = Object.values(payload ?? {});
  for (const v of values) {
    if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object' && 'email' in v[0]) {
      return v as LocalUser[];
    }
  }

  // If the root is an array
  if (Array.isArray(payload) && payload.length > 0 && typeof payload[0] === 'object' && 'email' in payload[0]) {
    return payload as LocalUser[];
  }

  return [];
}

/**
 * @description Create or skip a user in Supabase Auth using the admin API.
 * @param supabase Supabase admin client (created with service_role)
 * @param localUser Local user object that should contain email and password
 */
async function migrateUser(supabase: ReturnType<typeof createClient>, localUser: LocalUser) {
  // Prepare payload for admin.createUser
  const payload: any = {
    email: localUser.email,
    password: localUser.password ?? undefined,
    email_confirm: true,
    user_metadata: localUser.metadata ?? {}
  };

  // If there's no password, we still create the user but leave password undefined,
  // so admin API will create the user without a password (depending on Supabase behavior)
  // and you might need to send a password reset link afterwards.
  try {
    const res = await supabase.auth.admin.createUser(payload);

    if (res.error) {
      // Some errors are expected (e.g. user exists). In newer supabase-js versions errors are thrown rather than returned,
      // but we guard for both cases.
      throw res.error;
    }

    // res.data holds created user details
    console.log(`✅ Created user ${localUser.email} -> id=${res.data.user?.id ?? 'unknown'}`);

    // Optionally insert a small row in public.app_users for quick visibility (table created by src/supabase/initial_schema.sql)
    try {
      await supabase.from('app_users').insert({ name: localUser.email }).throwOnError();
      console.log(`   -> inserted app_users row for ${localUser.email}`);
    } catch (err) {
      // Non-critical; just warn.
      console.warn(`   -> app_users insert failed (likely table missing or permission): ${String(err)}`);
    }

    return { email: localUser.email, status: 'created', id: res.data.user?.id ?? null };
  } catch (err: any) {
    // Handle duplicate user errors gracefully
    const errMsg = err?.message ?? JSON.stringify(err);
    if (errMsg.toLowerCase().includes('already') || errMsg.toLowerCase().includes('duplicate')) {
      console.log(`⚠️  Skipped ${localUser.email} (already exists)`);
      return { email: localUser.email, status: 'exists' };
    }
    console.error(`❌ Failed creating ${localUser.email}: ${errMsg}`);
    return { email: localUser.email, status: 'error', error: errMsg };
  }
}

/**
 * @description Main migration flow
 * @param filePath Path to exported JSON file
 */
async function main(filePath: string) {
  // Validate env
  const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.SUPABASE_PUBLIC_URL;
  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    console.error('Missing environment variables. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE.');
    process.exit(1);
  }

  // Create admin client with service_role key
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: {
      // Make sure we're using admin usage; nothing special here but explicit for clarity
    }
  });

  console.log('Reading export file:', filePath);
  const payload = await readJsonFile(filePath);
  const localUsers = extractLocalUsers(payload);

  if (!localUsers || localUsers.length === 0) {
    console.error('No local users detected in the provided file. Looked for tm_local_users or arrays with {email}.');
    process.exit(1);
  }

  console.log(`Found ${localUsers.length} local users. Beginning migration...`);
  const results = [];

  // Optionally: process sequentially to reduce rate-limits; can be parallel but sequential is safer
  for (const u of localUsers) {
    // Basic validation
    if (!u.email) {
      console.warn('Skipping user with missing email:', u);
      results.push({ email: null, status: 'skipped', reason: 'missing email' });
      continue;
    }
    const res = await migrateUser(supabase, u);
    results.push(res);
  }

  const summary = {
    total: localUsers.length,
    created: results.filter(r => r.status === 'created').length,
    existed: results.filter(r => r.status === 'exists').length,
    errors: results.filter(r => r.status === 'error')
  };

  console.log('Migration finished. Summary:');
  console.table(summary as any);

  const outPath = path.resolve(process.cwd(), `migration-result-${Date.now()}.json`);
  await fs.promises.writeFile(outPath, JSON.stringify({ results, summary }, null, 2), 'utf-8');
  console.log('Full result saved to:', outPath);
}

/**
 * Execute when script is invoked directly.
 * Accepts file path as first argument, defaults to ./tm_local_export.json
 */
if (require.main === module) {
  const arg = process.argv[2] ?? './tm_local_export.json';
  main(arg).catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}