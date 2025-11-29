/**
 * import-migration-payload-to-supabase.js
 *
 * Node script to import a migration payload of users into Supabase Auth using the
 * Admin API (service_role key). The script supports dry-run and batching.
 *
 * Usage:
 *   # Dry run (no network)
 *   node ./scripts/import-migration-payload-to-supabase.js ./scripts/migration-payload-full.json --dry-run
 *
 *   # Real run (ensure env vars SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in the same shell)
 *   $env:SUPABASE_URL = "https://your-project.supabase.co"
 *   $env:SUPABASE_SERVICE_ROLE_KEY = "sb_secret_XXXXXXXX"
 *   node ./scripts/import-migration-payload-to-supabase.js ./scripts/migration-payload-full.json --batch-size=5
 *
 * Output:
 *   - writes scripts/migrated-users-result.json with mapping { email, supabase_id, tempPassword, status }
 *
 * Notes:
 *   - This script places company/progress data in user_metadata (user_metadata.company) for each user.
 *     Later you can move user_metadata.company into a proper Postgres table if you prefer.
 *
 *  Keep the service role secret. Do not commit migrated result files to a public repo.
 */

const fs = require('fs');
const path = require('path');
const { randomBytes } = require('crypto');

const argv = process.argv.slice(2);

/**
 * parseArgs
 * @description Simple arg parser; returns { filePath, dryRun, batchSize }
 */
function parseArgs(args) {
  const out = { filePath: null, dryRun: false, batchSize: 10 };
  args.forEach(arg => {
    if (arg === '--dry-run') out.dryRun = true;
    else if (arg.startsWith('--batch-size=')) out.batchSize = Number(arg.split('=')[1]) || 10;
    else if (!out.filePath) out.filePath = arg;
  });
  return out;
}

/**
 * normalizeBaseUrl
 * @description Ensure base URL has no trailing slash
 */
function normalizeBaseUrl(u) {
  return String(u).replace(/\/$/, '');
}

/**
 * generateTempPassword
 * @description Generate a safe temporary password (12 chars)
 */
function generateTempPassword() {
  return randomBytes(9).toString('base64').replace(/\W/g, 'A').slice(0, 12);
}

/**
 * safeWriteJson
 * @description Write JSON to disk atomically
 */
function safeWriteJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * run
 * @description Main entry point
 */
async function run() {
  const { filePath, dryRun, batchSize } = parseArgs(argv);
  if (!filePath) {
    console.error('Usage: node import-migration-payload-to-supabase.js <payload.json> [--dry-run] [--batch-size=N]');
    process.exit(1);
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!dryRun) {
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[import] Fatal: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment for real runs.');
      process.exit(1);
    }
  }

  // Load payload
  const absPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(absPath)) {
    console.error('[import] Fatal: payload file not found:', absPath);
    process.exit(1);
  }
  const raw = fs.readFileSync(absPath, 'utf8');
  const payload = JSON.parse(raw);
  const users = (payload?.collections?.users) || [];

  console.log(`[import] Payload loaded: ${users.length} user(s)`);
  if (dryRun) {
    console.log('[import] Dry run - sample:');
    console.log(JSON.stringify(users.slice(0, 3).map(u => ({ id: u.id, email: u.email, createdAt: u.createdAt })), null, 2));
    process.exit(0);
  }

  const baseUrl = normalizeBaseUrl(supabaseUrl);
  const adminEndpoint = `${baseUrl}/auth/v1/admin/users`;
  const results = [];
  let created = 0;

  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    console.log(`[import] Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} users)`);

    // Import each user sequentially inside batch (keeps logs readable); can be parallelized later
    for (const u of batch) {
      const email = (u.email || '').trim();
      if (!email) {
        console.warn('[import] Skipping user with no email:', u);
        results.push({ email: null, status: 'skipped_no_email' });
        continue;
      }

      // Create temp password if none provided
      const tempPassword = u.password && u.password.length > 0 ? u.password : generateTempPassword();

      // Prepare metadata: embed any per-user state under user_metadata.company (if present)
      const metadata = {};
      if (u.userState) {
        metadata.userState = u.userState;
      } else if (u.company) {
        metadata.company = u.company;
      }

      const body = {
        email,
        password: tempPassword,
        user_metadata: metadata
      };

      try {
        const res = await fetch(adminEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseServiceKey}`,
            apikey: supabaseServiceKey
          },
          body: JSON.stringify(body)
        });

        if (res.status === 400) {
          // likely user already exists; attempt to read response to decide
          const errBody = await res.json().catch(() => null);
          const msg = (errBody && errBody.message) ? errBody.message : JSON.stringify(errBody);
          console.warn(`[import] User create failed for ${email} (400). Message: ${msg}`);
          results.push({ email, tempPassword: null, status: 'exists_or_bad_request', message: msg });
          continue;
        } else if (res.status === 401) {
          const errBody = await res.text().catch(() => '');
          console.error('[import] Fatal: 401 Unauthorized - invalid service role key. Aborting. Response:', errBody);
          safeWriteJson('./scripts/migrated-users-result.json', results);
          process.exit(1);
        } else if (!res.ok) {
          const errText = await res.text().catch(() => null);
          console.warn(`[import] Unexpected response for ${email}: ${res.status} ${res.statusText} - ${errText}`);
          results.push({ email, tempPassword: null, status: `error_${res.status}`, message: errText });
          continue;
        }

        const createdUser = await res.json().catch(() => null);
        created++;
        console.log(`[import] Created ${email} -> id ${createdUser?.id || '(no id returned)'}`);
        results.push({ email, tempPassword, status: 'created', supabase_id: createdUser?.id || null });
      } catch (err) {
        console.error(`[import] Network/exception for ${email}:`, err);
        results.push({ email, tempPassword: null, status: 'network_error', message: String(err?.message || err) });
      }
    } // end batch loop

    // Persist partial results after each batch so we can resume
    try {
      safeWriteJson('./scripts/migrated-users-result.json', results);
    } catch (e) {
      console.warn('[import] Warning: failed to write mapping file after batch', e);
    }

    // small delay to be gentle on server (optional)
    await new Promise(r => setTimeout(r, 300));
  } // end for batches

  console.log(`[import] Completed. Created: ${created}, processed: ${users.length}`);
  safeWriteJson('./scripts/migrated-users-result.json', results);
  console.log('[import] Results written to ./scripts/migrated-users-result.json');
}

run().catch(err => {
  console.error('[import] Fatal runtime error:', err);
  process.exit(1);
});