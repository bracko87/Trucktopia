/**
 * scripts/run-migrate-insert-test.js
 *
 * Small test harness to call the migrate handler with a non-empty collections payload.
 * - Sets ADMIN_TOKEN and MIGRATION_DRY_RUN to true (safe, no network calls)
 * - Invokes the handler and prints the result
 *
 * Usage:
 *   node scripts/run-migrate-insert-test.js
 */

const path = require('path');

function loadHandler() {
  const migratePath = path.join(__dirname, '..', 'netlify', 'functions', 'migrate.js');
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const migrateFn = require(migratePath);
  if (!migrateFn || typeof migrateFn.handler !== 'function') {
    throw new Error('Could not load migrate handler from netlify/functions/migrate.js (exports.handler missing)');
  }
  return migrateFn.handler;
}

async function run() {
  try {
    // Safe defaults for local testing
    process.env.ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'local-test-admin-token';
    process.env.MIGRATION_DRY_RUN = 'true';

    // Debug: print envs before requiring the handler so we confirm the test process has the flags set
    console.log(' -> run-migrate-insert-test: ADMIN_TOKEN =', process.env.ADMIN_TOKEN);
    console.log(' -> run-migrate-insert-test: MIGRATION_DRY_RUN =', process.env.MIGRATION_DRY_RUN);

    const handler = loadHandler();

    const event = {
      httpMethod: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        metadata: { requestedBy: 'local-runner' },
        collections: {
          sample_collection: { hello: 'world', createdAt: new Date().toISOString() }
        }
      })
    };

    const res = await handler(event, {});
    console.log('-> Handler response');
    console.log('Status:', res && res.statusCode);
    try {
      console.log('Body:', res && typeof res.body === 'string' ? JSON.parse(res.body) : res && res.body);
    } catch (e) {
      console.log('Body (raw):', res && res.body);
    }
  } catch (err) {
    console.error('Test failed:', err && err.stack ? err.stack : err);
    process.exit(1);
  }
}

run();