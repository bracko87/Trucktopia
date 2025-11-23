/**
 * scripts/run-migrate-real.js
 *
 * Small local runner that invokes the Netlify migrate function (netlify/functions/migrate.js)
 * with a provided JSON payload. This runner is intended to perform the real migration (not a dry-run).
 *
 * Usage:
 *   # Ensure environment variables are set in the same shell:
 *   # ADMIN_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 *   # Example:
 *   node scripts/run-migrate-real.js scripts/migration-payload.json
 *
 * Security:
 * - This will run with MIGRATION_DRY_RUN='false' and attempt to insert into your Supabase instance.
 * - Do NOT commit your service_role key or admin token.
 */

/** @module scripts/run-migrate-real.js */

const fs = require('fs');
const path = require('path');

/**
 * loadMigrateHandler
 * @description Load the Netlify migrate function handler. Exits if the module cannot be loaded.
 * @returns {Function} handler(event, context)
 */
function loadMigrateHandler() {
  const migratePath = path.join(__dirname, '..', 'netlify', 'functions', 'migrate.js');
  if (!fs.existsSync(migratePath)) {
    console.error('Could not find migrate function at', migratePath);
    process.exit(1);
  }
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const migrateFn = require(migratePath);
  if (!migrateFn || typeof migrateFn.handler !== 'function') {
    console.error('migrate.js does not export handler function');
    process.exit(1);
  }
  return migrateFn.handler;
}

/**
 * readPayload
 * @description Read and parse JSON payload from a file path.
 * @param {string} payloadPath
 * @returns {object} parsed payload
 */
function readPayload(payloadPath) {
  if (!fs.existsSync(payloadPath)) {
    console.error('Payload file not found:', payloadPath);
    process.exit(1);
  }
  const raw = fs.readFileSync(payloadPath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error('Invalid JSON in payload file:', err.message || err);
    process.exit(1);
  }
}

/**
 * main
 * @description Entrypoint: validates env, reads payload, invokes handler and prints results.
 */
(async function main() {
  const payloadArg = process.argv[2] || path.join(__dirname, 'migration-payload.json');
  const payload = readPayload(payloadArg);

  // Validate environment variables
  if (!process.env.ADMIN_TOKEN) {
    console.error('Missing ADMIN_TOKEN. Set it in this shell before running.');
    process.exit(1);
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them in this shell before running.');
    process.exit(1);
  }

  // Force real migration (no dry-run) unless explicitly overridden in env
  if (!process.env.MIGRATION_DRY_RUN) {
    process.env.MIGRATION_DRY_RUN = 'false';
  }

  console.log('-> Running migration:');
  console.log('   SUPABASE_URL:', process.env.SUPABASE_URL);
  console.log('   MIGRATION_DRY_RUN:', process.env.MIGRATION_DRY_RUN);
  console.log('   Payload file:', payloadArg);

  const handler = loadMigrateHandler();

  const event = {
    httpMethod: 'POST',
    headers: { Authorization: `Bearer ${process.env.ADMIN_TOKEN}` },
    body: JSON.stringify(payload)
  };

  try {
    const res = await handler(event, {});
    console.log('-> Handler response:');
    console.log('Status:', res && res.statusCode);
    try {
      console.log('Body:', res && typeof res.body === 'string' ? JSON.parse(res.body) : res && res.body);
    } catch (e) {
      console.log('Body (raw):', res && res.body);
    }
  } catch (err) {
    console.error('Migration failed:', err && err.stack ? err.stack : err);
    process.exit(1);
  }
})();