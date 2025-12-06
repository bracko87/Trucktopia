/**
 * scripts/quick-verify.ts
 *
 * Quick verification tool for user migration.
 *
 * Purpose:
 * - Compare a "source" users export (local JSON) against a target (Supabase admin users or local JSON).
 * - Produce a compact report: counts, how many entries have password/hash-like fields, sample missing emails.
 *
 * Usage:
 *  - With explicit source:
 *      npx tsx scripts/quick-verify.ts path/to/source.json
 *
 *  - Auto-detecting migration-payload-full.json (convenience):
 *      npx tsx scripts/quick-verify.ts
 *    The script will try: ./migration-payload-full.json, ./exports/migration-payload-full.json, ./exports/source-users.json
 *
 *  - Provide a local target file:
 *      npx tsx scripts/quick-verify.ts ./migration-payload-full.json --target-file ./exports/target-users.json
 *
 *  - Query Supabase admin users (needs env):
 *      SUPABASE_URL=https://your.supabase.co SUPABASE_SERVICE_ROLE_KEY=service_role_key \
 *        npx tsx scripts/quick-verify.ts ./migration-payload-full.json
 *
 * Notes:
 * - This is a diagnostic tool only and performs non-destructive reads.
 * - The password/hash heuristic is conservative: it looks for keys containing 'password', 'pwd', 'hash', 'encrypted'.
 */

/**
 * File-level imports
 */
import fs from 'fs/promises';
import path from 'path';
import process from 'process';

/**
 * CommonUserShape
 * @description Minimal inferred shape for a user entry used for analysis
 */
interface CommonUserShape {
  id?: string;
  email?: string | null;
  [key: string]: any;
}

/**
 * readJsonFile
 * @description Read and parse a JSON file from disk.
 * @param fp string - file path
 * @returns Promise<any>
 */
async function readJsonFile(fp: string): Promise<any> {
  const resolved = path.resolve(fp);
  const raw = await fs.readFile(resolved, { encoding: 'utf-8' });
  return JSON.parse(raw);
}

/**
 * normalizeEmail
 * @description Safe normalizer for email-like values
 * @param v any
 * @returns string | null
 */
function normalizeEmail(v: any): string | null {
  if (!v) return null;
  const s = String(v).trim().toLowerCase();
  if (s === '' || s === 'null' || s === 'undefined') return null;
  return s;
}

/**
 * hasPasswordLikeField
 * @description Heuristic: checks whether an object contains a non-empty field
 * whose key suggests a password/hash (contains 'password' or 'hash' or 'pwd' or 'encrypted').
 * @param obj any
 * @returns boolean
 */
function hasPasswordLikeField(obj: Record<string, any>): boolean {
  if (!obj || typeof obj !== 'object') return false;
  const keys = Object.keys(obj);
  for (const k of keys) {
    const lk = k.toLowerCase();
    if (lk.includes('password') || lk.includes('pwd') || lk.includes('hash') || lk.includes('encrypted')) {
      const v = obj[k];
      if (v == null) continue;
      if (typeof v === 'string' && v.trim() !== '') return true;
      if (typeof v === 'object' && Object.keys(v).length > 0) return true;
    }
  }
  return false;
}

/**
 * fetchSupabaseUsers
 * @description Fetch users from Supabase Admin endpoint using service role key.
 * Uses pagination (limit/offset) and returns an array of user objects.
 * @param url string - SUPABASE_URL (e.g. https://xxxx.supabase.co)
 * @param key string - SUPABASE_SERVICE_ROLE_KEY
 * @param limit number - page size (default 1000)
 */
