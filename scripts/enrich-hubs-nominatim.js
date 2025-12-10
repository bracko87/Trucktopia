/**
 * scripts/enrich-hubs-nominatim.js
 *
 * Read a normalized hubs JSON file named "hubs.normalized.json" (array of hubs),
 * query OpenStreetMap Nominatim for coordinates/country code for each hub (city+country),
 * and emit:
 *  - hubs.enriched.json  (full enriched objects)
 *  - hubs_update.sql     (UPDATE statements to apply to your DB)
 *
 * Usage:
 *   1) Ensure Node 18+ (global fetch is available). If you run Node <18 you'll need to add a fetch polyfill.
 *   2) Edit EMAIL and USER_AGENT constants below to your contact info (Nominatim requires a contact).
 *   3) Place hubs.normalized.json in the project root (array of objects with `id`).
 *   4) Run: node scripts/enrich-hubs-nominatim.js
 *
 * Notes:
 *  - This script respects a ~1.1s delay between requests to be polite to public Nominatim.
 *  - The generated SQL file contains conservative UPDATE statements you should review before applying.
 *  - If Nominatim returns no result for a hub, lat/lon remain null and the SQL will include a comment line.
 */

/**
 * @fileoverview Enrich hubs with lat/lon/country_code via Nominatim and write SQL updates.
 */

const fs = require('fs');
const path = require('path');

/**
 * Configuration - set these to identifying values before running
 * - EMAIL: contact email (per Nominatim usage policy)
 * - USER_AGENT: identifying User-Agent string for requests
 */
const EMAIL = 'your-email@example.com'; // <- CHANGE to your contact email
const USER_AGENT = 'YourProjectName-Migration/1.0 (+https://yourdomain.example)'; // <- CHANGE

const INPUT_FILE = path.resolve(process.cwd(), 'hubs.normalized.json');
const OUTPUT_JSON = path.resolve(process.cwd(), 'hubs.enriched.json');
const OUTPUT_SQL = path.resolve(process.cwd(), 'hubs_update.sql');
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

/**
 * sleep
 * @description Wait for `ms` milliseconds.
 * @param {number} ms milliseconds
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * queryNominatim
 * @description Query Nominatim for a free-text query string and return first result or null.
 * @param {string} q free-text query (e.g. "Herceg Novi, Montenegro")
 * @returns {Promise<object|null>}
 */
async function queryNominatim(q) {
  // Node 18+ supplies global fetch; in older Node, the user must polyfill
  if (typeof fetch !== 'function') {
    throw new Error('Global fetch not available. Use Node 18+ or run with a fetch polyfill.');
  }

  const params = new URLSearchParams({
    q,
    format: 'json',
    addressdetails: '1',
    limit: '1'
  });

  const url = `${NOMINATIM_URL}?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept-Language': 'en',
      'From': EMAIL
    }
  });

  if (!res.ok) {
    throw new Error(`Nominatim returned ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  return data[0];
}

/**
 * buildQueryForHub
 * @description Build a reliable search string for a hub using city+country_name or name+city+country.
 * @param {object} hub hub object (may have name, city, country_name)
 * @returns {string} search string
 */
function buildQueryForHub(hub) {
  const parts = [];
  if (hub.city && typeof hub.city === 'string' && hub.city.trim()) parts.push(hub.city.trim());
  if (hub.country_name && typeof hub.country_name === 'string' && hub.country_name.trim()) parts.push(hub.country_name.trim());
  if (parts.length === 0 && hub.name) parts.push(String(hub.name));
  if (parts.length === 0 && hub.id) parts.push(String(hub.id));
  return parts.join(', ');
}

/**
 * main
 * @description Entry: read input JSON, geocode hubs, and emit enriched JSON + SQL.
 */
async function main() {
  try {
    if (!fs.existsSync(INPUT_FILE)) {
      console.error('Input file not found:', INPUT_FILE);
      process.exit(1);
    }

    const raw = fs.readFileSync(INPUT_FILE, 'utf-8');
    let hubs = [];
    try {
      hubs = JSON.parse(raw);
      if (!Array.isArray(hubs)) throw new Error('Expected an array of hub objects in hubs.normalized.json');
    } catch (err) {
      console.error('Failed to parse hubs.normalized.json:', err.message);
      process.exit(1);
    }

    const enriched = [];
    const sqlLines = [];
    console.log(`Found ${hubs.length} hub(s). Beginning geocode (1+ sec per request)...`);

    for (let i = 0; i < hubs.length; i++) {
      const h = hubs[i];
      const display = `${h.name || h.city || h.id} (${i + 1}/${hubs.length})`;
      console.log('Processing', display);

      const q = buildQueryForHub(h);
      let result = null;
      try {
        result = await queryNominatim(q);
      } catch (err) {
        console.warn('Nominatim query failed for', q, ':', err.message);
      }

      // Politeness delay: ~1.1s
      await sleep(1100);

      if (result) {
        const lat = result.lat ? parseFloat(result.lat) : null;
        const lon = result.lon ? parseFloat(result.lon) : null;
        const addr = result.address || {};
        const country_code = addr.country_code ? String(addr.country_code).toLowerCase() : (h.country_code || null);
        const country_name = addr.country || h.country_name || null;

        const newHub = {
          ...h,
          lat: lat === null ? null : Number(lat),
          lon: lon === null ? null : Number(lon),
          country_code: country_code || null,
          country_name: country_name || null,
          geocode_source: 'nominatim'
        };
        enriched.push(newHub);

        sqlLines.push(
          `UPDATE hubs SET lat = ${lat !== null ? lat : 'NULL'}, lon = ${lon !== null ? lon : 'NULL'}, country_code = ${country_code ? `'${country_code.replace(/'/g, "''")}'` : 'NULL'}, country_name = ${country_name ? `'${country_name.replace(/'/g, "''")}'` : 'NULL'}, updated_at = now() WHERE id = '${h.id}';`
        );
      } else {
        // No geocode result
        enriched.push({ ...h, lat: h.lat || null, lon: h.lon || null, country_code: h.country_code || null, geocode_source: 'none' });
        sqlLines.push(`-- NO GEOCODE: ${h.id} (${h.name || h.city || ''})`);
      }
    }

    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(enriched, null, 2), 'utf-8');
    fs.writeFileSync(OUTPUT_SQL, sqlLines.join('\n'), 'utf-8');

    console.log('Done. Wrote:', OUTPUT_JSON);
    console.log('Done. Wrote:', OUTPUT_SQL);
    console.log('Review the SQL before applying to your DB. Example preview:');
    console.log('--- SQL SAMPLE ---');
    console.log(sqlLines.slice(0, 6).join('\n'));
    console.log('------------------');
  } catch (err) {
    console.error('Fatal error:', err && err.stack ? err.stack : err);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}