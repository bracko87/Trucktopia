/**
 * scripts/run-migrate-test.js
 *
 * Lightweight test harness to exercise the Netlify function handler exported
 * from netlify/functions/migrate.js without deploying. Use this to verify:
 *  - OPTIONS preflight handling
 *  - Authorization parsing behavior (missing / present token)
 *  - Basic request validation (e.g. "No collections provided")
 *
 * Usage:
 *   node scripts/run-migrate-test.js
 *
 * Notes:
 *  - This file intentionally avoids making real network calls (we pass an empty
 *    collections object for the authenticated POST test so the handler short-circuits).
 *  - The harness prints the handler responses so you can paste them back here.
 */

/**
 * Module imports
 */
const path = require('path');

/**
 * Load the migrate handler module
 * @returns {object} module exporting `handler`
 */
function loadHandlerModule() {
  try {
    // Resolve path relative to this script located in ./scripts/
    const migratePath = path.join(__dirname, '..', 'netlify', 'functions', 'migrate.js');
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const migrateFn = require(migratePath);
    return migrateFn;
  } catch (err) {
    console.error('Could not load handler from netlify/functions/migrate.js. Ensure the file exists and exports.handler is defined.');
    throw err;
  }
}

/**
 * runTest
 * @description Run a set of synthetic events against the migrate handler and log results.
 */
async function runTest() {
  const migrateFn = loadHandlerModule();
  if (!migrateFn || typeof migrateFn.handler !== 'function') {
    console.error('Could not load handler from netlify/functions/migrate.js. Ensure the file exists and exports.handler is defined.');
    process.exit(1);
  }

  const handler = migrateFn.handler;

  console.log('== migrate function local tests ==\n');

  // 1) OPTIONS preflight - should return 204 (no body)
  try {
    const optionsEvent = { httpMethod: 'OPTIONS', headers: { Origin: 'http://localhost' } };
    const res = await handler(optionsEvent, {});
    console.log('1) OPTIONS -> statusCode:', res && res.statusCode);
    console.log('   headers:', res && res.headers);
    console.log('   body (first 200 chars):', String(res && res.body).slice(0, 200), '\n');
  } catch (err) {
    console.error('1) OPTIONS -> threw error:', err && err.stack ? err.stack : err);
  }

  // 2) POST without Authorization - should return 401 Unauthorized
  try {
    const postNoAuth = {
      httpMethod: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metadata: {}, collections: { foo: { a: 1 } } })
    };
    const res2 = await handler(postNoAuth, {});
    console.log('2) POST no Authorization -> statusCode:', res2 && res2.statusCode);
    console.log('   body:', res2 && res2.body, '\n');
  } catch (err) {
    console.error('2) POST no Authorization -> threw error:', err && err.stack ? err.stack : err);
  }

  // 3) POST with correct Authorization but empty collections -> should return 400 "No collections provided"
  try {
    // Provide ADMIN_TOKEN so the token verification passes, but pass empty collections to exercise validation path.
    process.env.ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'test-admin-token';
    // Provide minimal Supabase env so handler can proceed to validation (we avoid actually inserting).
    process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-key';

    const postAuthEmptyCollections = {
      httpMethod: 'POST',
      headers: { Authorization: `Bearer ${process.env.ADMIN_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ metadata: {}, collections: {} })
    };

    const res3 = await handler(postAuthEmptyCollections, {});
    console.log('3) POST with correct token + empty collections -> statusCode:', res3 && res3.statusCode);
    console.log('   body:', res3 && res3.body, '\n');
  } catch (err) {
    console.error('3) POST auth+empty collections -> threw error:', err && err.stack ? err.stack : err);
  }

  console.log('== tests complete ==\n');
  console.log('If you see the expected statusCodes (204, 401, 400) the module is syntactically OK and the authorization parsing works.');
  console.log('Paste the console output here so I can confirm and guide the next step.');
}

runTest().catch(err => {
  console.error('Fatal error running tests:', err && err.stack ? err.stack : err);
  process.exit(1);
});