async function fetchSupabaseUsers(url: string, key: string, limit = 1000): Promise<any[]> {
  const out: any[] = [];
  let offset = 0;
  // ensure no trailing slash
  const base = url.replace(/\/+$/, '');
  const endpoint = `${base}/auth/v1/admin/users`;
  while (true) {
    const q = `?limit=${limit}&offset=${offset}`;
    const res = await fetch(endpoint + q, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Supabase request failed: ${res.status} ${res.statusText} ${text}`);
    }
    const arr = (await res.json()) as any[];
    if (!Array.isArray(arr)) break;
    out.push(...arr);
    if (arr.length < limit) break;
    offset += limit;
    if (offset > 20000) break;
  }
  return out;
}

/**
 * sample
 * @description Return up to n items from arr
 */
function sample<T>(arr: T[], n = 10): T[] {
  return arr.slice(0, n);
}

/**
 * findSourceFile
 * @description Convenience: try a small list of likely source paths when no arg provided.
 * @returns string | null
 */
async function findSourceFile(): Promise<string | null> {
  const candidates = [
    './migration-payload-full.json',
    './exports/migration-payload-full.json',
    './exports/source-users.json',
    './exports/users.json'
  ];
  for (const c of candidates) {
    try {
      await fs.access(path.resolve(c));
      return c;
    } catch {
      // ignore missing
    }
  }
  return null;
}

/**
 * main
 * @description Entry - parse args, detect source file when omitted, load source, load target (file or Supabase),
 * produce a compact report and exit.
 */
async function main() {
  const argv = process.argv.slice(2);

  // parse optional flags (--target-file)
  let targetFile: string | null = null;
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--target-file' && argv[i + 1]) {
      targetFile = argv[i + 1];
      i++;
      continue;
    }
    rest.push(a);
  }

  let sourcePath = rest[0] ?? '';
  if (!sourcePath) {
    const found = await findSourceFile();
    if (found) {
      sourcePath = found;
      console.log(`Auto-detected source file: ${sourcePath}`);
    } else {
      console.error('No source file provided and migration-payload-full.json not found. Pass source path as first arg.');
      process.exitCode = 2;
      return;
    }
  }

  // Load source JSON
  let sourceDataRaw: any;
  try {
    sourceDataRaw = await readJsonFile(sourcePath);
  } catch (err: any) {
    console.error(`Failed to read source file "${sourcePath}": ${err?.message ?? err}`);
    process.exitCode = 2;
    return;
  }

  // Normalize to array of users - try common shapes
  let sourceArr: CommonUserShape[] = [];
  if (Array.isArray(sourceDataRaw)) {
    sourceArr = sourceDataRaw;
  } else if (Array.isArray(sourceDataRaw.users)) {
    sourceArr = sourceDataRaw.users;
  } else if (Array.isArray(sourceDataRaw.auth?.users)) {
    sourceArr = sourceDataRaw.auth.users;
  } else {
    // Try to find a users-like array anywhere in the object (shallow)
    for (const k of Object.keys(sourceDataRaw)) {
      const v = (sourceDataRaw as any)[k];
      if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object' && ('email' in v[0] || 'id' in v[0])) {
        sourceArr = v;
        break;
      }
    }
  }

  if (!Array.isArray(sourceArr)) {
    console.error('Source JSON could not be interpreted as an array of users.');
    process.exitCode = 2;
    return;
  }

  // Determine target users either from file or Supabase
  let targetArr: CommonUserShape[] = [];
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    if (targetFile) {
      console.log(`Loading local target file: ${targetFile}`);
      const tf = await readJsonFile(targetFile);
      targetArr = Array.isArray(tf) ? tf : (Array.isArray(tf.users) ? tf.users : []);
    } else if (supabaseUrl && supabaseKey) {
      console.log('Fetching users from Supabase admin endpoint (this may take a few seconds)...');
      targetArr = await fetchSupabaseUsers(supabaseUrl, supabaseKey, 1000);
    } else {
      console.log('No target-file or SUPABASE_* env provided; target empty. The script will still report source diagnostics.');
      targetArr = [];
    }
  } catch (err: any) {
    console.error('Failed to load target users:', err?.message ?? err);
    process.exitCode = 2;
    return;
  }

  // Build maps by email (lowercased)
  const sourceByEmail = new Map<string, CommonUserShape>();
  let sourceEmailsCount = 0;
  let sourcePasswordLikeCount = 0;

  for (const u of sourceArr) {
    const e = normalizeEmail(u.email ?? u.email_address ?? u.mail ?? u.username ?? (u.identities ? u.identities[0]?.email : undefined));
    if (e) {
      sourceEmailsCount++;
      if (!sourceByEmail.has(e)) sourceByEmail.set(e, u);
    }
    if (hasPasswordLikeField(u)) sourcePasswordLikeCount++;
  }

  const targetByEmail = new Map<string, CommonUserShape>();
  let targetEmailsCount = 0;
  let targetPasswordLikeCount = 0;

  for (const u of targetArr) {
    const e = normalizeEmail(u.email ?? u.user_email ?? u.identities?.[0]?.email);
    if (e) {
      targetEmailsCount++;
      if (!targetByEmail.has(e)) targetByEmail.set(e, u);
    }
    if (hasPasswordLikeField(u)) targetPasswordLikeCount++;
  }

  // Compute missing emails (present in source but not in target)
  const missingEmails: string[] = [];
  for (const e of sourceByEmail.keys()) {
    if (!targetByEmail.has(e)) missingEmails.push(e);
  }

  // Compute extra emails (present in target but not in source)
  const extraEmails: string[] = [];
  for (const e of targetByEmail.keys()) {
    if (!sourceByEmail.has(e)) extraEmails.push(e);
  }

  // Print compact report
  console.log('--- Quick Verification Report ---');
  console.log(`Source users file: ${path.resolve(sourcePath)} (entries: ${sourceArr.length})`);
  if (targetFile) console.log(`Target file: ${path.resolve(targetFile)} (entries: ${targetArr.length})`);
  else if (supabaseUrl) console.log(`Supabase target: ${supabaseUrl} (fetched entries: ${targetArr.length})`);
  else console.log(`No target provided; only source analysis performed.`);
  console.log('');
  console.log(`Source emails present: ${sourceEmailsCount}`);
  console.log(`Target emails present: ${targetEmailsCount}`);
  console.log('');
  console.log(`Source entries with password/hash-like fields: ${sourcePasswordLikeCount}`);
  console.log(`Target entries with password/hash-like fields: ${targetPasswordLikeCount}`);
  console.log('');
  console.log(`Missing emails (in source, not in target): ${missingEmails.length}`);
  if (missingEmails.length > 0) {
    console.log('Sample missing emails (up to 20):');
    for (const e of sample(missingEmails, 20)) console.log(`  - ${e}`);
  }
  console.log('');
  console.log(`Extra emails (in target, not in source): ${extraEmails.length}`);
  if (extraEmails.length > 0) {
    console.log('Sample extra emails (up to 20):');
    for (const e of sample(extraEmails, 20)) console.log(`  - ${e}`);
  }
  console.log('');

  if (missingEmails.length === 0 && targetArr.length > 0) {
    console.log('✅ No missing emails detected between source and target (quick check).');
  } else if (missingEmails.length > 0 && targetArr.length > 0) {
    console.log('⚠️ Missing emails detected. Investigate mapping/deduplication logic and rerun verification after fixes.');
  }

  if (sourcePasswordLikeCount > 0 && targetPasswordLikeCount === 0) {
    console.log('ℹ️ Source contains password/hash-like fields but target does not. Mark migrated users for password reset.');
  }

  console.log('--- End report ---');
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exitCode = 1;
});