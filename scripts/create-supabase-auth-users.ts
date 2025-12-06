/**
 * scripts/create-supabase-auth-users.ts
 *
 * Create Supabase Auth users for migrated public.users rows and map the created
 * auth user ids back into public.users.auth_user_id.
 *
 * Usage (Node 18+):
 *   SUPABASE_URL=https://your-project.supabase.co SUPABASE_SERVICE_ROLE_KEY=your_service_role_key \
 *     npx tsx scripts/create-supabase-auth-users.ts [--dry-run] [--limit=10] [--delay=300]
 *
 * Notes:
 * - Do NOT paste your service role key into chat. Run this locally where the key is available.
 * - The script is conservative: it only operates on public.users rows where auth_user_id IS NULL
 *   and email is present.
 * - A mapping file is written to exports/migrated-auth-mapping-<ts>.json for auditing.
 */

/**
 * Import dependencies
 */
import fs from 'fs/promises';
import path from 'path';
import process from 'process';
import crypto from 'crypto';

/**
 * CommandLineOptions
 * @description Parsed runtime options for the script
 */
interface CommandLineOptions {
  dryRun: boolean;
  limit: number | null;
  delayMs: number;
}

/**
 * MigratedUserRow
 * @description Shape of a row in public.users we expect to operate on
 */
interface MigratedUserRow {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, any> | null;
  auth_user_id?: string | null;
  [key: string]: any;
}

/**
 * AuthCreateResult
 * @description Result object returned when creating an auth user
 */
interface AuthCreateResult {
  id?: string;
  email?: string;
  error?: string | null;
  rawResponse?: any;
}

/**
 * parseArgs
 * @description Parse simple CLI args (--dry-run, --limit=, --delay=)
 */
function parseArgs(): CommandLineOptions {
  const argv = process.argv.slice(2);
  const out: CommandLineOptions = { dryRun: false, limit: null, delayMs: 300 };

  for (const a of argv) {
    if (a === '--dry-run') out.dryRun = true;
    else if (a.startsWith('--limit=')) out.limit = Math.max(1, Number(a.split('=')[1]) || 1);
    else if (a.startsWith('--delay=')) out.delayMs = Math.max(0, Number(a.split('=')[1]) || 300);
  }

  return out;
}

/**
 * ensureEnv
 * @description Ensure required environment variables are present
 */
function ensureEnv() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
    console.error('Example (bash):');
    console.error('  SUPABASE_URL=https://your-project.supabase.co SUPABASE_SERVICE_ROLE_KEY=your_key \\');
    console.error('    npx tsx scripts/create-supabase-auth-users.ts --limit=10');
    process.exit(2);
  }
  return { SUPABASE_URL: SUPABASE_URL.replace(/\/+$/, ''), SUPABASE_SERVICE_ROLE_KEY };
}

/**
 * sleep
 * @description Async delay helper
 * @param ms milliseconds
 */
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * genTempPassword
 * @description Generate a reasonably strong temporary password
 * @returns string
 */
function genTempPassword(): string {
  const buf = crypto.randomBytes(16);
  return buf.toString('base64').replace(/[+/=]/g, 'A') + '1a!';
}

/**
 * fetchMigratedUsersToProcess
 * @description Fetch rows from public.users via Supabase REST where auth_user_id IS NULL and email is not null.
 * @param baseUrl string
 * @param key string
 * @param limit number | null
 */
