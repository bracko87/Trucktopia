/**
 * scripts/export-supabase-to-migration-payload.js
 *
 * Export users from a Supabase project (Admin API) and produce a migration-payload JSON
 * compatible with the repository's migration helpers.
 *
 * Produces:
 *   scripts/migration-payload-users.json
 *
 * Usage:
 *   # PowerShell (Windows)
 *   $env:SUPABASE_URL = "https://your-project.supabase.co"
 *   $env:SUPABASE_SERVICE_ROLE_KEY = "sb_secret_..."
 *   node ./scripts/export-supabase-to-migration-payload.js
 *
 *   # macOS / Linux
 *   SUPABASE_URL="https://your-project.supabase.co" SUPABASE_SERVICE_ROLE_KEY="sb_secret_..." node ./scripts/export-supabase-to-migration-payload.js
 *
 * Notes:
 * - This script requires Node runtime with global fetch (Node 18+). It uses the Admin users endpoint.
 * - The exported file intentionally leaves password blank (migration script will generate temporary passwords).
 */

const fs = require('fs');
const path = require('path');

/**
 * readEnv
 * @description Read required env vars (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) and return them.
 * @returns {{baseUrl:string, serviceKey:string}}
 */
function readEnv() {
  const baseUrl = process.env.SUPABASE_URL || process.env.SUPABASE_BASE_URL || null;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || null;
  if (!baseUrl || !serviceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
    console.error('Set them and re-run. Example (PowerShell):');
    console.error('$env:SUPABASE_URL = "https://your-project.supabase.co"');
    console.error('$env:SUPABASE_SERVICE_ROLE_KEY = "sb_secret_..."');
    process.exit(2);
  }
  // Normalize: remove trailing slash if present
  return { baseUrl: String(baseUrl).replace(/\/$/, ''), serviceKey: String(serviceKey) };
}

/**
 * fetchUsersPage
 * @description Fetch one page of users from Supabase Admin API
 * @param {string} baseUrl
 * @param {string} serviceKey
 * @param {number} page
 * @param {number} perPage
 * @returns {Promise<Array>}
 */
async function fetchUsersPage(baseUrl, serviceKey, page = 1, perPage = 100) {
  const url = `${baseUrl}/auth/v1/admin/users?per_page=${perPage}&page=${page}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      'Content-Type': 'application/json'
    }
  });
  if (!res.ok) {
    const text = await res.text().catch(() => null);
    throw new Error(`Failed to fetch users (status ${res.status}) - ${text}`);
  }
  const body = await res.json().catch(() => null);
  return Array.isArray(body) ? body : [];
}

/**
 * sanitizeUserForPayload
 * @description Convert a Supabase user object into the simple shape expected by migration helpers
 * @param {object} u
 * @returns {{id:string,email:string,password:string,name:string,createdAt:string}}
 */
function sanitizeUserForPayload(u) {
  return {
    id: u.id || null,
    email: u.email || (u.user_metadata && u.user_metadata.email) || '',
    // We cannot export passwords; leave empty. Migration script will generate temporary passwords.
    password: '',
    name: (u.user_metadata && (u.user_metadata.name || u.user_metadata.fullName)) || u.email || '',
    createdAt: u.created_at || new Date().toISOString()
  };
}

/**
 * main
 * @description Fetch all users and write the migration payload file
 */
(async function main() {
  try {
    const { baseUrl, serviceKey } = readEnv();
    console.log('[export] Supabase base:', baseUrl);

    // Ensure global fetch exists
    if (typeof fetch !== 'function') {
      console.error('global fetch is not available in this Node runtime. Use Node 18+ or run via an environment that supports fetch.');
      process.exit(3);
    }

    const perPage = 100;
    let page = 1;
    const allUsers = [];

    while (true) {
      console.log(`[export] Fetching page ${page} ...`);
      const users = await fetchUsersPage(baseUrl, serviceKey, page, perPage);
      if (!Array.isArray(users) || users.length === 0) break;
      allUsers.push(...users);
      if (users.length < perPage) break;
      page += 1;
    }

    console.log(`[export] Fetched ${allUsers.length} user(s)`);

    const payload = {
      metadata: {
        requestedBy: process.env.USER || process.env.USERNAME || 'export-script',
        exportedAt: new Date().toISOString(),
        source: baseUrl
      },
      collections: {
        users: allUsers.map(sanitizeUserForPayload)
      }
    };

    const outPath = path.resolve(process.cwd(), 'scripts', 'migration-payload-users.json');
    fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`[export] Wrote migration payload to ${outPath}`);
  } catch (err) {
    console.error('[export] Fatal:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();