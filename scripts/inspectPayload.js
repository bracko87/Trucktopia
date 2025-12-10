/**
 * scripts/inspectPayload.js
 *
 * Node.js helper to inspect migration-payload.json and extract "hub-like" items.
 *
 * Usage:
 *   node scripts/inspectPayload.js migration-payload.json
 *   node scripts/inspectPayload.js migration-payload.json --extract-hubs
 *
 * Responsibilities:
 * - Load the payload (array or object with collections).
 * - Print collection names and counts.
 * - Search for hub-like items (city/country/lat/lon/hub/location).
 * - Optionally write hubs_candidates.json with matching items.
 */

/**
 * @description Synchronously read JSON from a file path
 * @param {string} fp - file path
 * @returns {any} parsed JSON
 */
function readJson(fp) {
  const fs = require('fs');
  const path = require('path');
  const resolved = path.resolve(fp);
  if (!fs.existsSync(resolved)) {
    throw new Error(`File not found: ${resolved}`);
  }
  const raw = fs.readFileSync(resolved, 'utf8');
  return JSON.parse(raw);
}

/**
 * @description Heuristic: detect hub-like keys in an object (case-insensitive)
 * @param {any} obj - object or primitive
 * @returns {string[]} list of matched keys or [] if none
 */
function detectHubLikeFields(obj) {
  const found = new Set();
  const heuristics = [
    'hub',
    'city',
    'country',
    'country_code',
    'countrycode',
    'countrycode',
    'lat',
    'lng',
    'lon',
    'latitude',
    'longitude',
    'location',
    'coords',
    'postal',
    'zip',
    'name'
  ];

  function scan(o, prefix = '') {
    if (o == null) return;
    if (typeof o === 'object') {
      for (const k of Object.keys(o)) {
        const lk = k.toLowerCase();
        for (const h of heuristics) {
          if (lk.includes(h)) {
            found.add(prefix ? `${prefix}.${k}` : k);
          }
        }
        // Recurse if nested
        try {
          scan(o[k], prefix ? `${prefix}.${k}` : k);
        } catch (e) {
          // ignore
        }
      }
    } else if (typeof o === 'string') {
      const s = o.toLowerCase();
      for (const h of ['hub', 'city', 'country', 'latitude', 'longitude']) {
        if (s.includes(h)) {
          found.add(`(value contains "${h}")`);
        }
      }
    }
  }

  scan(obj);
  return Array.from(found);
}

/**
 * @description Try to coerce lat/lon numeric pairs from an object
 * @param {any} obj
 * @returns {{lat?:number, lon?:number}|null}
 */
function extractLatLon(obj) {
  if (obj == null || typeof obj !== 'object') return null;
  const candidates = {};

  const tryNum = (v) => {
    if (v == null) return null;
    const n = Number(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  };

  // Common key names
  const latKeys = ['lat', 'latitude'];
  const lonKeys = ['lon', 'lng', 'longitude'];

  for (const lk of latKeys) {
    for (const k of Object.keys(obj)) {
      if (k.toLowerCase().includes(lk)) {
        const n = tryNum(obj[k]);
        if (n != null) candidates.lat = n;
      }
    }
  }

  for (const lk of lonKeys) {
    for (const k of Object.keys(obj)) {
      if (k.toLowerCase().includes(lk)) {
        const n = tryNum(obj[k]);
        if (n != null) candidates.lon = n;
      }
    }
  }

  // If not at top level, try nested objects
  if ((candidates.lat == null || candidates.lon == null)) {
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (v && typeof v === 'object') {
        const nested = extractLatLon(v);
        if (nested) {
          if (nested.lat != null) candidates.lat = nested.lat;
          if (nested.lon != null) candidates.lon = nested.lon;
        }
      }
    }
  }

  if (candidates.lat != null || candidates.lon != null) {
    return { lat: candidates.lat, lon: candidates.lon };
  }
  return null;
}

/**
 * @description Flatten the payload into an array of migration items
 * @param {any} raw
 * @returns {Array<{collection_name?:string, item?:any, id?:string}>}
 */
