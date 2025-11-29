/**
 * scripts/preview-migration.js
 *
 * Local preview helper for migration payloads.
 *
 * Purpose:
 * - Read a migration payload JSON file (default: scripts/migration-payload.json).
 * - Run the same normalization logic used by the Netlify migration function to
 *   produce the rows that would be inserted into public.migrated_collections.
 * - Print a concise debug summary + a preview of the rows (first 10).
 *
 * Usage:
 *   node scripts/preview-migration.js
 *   node scripts/preview-migration.js /path/to/migration-payload.json
 *
 * This script is safe: it only reads local files and DOES NOT call Supabase.
 */

const fs = require('fs');
const path = require('path');

/**
 * ensureCollectionName
 * @description Ensure minimal collection_name on a payload object (mirrors server helper).
 * @param {object} payload
 * @returns {object}
 */
function ensureCollectionName(payload) {
  const out = Object.assign({}, payload || {});
  if (typeof out.collection_key === 'string' && (!out.collection_name || out.collection_name === null)) {
    out.collection_name = out.collection_key;
  }
  return out;
}

/**
 * buildRowsFromPayload
 * @description Convert frontend payload into array of rows suitable for migrated_collections.
 * Mirrors the logic in the Netlify function.
 * @param {object} payload
 * @returns {Array<object>}
 */
function buildRowsFromPayload(payload) {
  const rows = [];

  if (payload && typeof payload.collections === 'object' && !Array.isArray(payload.collections)) {
    const meta = payload.metadata || null;
    for (const [collectionKey, collectionData] of Object.entries(payload.collections)) {
      rows.push({
        collection_key: collectionKey,
        collection_name: collectionKey,
        data: collectionData,
        metadata: meta
      });
    }
  } else if (Array.isArray(payload)) {
    return payload;
  } else if (payload && (payload.collection_key || payload.collection_name)) {
    rows.push({
      collection_key: payload.collection_key || payload.collection_name,
      collection_name: payload.collection_name || payload.collection_key,
      data: payload.data ?? null,
      metadata: payload.metadata ?? null
    });
  }

  return rows;
}

/**
 * main
 * @description Entrypoint: read file, normalize, and print preview
 */
function main() {
  const args = process.argv.slice(2);
  const filePath = args[0] ? path.resolve(process.cwd(), args[0]) : path.join(process.cwd(), 'scripts', 'migration-payload.json');

  if (!fs.existsSync(filePath)) {
    console.error('Payload file not found:', filePath);
    process.exit(2);
  }

  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    console.error('Failed to read file:', err);
    process.exit(3);
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (err) {
    console.error('Invalid JSON:', err.message);
    process.exit(4);
  }

  const normalized = ensureCollectionName(payload);
  const rows = buildRowsFromPayload(normalized);

  const preview = {
    debug: true,
    inputFile: filePath,
    totalCollectionsFound: Array.isArray(payload.collections) ? payload.collections.length : (payload.collections ? Object.keys(payload.collections).length : 0),
    computedRowsCount: rows.length,
    keys: rows.map(r => r.collection_key),
    rowsPreview: rows.slice(0, 10)
  };

  console.log(JSON.stringify(preview, null, 2));
}

main();