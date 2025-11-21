/**
 * scripts/importToSupabase.js
 *
 * Script to import a migrator export JSON into Supabase via REST.
 *
 * Usage:
 *   node scripts/importToSupabase.js --file exported-docs.json --url https://your-project.supabase.co --key YOUR_SERVICE_ROLE_KEY
 *
 * Environment variables (optional):
 *   SUPABASE_URL, SUPABASE_KEY
 *
 * Notes:
 * - Uses global fetch (Node 18+). If using Node <18, install node-fetch and adapt the script.
 * - The script tries to smartly map common collections (companies, users, skill_progress).
 * - It inserts each object into the corresponding table and also stores the full object under "data" (jsonb).
 * - Tables must already exist in Supabase.
 */

/**
 * @fileoverview Entry script that posts exported JSON documents to Supabase REST.
 */

import fs from 'fs';
import path from 'path';
import process from 'process';

/**
 * @typedef {Object} ImportOptions
 * @property {string} filePath - Path to exported JSON
 * @property {string} supabaseUrl - Supabase base URL (eg https://xyz.supabase.co)
 * @property {string} supabaseKey - Service role key
 */

/**
 * Parse CLI arguments into an options object.
 * @returns {ImportOptions}
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--file') opts.filePath = args[++i];
    if (a === '--url') opts.supabaseUrl = args[++i];
    if (a === '--key') opts.supabaseKey = args[++i];
  }
  opts.filePath = opts.filePath || process.env.EXPORT_FILE || 'exported-docs.json';
  opts.supabaseUrl = opts.supabaseUrl || process.env.SUPABASE_URL;
  opts.supabaseKey = opts.supabaseKey || process.env.SUPABASE_KEY;
  return /** @type {ImportOptions} */ (opts);
}

/**
 * Safe fetch wrapper that includes Supabase headers.
 * @param {string} url
 * @param {object} options
 */
async function supaFetch(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch (err) {
    body = text;
  }
  return { ok: res.ok, status: res.status, body, headers: res.headers };
}

/**
 * Insert a row into a Supabase table using REST.
 * @param {string} baseUrl
 * @param {string} key
 * @param {string} table
 * @param {object} row
 */
async function insertRow(baseUrl, key, table, row) {
  const url = `${baseUrl.replace(/\/$/, '')}/rest/v1/${table}`;
  const headers = {
    'Content-Type': 'application/json',
    apikey: key,
    Authorization: `Bearer ${key}`,
    Prefer: 'return=representation'
  };
  const resp = await supaFetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(row)
  });
  return resp;
}

/**
 * Normalize item to have id and data field for flexible import.
 * @param {object} item
 * @returns {{id:any, plain:object}}
 */
function normalize(item) {
  const plain = { ...item };
  let id = plain.id || plain._id || plain.uid || plain.companyId || plain.userId || undefined;
  if (!id) {
    // if no id, auto-generate a timestamp-based id to avoid collisions
    id = `import_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  }
  // remove nested large structures if you want, but we will keep them in data
  return { id, plain };
}

/**
 * Determine target tables and which top-level keys to import.
 * This function can be extended to map other export formats.
 * @param {object} exportObj
 */
function discoverCollections(exportObj) {
  const keys = Object.keys(exportObj);
  const collections = [];

  // common patterns
  const mapping = {
    companies: 'companies',
    company: 'companies',
    users: 'users',
    user: 'users',
    skill_progress: 'skill_progress',
    skillProgress: 'skill_progress',
    staff: 'users'
  };

  keys.forEach((k) => {
    if (Array.isArray(exportObj[k])) {
      const target = mapping[k] || k;
      collections.push({ key: k, target, items: exportObj[k] });
    } else if (typeof exportObj[k] === 'object' && exportObj[k] !== null) {
      // some exporters put an object of objects
      const maybeArr = Object.values(exportObj[k]);
      if (maybeArr.every(v => typeof v === 'object')) {
        const target = mapping[k] || k;
        collections.push({ key: k, target, items: maybeArr });
      }
    }
  });

  // If nothing found, check for canonical keys inside nested objects
  if (collections.length === 0) {
    // Try common keys inside
    ['companies', 'users', 'skill_progress', 'staff'].forEach((k) => {
      if (exportObj[k]) {
        const items = Array.isArray(exportObj[k]) ? exportObj[k] : Object.values(exportObj[k]);
        collections.push({ key: k, target: k, items });
      }
    });
  }

  return collections;
}

/**
 * Main import routine.
 */
async function main() {
  const opts = parseArgs();
  if (!opts.supabaseUrl || !opts.supabaseKey) {
    console.error('Missing Supabase URL or KEY. Use --url and --key or set SUPABASE_URL and SUPABASE_KEY.');
    process.exit(1);
  }

  const filePath = path.resolve(process.cwd(), opts.filePath);
  if (!fs.existsSync(filePath)) {
    console.error(`Export file not found: ${filePath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  let exported;
  try {
    exported = JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse exported JSON:', err);
    process.exit(1);
  }

  const collections = discoverCollections(exported);
  if (collections.length === 0) {
    console.error('No collections discovered in export. Please ensure the JSON contains top-level arrays like "companies" or "users".');
    console.error('Export top-level keys:', Object.keys(exported).join(', '));
    process.exit(1);
  }

  console.log('Discovered collections:', collections.map(c => `${c.key} -> ${c.target}`).join(', '));

  let total = 0;
  let successes = 0;
  let failures = 0;

  for (const col of collections) {
    console.log(`\nImporting collection "${col.key}" -> table "${col.target}" (${col.items.length} items)`);
    for (const item of col.items) {
      total++;
      const { id, plain } = normalize(item);
      // ensure id is included in row when meaningful to preserve original id
      const row = {
        id: String(id),
        data: plain
      };

      // also try mapping common top-level fields
      if (plain.name) row.name = plain.name;
      if (plain.email) row.email = plain.email;
      if (plain.userId) row.userId = plain.userId;
      if (plain.companyId) row.companyId = plain.companyId;

      try {
        const resp = await insertRow(opts.supabaseUrl, opts.supabaseKey, col.target, row);
        if (resp.ok) {
          successes++;
          console.log(` + OK id=${row.id}`);
        } else {
          failures++;
          console.error(` - FAILED id=${row.id} status=${resp.status} response=`, resp.body);
        }
      } catch (err) {
        failures++;
        console.error(` - ERROR id=${row.id}`, err);
      }
    }
  }

  console.log(`\nDone. total=${total} success=${successes} failed=${failures}`);
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});