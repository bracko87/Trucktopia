/**
 * scripts/migrate-local-users-to-supabase.mjs
 *
 * Small Node migration utility to import exported local-app users into Supabase Auth
 * using the Supabase "admin" REST endpoint. This script is intended to be run locally
 * by a developer/administrator. It requires the Supabase service_role key.
 *
 * Usage:
 * 1. Export your local users to a JSON file named exported-local-users.json at project root.
 *    See README details or run the browser snippet described in the project notes.
 * 2. Set environment variables:
 *      SUPABASE_URL=https://your-project-ref.supabase.co
 *      SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
 * 3. Run:
 *      node scripts/migrate-local-users-to-supabase.mjs
 *
 * Important security note:
 * - The service_role key is powerful: keep it secret and run this script only in trusted environments.
 */

/**
 * @fileoverview Migration script that reads exported-local-users.json and creates users in Supabase Auth.
 */

import fs from 'fs/promises';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

/**
 * Resolve project root and file paths.
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

/**
 * Helper: read exported users JSON from repo root.
 * @returns {Promise<Array<{email:string,password?:string,username?:string}>>}
 */
async function readExportedUsers() {
  const filePath = path.join(ROOT, 'exported-local-users.json');
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) throw new Error('exported-local-users.json must be an array');
    return arr;
  } catch (err) {
    throw new Error(`Failed to read exported-local-users.json: ${err.message}`);
  }
}

/**
 * Helper: create a user in Supabase via admin endpoint.
 * Uses POST ${SUPABASE_URL}/auth/v1/admin/users
 *
 * @param {{email:string,password:string,username?:string}} user
 * @param {string} url
 * @param {string} serviceKey
 * @returns {Promise<{ok:boolean,status:number,json:any}>}
 */
async function createSupabaseUser(user, url, serviceKey) {
  const endpoint = `${url.replace(/\/$/, '')}/auth/v1/admin/users`;
  const body = {
    email: user.email,
    password: user.password,
    email_confirm: true,
    // store username in user_metadata if present
    user_metadata: user.username ? { username: user.username } : undefined
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Both Authorization and apikey header help depending on Supabase configuration
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey
    },
    body: JSON.stringify(body)
  });

  const json = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, json };
}

/**
 * Optional helper: create user with a random password if password missing.
 * NOTE: this will send no email to user automatically; you must notify them to reset their password.
 */
function randomPassword() {
  return Math.random().toString(36).slice(-10) + 'A1!';
}

/**
 * Main migration runner.
 */
async function run() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set as environment variables.');
    console.error('Example (bash):');
    console.error('  SUPABASE_URL=https://xyz.supabase.co SUPABASE_SERVICE_ROLE_KEY=ey... node scripts/migrate-local-users-to-supabase.mjs');
    process.exit(1);
  }

  let users;
  try {
    users = await readExportedUsers();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  if (users.length === 0) {
    console.error('No users found in exported-local-users.json');
    process.exit(1);
  }

  console.log(`Read ${users.length} users from exported-local-users.json`);
  console.log('IMPORTANT: This will create users in Supabase Auth. Press ENTER to continue or CTRL+C to abort.');
  await new Promise(resolve => process.stdin.once('data', () => resolve()));

  const results = [];
  for (const u of users) {
    const email = (u.email || '').toString().trim();
    if (!email) {
      console.warn('Skipping entry without email:', u);
      results.push({ email: null, ok: false, reason: 'missing-email' });
      continue;
    }

    let password = u.password ?? null;
    if (!password) {
      // Default behavior: skip users without cleartext passwords to avoid recreating unknown passwords.
      // If you want to create accounts with a random password instead, set createEvenIfNoPassword = true
      const createEvenIfNoPassword = false;
      if (!createEvenIfNoPassword) {
        console.warn(`Skipping ${email}: no plaintext password available. To create with random password, toggle setting in script.`);
        results.push({ email, ok: false, reason: 'no-password' });
        continue;
      }
      password = randomPassword();
      console.log(`Creating ${email} with random password (will be printed in results)`);
    }

    try {
      const resp = await createSupabaseUser({ email, password, username: u.username }, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      if (resp.ok) {
        console.log(`Created ${email} (status ${resp.status})`);
        results.push({ email, ok: true, status: resp.status, body: resp.json, passwordUsed: u.password ? null : password });
      } else {
        console.error(`Failed to create ${email}: status ${resp.status}`, resp.json);
        results.push({ email, ok: false, status: resp.status, body: resp.json });
      }
    } catch (err) {
      console.error(`Error creating ${email}:`, err.message || err);
      results.push({ email, ok: false, reason: err.message || err });
    }

    // Be polite to the Supabase endpoint
    await new Promise(r => setTimeout(r, 300));
  }

  // Write results to migration-result.json
  const outPath = path.join(ROOT, 'scripts', 'migration-result.json');
  try {
    await fs.mkdir(path.join(ROOT, 'scripts'), { recursive: true });
    await fs.writeFile(outPath, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`Wrote migration results to ${outPath}`);
  } catch (err) {
    console.error('Failed to write migration results file:', err.message || err);
  }

  // Summary
  const succeeded = results.filter(r => r.ok).length;
  const failed = results.length - succeeded;
  console.log(`Migration complete: ${succeeded} succeeded, ${failed} failed`);
  process.exit(0);
}

run().catch(err => {
  console.error('Unhandled error', err);
  process.exit(1);
});