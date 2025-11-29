/**
 * scripts/extract-users-from-payload.js
 *
 * Helper to extract user-like objects from a generic migration payload.
 *
 * Usage:
 *   # Dry-run (no file written)
 *   node ./scripts/extract-users-from-payload.js ./scripts/migration-payload.json --dry-run
 *
 *   # Produce a users-only payload file
 *   node ./scripts/extract-users-from-payload.js ./scripts/migration-payload.json --out ./scripts/migration-payload-users.json
 *
 * Notes:
 * - The script heuristically locates objects that contain an "email" property
 *   where the value is a string containing '@'. It will attempt to preserve id,
 *   email, password (if present), name and createdAt when available.
 * - Inspect the generated file before running migrate-auth-users.js.
 */ 
const fs = require('fs');
const path = require('path');

function parseArgs() {
  const argv = process.argv.slice(2);
  const out = {
    payloadPath: path.join(process.cwd(), 'scripts', 'migration-payload.json'),
    outPath: path.join(process.cwd(), 'scripts', 'migration-payload-users.json'),
    dryRun: false
  };

  argv.forEach(a => {
    if (a === '--dry-run') out.dryRun = true;
    else if (a.startsWith('--out=')) out.outPath = a.split('=')[1];
    else out.payloadPath = a;
  });

  return out;
}

/**
 * @description Load JSON from disk
 * @param {string} p
 * @returns {any}
 */
function readJson(p) {
  const resolved = path.resolve(p);
  if (!fs.existsSync(resolved)) throw new Error(`File not found: ${resolved}`);
  const raw = fs.readFileSync(resolved, 'utf8');
  return JSON.parse(raw);
}

/**
 * @description Shallow-copy useful user fields from a found object
 * @param {object} src
 * @returns {object}
 */
function normalizeUserObject(src) {
  const out = {};
  if (src.id) out.id = src.id;
  if (src.uid) out.id = out.id || src.uid;
  if (src.email) out.email = src.email;
  if (src.username && !out.email) out.email = src.username;
  if (src.password) out.password = src.password;
  if (src.name) out.name = src.name;
  if (src.fullName) out.name = out.name || src.fullName;
  if (src.createdAt) out.createdAt = src.createdAt;
  if (src.created_at) out.createdAt = out.createdAt || src.created_at;
  // copy the whole object into payload when id/email are present but fields are nested
  out.raw = src;
  return out;
}

/**
 * @description Recursively search for an object that contains an 'email' string with an '@'
 * @param {any} node
 * @returns {object|null}
 */
function findObjectWithEmail(node) {
  if (!node || typeof node !== 'object') return null;
  // If current node itself has an email
  if (typeof node.email === 'string' && node.email.includes('@')) {
    return node;
  }
  // Also check username fields that look like email
  if (typeof node.username === 'string' && node.username.includes('@')) {
    return node;
  }
  // Iterate keys
  for (const key of Object.keys(node)) {
    const val = node[key];
    if (val && typeof val === 'object') {
      const found = findObjectWithEmail(val);
      if (found) return found;
    }
  }
  return null;
}

(async function main() {
  try {
    const { payloadPath, outPath, dryRun } = parseArgs();
    const payload = readJson(payloadPath);

    let collections = null;
    if (payload && typeof payload.collections === 'object') {
      collections = payload.collections;
    } else if (Array.isArray(payload)) {
      // top-level array -> treat as a single unnamed collection
      collections = { unnamed: payload };
    } else {
      console.error('Unrecognized payload format. Expected { collections: { ... } } or top-level array.');
      process.exit(2);
    }

    const extracted = [];
    const seenEmails = new Set();

    for (const [collectionKey, items] of Object.entries(collections)) {
      if (!Array.isArray(items)) continue;
      for (const item of items) {
        // If item itself looks like a user
        let userCandidate = null;
        if (item && typeof item === 'object') {
          if (typeof item.email === 'string' && item.email.includes('@')) {
            userCandidate = item;
          } else {
            // Try to find nested object with email
            const found = findObjectWithEmail(item);
            if (found) userCandidate = found;
          }
        }
        if (userCandidate && userCandidate.email) {
          const normalized = normalizeUserObject(userCandidate);
          const emailLower = String(normalized.email).toLowerCase();
          if (!seenEmails.has(emailLower)) {
            seenEmails.add(emailLower);
            extracted.push(normalized);
          }
        }
      }
    }

    const outPayload = {
      metadata: payload.metadata || { extractedAt: new Date().toISOString() },
      collections: {
        users: extracted
      }
    };

    console.log(JSON.stringify({
      foundUsers: extracted.length,
      preview: extracted.slice(0, 8)
    }, null, 2));

    if (dryRun) {
      console.log('Dry-run requested — no file written. Inspect preview above.');
      process.exit(0);
    }

    fs.writeFileSync(outPath, JSON.stringify(outPayload, null, 2), 'utf8');
    console.log(`Wrote ${extracted.length} user(s) to ${outPath}`);
    process.exit(0);
  } catch (err) {
    console.error('Fatal:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();