function normalizePayload(raw) {
  // If it's already an array of items (common case)
  if (Array.isArray(raw)) return raw;

  // If it's an object with collections
  if (raw && typeof raw === 'object') {
    // Common shapes: { collections: { migration_items: [...] } }
    if (raw.collections && typeof raw.collections === 'object') {
      const all = [];
      for (const k of Object.keys(raw.collections)) {
        const v = raw.collections[k];
        if (Array.isArray(v)) {
          v.forEach((it) => {
            // tag collection name if missing
            if (!it.collection_name) it.collection_name = k;
            all.push(it);
          });
        }
      }
      if (all.length > 0) return all;
    }

    // Try to find first array of objects that looks like migration items
    for (const k of Object.keys(raw)) {
      if (Array.isArray(raw[k]) && raw[k].length > 0 && typeof raw[k][0] === 'object') {
        return raw[k];
      }
    }
  }

  return [];
}

/**
 * @description Main entry
 */
function main() {
  const fs = require('fs');
  const path = require('path');

  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    console.log('Usage: node scripts/inspectPayload.js <migration-payload.json> [--extract-hubs]');
    process.exit(0);
  }

  const file = argv[0];
  const extractHubs = argv.includes('--extract-hubs');

  let raw;
  try {
    raw = readJson(file);
  } catch (err) {
    console.error('Failed to read JSON:', err.message);
    process.exit(2);
  }

  const items = normalizePayload(raw);
  console.log(`Loaded payload. Item count: ${items.length}`);

  // List collection_name counts
  const collections = new Map();
  for (const it of items) {
    const cname = it.collection_name || (it.collection ? it.collection : 'unknown');
    collections.set(cname, (collections.get(cname) || 0) + 1);
  }

  console.log('\\nCollections summary:');
  for (const [cname, cnt] of Array.from(collections.entries()).sort((a, b) => b[1] - a[1])) {
    console.log(`  - ${cname}: ${cnt}`);
  }

  // Quick sample keys (first 20)
  console.log('\\nSample items (first 20 previews):');
  items.slice(0, 20).forEach((it, idx) => {
    const cname = it.collection_name || 'unknown';
    const short = JSON.stringify(it.item ?? it).slice(0, 200).replace(/\\n/g, '');
    console.log(`${idx + 1}. collection: ${cname} — preview: ${short}`);
  });

  // Hub detection
  const hubCandidates = [];
  for (const it of items) {
    const candidateObject = it.item || it; // sometimes item is nested, sometimes the whole object
    const fields = detectHubLikeFields(candidateObject);
    const latlon = extractLatLon(candidateObject);
    const signature = fields.length > 0 || latlon != null;

    if (signature) {
      hubCandidates.push({
        collection_name: it.collection_name || 'unknown',
        id: it.id || it.ID || null,
        fields,
        latlon,
        preview: JSON.stringify(candidateObject).slice(0, 800),
        raw: candidateObject
      });
    }
  }

  console.log(`\\nFound ${hubCandidates.length} hub-like candidate(s).`);
  if (hubCandidates.length > 0) {
    hubCandidates.slice(0, 50).forEach((c, i) => {
      console.log(`\\n[${i + 1}] collection: ${c.collection_name} id:${c.id || '-'} fields:${c.fields.join(', ')} latlon:${c.latlon ? JSON.stringify(c.latlon) : '-'}`);
      console.log(` preview: ${c.preview.slice(0, 400)}`);
    });

    if (extractHubs) {
      const outPath = path.resolve('hubs_candidates.json');
      fs.writeFileSync(outPath, JSON.stringify(hubCandidates.map(h => ({ collection_name: h.collection_name, id: h.id, fields: h.fields, latlon: h.latlon, item: h.raw })), null, 2), 'utf8');
      console.log(`\\nWrote ${hubCandidates.length} candidates to ${outPath}`);
    } else {
      console.log('\\nTip: re-run with --extract-hubs to write hubs_candidates.json for inspection.');
    }
  } else {
    console.log('\\nNo hub-like items detected. If you expected hubs, consider these checks:');
    console.log('- Are you running this script on the same migration-payload.json you downloaded?');
    console.log('- Did the app store hubs in IndexedDB instead of localStorage? Use the IndexedDB extractor if so.');
  }
}

main();