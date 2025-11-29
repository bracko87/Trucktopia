/**
 * scripts/inspect-users.js
 *
 * Lightweight helper to inspect a migration payload and list users.
 *
 * Usage:
 *   node ./scripts/inspect-users.js ./scripts/migration-payload-users.json
 *
 * Output:
 *  - number of users found
 *  - list of up to 10 user emails / ids
 *  - full JSON of the first user (pretty)
 */

/**
 * @description Read a JSON file from disk and return parsed object
 * @param {string} path - filesystem path to JSON file
 * @returns {any} parsed JSON
 */
function readJsonFile(path) {
  const fs = require('fs');
  const p = require('path').resolve(path);
  if (!fs.existsSync(p)) {
    throw new Error(`Payload file not found: ${p}`);
  }
  const raw = fs.readFileSync(p, 'utf8');
  return JSON.parse(raw);
}

/**
 * @description Entry: read file given as first CLI arg and print summary
 */
(function main() {
  try {
    const argv = process.argv.slice(2);
    if (!argv[0]) {
      console.error('Usage: node ./scripts/inspect-users.js <payload.json>');
      process.exit(2);
    }
    const payload = readJsonFile(argv[0]);
    const users = payload && payload.collections && Array.isArray(payload.collections.users)
      ? payload.collections.users
      : [];

    console.log('Found users count:', users.length);
    if (users.length === 0) {
      console.log('No users array found under payload.collections.users or it is empty.');
      process.exit(0);
    }

    // print up to first 10 summary lines
    const sample = users.slice(0, 10).map(u => {
      return {
        id: u.id ?? u.uid ?? null,
        email: u.email ?? u.username ?? null,
        name: u.name ?? u.fullName ?? null,
        passwordPresent: typeof u.password === 'string' && u.password.length > 0
      };
    });
    console.log('First users (up to 10):');
    console.log(JSON.stringify(sample, null, 2));

    console.log('\nFull first user object:');
    console.log(JSON.stringify(users[0], null, 2));

  } catch (err) {
    console.error('Fatal:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();