async function fetchMigratedUsersToProcess(baseUrl: string, key: string, limit: number | null): Promise<MigratedUserRow[]> {
  const qParts = ['auth_user_id=is.null', "email=not.is.null"];
  const q = qParts.join('&') + (limit ? `&limit=${limit}` : '');
  const url = `${baseUrl}/rest/v1/users?select=id,email,user_metadata,auth_user_id&${q}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`
    }
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Failed to fetch users: ${res.status} ${res.statusText} - ${txt}`);
  }

  const arr = await res.json();
  if (!Array.isArray(arr)) throw new Error('Unexpected response when fetching users (expected array).');
  return arr as MigratedUserRow[];
}

/**
 * createAuthUser
 * @description Create an auth user using Supabase Admin API. Returns created id or error.
 * @param baseUrl string
 * @param key string
 * @param email string
 * @param password string
 * @param metadata object
 */
async function createAuthUser(baseUrl: string, key: string, email: string, password: string, metadata: any): Promise<AuthCreateResult> {
  const url = `${baseUrl}/auth/v1/admin/users`;
  const body = {
    email,
    password,
    email_confirm: true,
    user_metadata: metadata
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify(body)
  });

  const text = await res.text();
  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  if (!res.ok) {
    const errMsg = (parsed && (parsed.message || parsed.error_description || parsed.error)) || text || `${res.status} ${res.statusText}`;
    return { error: String(errMsg), rawResponse: parsed };
  }

  return { id: parsed?.id, email: parsed?.email, rawResponse: parsed };
}

/**
 * updateUserAuthId
 * @description Update public.users row setting auth_user_id for given row id.
 * @param baseUrl string
 * @param key string
 * @param rowId string (public.users.id)
 * @param authId string (auth user id uuid)
 */
async function updateUserAuthId(baseUrl: string, key: string, rowId: string, authId: string): Promise<void> {
  const url = `${baseUrl}/rest/v1/users?id=eq.${encodeURIComponent(rowId)}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: 'return=representation'
    },
    body: JSON.stringify({ auth_user_id: authId })
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Failed to update public.users row ${rowId}: ${res.status} ${res.statusText} - ${txt}`);
  }
}

/**
 * main
 * @description Script entry point
 */
async function main() {
  const opts = parseArgs();
  const env = ensureEnv();
  const outDir = path.resolve(process.cwd(), 'exports');
  await fs.mkdir(outDir, { recursive: true });

  console.log('[start] Options:', opts);
  console.log('[start] Supabase URL:', env.SUPABASE_URL);

  const mapping: Array<any> = [];

  try {
    const users = await fetchMigratedUsersToProcess(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, opts.limit);
    console.log(`[info] Found ${users.length} user(s) to process.`);

    for (const u of users) {
      if (!u.email || typeof u.email !== 'string' || u.email.trim() === '') {
        console.warn(`[skip] Row ${u.id} has no email. Skipping.`);
        mapping.push({ rowId: u.id, email: null, status: 'skipped_no_email' });
        continue;
      }

      const meta = {
        migrated: true,
        migrated_row_id: u.id
      };

      const tempPassword = genTempPassword();

      console.log(`[create] ${u.email} (row ${u.id})`);
      if (opts.dryRun) {
        console.log(`[dry-run] Would create auth user for ${u.email} with temp password: ${tempPassword}`);
        mapping.push({ rowId: u.id, email: u.email, tempPassword, status: 'dry-run' });
        continue;
      }

      let result: AuthCreateResult;
      try {
        result = await createAuthUser(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, u.email, tempPassword, meta);
      } catch (err: any) {
        console.error(`[error] createAuthUser failed for ${u.email}:`, err.message || err);
        mapping.push({ rowId: u.id, email: u.email, error: err.message || String(err), status: 'create_failed' });
        await sleep(opts.delayMs);
        continue;
      }

      if (result.error || !result.id) {
        console.error(`[error] Supabase admin returned error for ${u.email}:`, result.error || result.rawResponse);
        mapping.push({ rowId: u.id, email: u.email, error: result.error ?? result.rawResponse, status: 'create_failed' });
        await sleep(opts.delayMs);
        continue;
      }

      try {
        await updateUserAuthId(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, u.id, result.id as string);
        console.log(`[ok] Created auth user ${result.id} for ${u.email} and mapped to row ${u.id}`);
        mapping.push({ rowId: u.id, email: u.email, authUserId: result.id, tempPassword, status: 'created' });
      } catch (err: any) {
        console.error(`[error] Failed to update public.users for ${u.email}:`, err.message || err);
        mapping.push({ rowId: u.id, email: u.email, authUserId: result.id, error: err.message || String(err), status: 'update_failed' });
      }

      await sleep(opts.delayMs);
    }

    const outPath = path.join(outDir, `migrated-auth-mapping-${Date.now()}.json`);
    await fs.writeFile(outPath, JSON.stringify(mapping, null, 2), 'utf8');
    console.log(`[done] Mapping written to ${outPath}`);
  } catch (err: any) {
    console.error('[fatal] Unexpected error:', err.message || err);
    const outPath = path.join(outDir, `migrated-auth-mapping-error-${Date.now()}.json`);
    await fs.writeFile(outPath, JSON.stringify({ error: String(err) }, null, 2), 'utf8').catch(() => {});
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[fatal] Unhandled exception:', err);
  process.exit(1);
});