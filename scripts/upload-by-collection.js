/**
 * scripts/upload-by-collection.js
 *
 * Small helper that splits a large migration payload into per-collection POSTs.
 * Each collection is posted separately to the migrate function to avoid size/timeouts
 * and provide per-collection success/failure reporting.
 *
 * Usage:
 *   node --experimental-fetch scripts/upload-by-collection.js ./full-payload.json https://your-site/.netlify/functions/migrate YOUR_ADMIN_TOKEN
 *
 * Note:
 * - Requires Node 18+ (global fetch). If your Node lacks fetch, run with a fetch polyfill or use PowerShell script instead.
 * - This script does not upload collections in parallel by default to keep it safe for the server.
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Read JSON file from disk.
 * @param {string} p
 * @returns {Promise<any>}
 */
async function readJsonFile(p) {
  const raw = await fs.readFile(p, 'utf8');
  return JSON.parse(raw);
}

/**
 * Post one collection payload to the function endpoint.
 * @param {string} endpoint
 * @param {string} token
 * @param {string} collectionKey
 * @param {any} items
 * @param {any} metadata
 */
async function postCollection(endpoint, token, collectionKey, items, metadata) {
  const body = {
    metadata: metadata || {},
    collections: {
      [collectionKey]: items
    }
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });

  const text = await res.text();
  let parsed;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }

  return { ok: res.ok, status: res.status, body: parsed };
}

/**
 * Main runner
 */
async function main() {
  try {
    const args = process.argv.slice(2);
    const payloadPath = args[0] || path.join(process.cwd(), 'full-payload.json');
    const endpoint = args[1] || 'https://test25h.netlify.app/.netlify/functions/migrate';
    const token = args[2] || process.env.MIGRATE_ADMIN_TOKEN;

    if (!token) {
      console.error('Missing ADMIN token. Provide as third arg or set MIGRATE_ADMIN_TOKEN environment variable.');
      process.exit(2);
    }

    console.log('Reading payload from:', payloadPath);
    const payload = await readJsonFile(payloadPath);
    const metadata = payload.metadata || {};

    if (!payload.collections || Object.keys(payload.collections).length === 0) {
      console.error('No collections found in payload.json');
      process.exit(3);
    }

    const results = [];
    for (const [collectionKey, items] of Object.entries(payload.collections)) {
      console.log(`Posting collection: ${collectionKey} (items: ${Array.isArray(items) ? items.length : 'unknown'})`);
      const r = await postCollection(endpoint, token, collectionKey, items, metadata);
      console.log(` -> ${collectionKey}: ${r.ok ? 'OK' : 'FAIL'} (HTTP ${r.status})`);
      results.push({ collection: collectionKey, ok: r.ok, status: r.status, body: r.body });
      // small delay to be polite to the endpoint (optional)
      await new Promise((res) => setTimeout(res, 200));
    }

    console.log('All done. Summary:');
    console.log(JSON.stringify(results, null, 2));
  } catch (err) {
    console.error('Error:', err && (err.message || err));
    process.exit(1);
  }
}

main();
