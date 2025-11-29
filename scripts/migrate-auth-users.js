/**
 * scripts/migrate-auth-users.js
 *
 * Local migration helper to create Supabase Auth users from a migration payload.
 *
 * Usage:
 *   # Dry-run (no network)
 *   node ./scripts/migrate-auth-users.js .\scripts\migration-payload.json --dry-run
 *
 *   # Real run (ensure env vars SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set)
 *   $env:SUPABASE_URL="https://your-project.supabase.co"
 *   $env:SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
 *   node ./scripts/migrate-auth-users.js .\scripts\migration-payload.json --batch-size=10
 *
 * Notes:
 * - Requires Node 18+ (global fetch).
 * - Service role key is powerful: never commit it. Run locally on a secure machine.
 * - This script creates accounts with generated temporary plaintext passwords (you must rotate/force reset).
 */

/**
 * @description Parse CLI args and return settings
 * @returns {{payloadPath:string,collectionKey:string,dryRun:boolean,batchSize:number,previewCount:number}}
 */
function parseArgs() {
  const argv = process.argv.slice(2);
  const out = {
    payloadPath: require('path').join(process.cwd(), 'scripts', 'migration-payload.json'),
    collectionKey: 'users',
    dryRun: false,
    batchSize: 5,
    previewCount: 10
  };

  argv.forEach(a => {
    if (a === '--dry-run') out.dryRun = true;
    else if (a.startsWith('--batch-size=')) out.batchSize = Math.max(1, Number(a.split('=')[1]) || 5);
    else if (a.startsWith('--collection=')) out.collectionKey = a.split('=')[1];
    else if (a.startsWith('--preview=')) out.previewCount = Math.max(1, Number(a.split('=')[1]) || 10);
    else out.payloadPath = a;
  });

  return out;
}

const fs = require('fs');
const path = require('path');

/**
 * @description Read and parse the migration payload file
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
 * @description Generate a compact, reasonably strong temporary password
 * @returns {string}
 */
function genTempPassword() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+';
  let pw = '';
  for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

/**
 * @description Create a Supabase Auth user via Admin endpoint
 * @param {string} baseUrl
 * @param {string} serviceKey
 * @param {{email:string,password:string,user_metadata?:object}} body
 * @returns {Promise<object>}
 */
async function createSupabaseUser(baseUrl, serviceKey, body) {
  const normalizedBase = baseUrl.replace(/\/$/, '');
  const endpoint = `${normalizedBase}/auth/v1/admin/users`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey
    },
    body: JSON.stringify(body)
  });

  const text = await res.text();
  let parsed;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }

  if (!res.ok) {
    const err = new Error(`Create user failed: ${res.status} ${res.statusText} - ${JSON.stringify(parsed)}`);
    err.responseBody = parsed;
    throw err;
  }

  return parsed;
}

/**
 * @description Main runner: reads users from payload and either previews or creates accounts
 */
(async function main() {
  try {
    const { payloadPath, collectionKey, dryRun, batchSize, previewCount } = parseArgs();
    const payload = readPayload(payloadPath);

    // Support both object.collections and top-level collection arrays
    let usersArray = null;
    if (payload && typeof payload.collections === 'object' && payload.collections[collectionKey]) {
      usersArray = payload.collections[collectionKey];
    } else if (payload && Array.isArray(payload)) {
      // If payload is top-level array and collectionKey is unused, assume it's the users array
      usersArray = payload;
    } else if (payload && payload.collection_key === collectionKey && Array.isArray(payload.data)) {
      usersArray = payload.data;
    } else if (payload && payload[collectionKey] && Array.isArray(payload[collectionKey])) {
      usersArray = payload[collectionKey];
    }

    if (!usersArray || !Array.isArray(usersArray) || usersArray.length === 0) {
      console.error(`No users found in payload under key "${collectionKey}".`);
      process.exit(4);
    }

    const preview = {
      count: usersArray.length,
      sample: usersArray.slice(0, previewCount).map(u => ({
        id: u.id || u.uid || null,
        email: u.email || u.username || null,
        createdAt: u.createdAt || u.created_at || null
      }))
    };

    if (dryRun) {
      console.log(JSON.stringify(preview, null, 2));
      process.exit(0);
    }

    // Real run - require SUPABASE env vars
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment. Set them and re-run.');
      process.exit(5);
    }

    // Prepare results mapping
    const results = [];
    const chunks = [];
    for (let i = 0; i < usersArray.length; i += batchSize) chunks.push(usersArray.slice(i, i + batchSize));

    console.log(`Creating ${usersArray.length} user(s) in ${chunks.length} batch(es) (batch-size=${batchSize})`);

    for (let batchIndex = 0; batchIndex < chunks.length; batchIndex++) {
      const batch = chunks[batchIndex];
      console.log(`Processing batch ${batchIndex + 1}/${chunks.length} (${batch.length} user(s))...`);

      // Sequentially create users in the batch to get clear error handling
      for (const u of batch) {
        try {
          const email = u.email || u.username;
          if (!email) {
            console.warn('Skipping user without email:', u);
            continue;
          }

          // If the payload contains a plaintext "password" field we will use it
          // WARNING: migrating hashed passwords is not supported here.
          const plainPassword = typeof u.password === 'string' && u.password.length > 0 ? u.password : genTempPassword();

          // Build user_metadata - copy name and any profile fields
          const metadata = {};
          if (u.name) metadata.name = u.name;
          if (u.fullName) metadata.fullName = u.fullName;
          if (u.profile) metadata.profile = u.profile;
          if (u.companyId) metadata.companyId = u.companyId;
          if (u.hub) metadata.hub = u.hub;

          const body = {
            email,
            password: plainPassword,
            user_metadata: metadata,
            // confirm email so accounts are active. In production review this.
            email_confirm: true
          };

          const created = await createSupabaseUser(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, body);

          results.push({
            oldId: u.id || u.uid || null,
            email,
            supabaseId: created.id || created.user_id || null,
            tempPassword: plainPassword
          });

          console.log(`Created: ${email} => ${created.id || '(id unknown)'}`);
        } catch (err) {
          console.error('Create user failed for', u && (u.email || u.id), err && err.message ? err.message : err);
          if (err.responseBody) console.error('Response:', JSON.stringify(err.responseBody, null, 2));
          // Continue with next user (do not abort entire migration)
        }
      }
    }

    // Save mapping file with created accounts and temporary passwords
    const outPath = path.resolve(process.cwd(), 'scripts', 'migrated-users-result.json');
    fs.writeFileSync(outPath, JSON.stringify({ createdAt: new Date().toISOString(), results }, null, 2), 'utf8');
    console.log(`Done. Created ${results.length} user(s). Mapping saved to ${outPath}`);
    process.exit(0);

  } catch (err) {
    console.error('Fatal error:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();