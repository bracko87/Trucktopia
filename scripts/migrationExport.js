/**
 * migrationExport.js
 *
 * Browser-side helper to export application storage (localStorage, optional sessionStorage,
 * and a simple IndexedDB probe) into a migration-payload.json suitable for importing into Supabase.
 *
 * Usage:
 * 1) Open your game/website in the browser (the origin that has your saved data).
 * 2) Open DevTools -> Console.
 * 3) Paste the entire content of this file into the console and press Enter.
 * 4) After the script registers, run:
 *      generateAndDownloadMigrationPayloadV2({ includeSession: false });
 *
 * Notes:
 * - This script is read-only and will only attempt to parse values. It tries to parse nested
 *   stringified JSON up to 3 times.
 * - If the app uses IndexedDB for state, use checkIndexedDB() to inspect databases.
 */

/**
 * normalizeValue
 * @description Try to parse nested JSON string values up to 3 times.
 * @param {string} raw raw value from storage
 * @returns {any} parsed value or original string if not parseable
 */
function normalizeValue(raw) {
  let parsed = raw;
  for (let i = 0; i < 3; i++) {
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        break;
      }
    } else {
      break;
    }
  }
  return parsed;
}

/**
 * uuidv4Fallback
 * @description Small UUIDv4 generator if crypto.randomUUID isn't available
 * @returns {string} uuid string
 */
function uuidv4Fallback() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * getUUID
 * @description Use crypto.randomUUID when available, else fallback
 * @returns {string} uuid string
 */
function getUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return uuidv4Fallback();
}

/**
 * listLocalStorageSample
 * @description Logs a small sample (first N keys + preview), used for debugging
 * @param {number} count how many keys to sample (default 20)
 */
function listLocalStorageSample(count = 20) {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length && keys.length < count; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      keys.push(k);
    }
    if (keys.length === 0) {
      console.log('No localStorage keys found for this origin.');
      return;
    }
    const sample = keys.map((k) => {
      const raw = localStorage.getItem(k);
      let parsed;
      try {
        parsed = normalizeValue(raw ?? '');
      } catch (err) {
        parsed = raw;
      }
      return { key: k, rawLength: raw ? raw.length : 0, type: typeof parsed, preview: typeof parsed === 'string' ? parsed.slice(0, 200) : parsed };
    });
    console.table(sample);
  } catch (err) {
    console.warn('Unable to sample localStorage:', err);
  }
}

/**
 * collectKeys
 * @description Collect keys from localStorage (prefixed-first strategy), with fallback to all keys.
 * @param {string[]|undefined} prefixes optional prefixes to prefer
 * @returns {string[]} keys to export
 */
function collectKeys(prefixes = ['tm_', 'tm_admin_', 'tm_user_state_', 'tm_user_', 'tm_game_', 'game_', 'app_']) {
  const allKeys = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) allKeys.push(k);
    }
  } catch (err) {
    console.warn('Unable to read localStorage keys:', err);
  }

  const matched = allKeys.filter((k) => prefixes.some((p) => k.startsWith(p)));
  if (matched.length > 0) {
    console.log(`Found ${matched.length} keys matching prefixes. Exporting them.`);
    return matched.sort();
  }

  // Fallback: export all keys
  if (allKeys.length > 0) {
    console.log(`No keys matched known prefixes. Exporting all ${allKeys.length} localStorage keys.`);
    return allKeys.sort();
  }

  console.log('No localStorage keys found.');
  return [];
}

/**
 * collectSessionKeys
 * @description Collect keys from sessionStorage (optional)
 * @returns {string[]} session keys
 */
function collectSessionKeys() {
  const keys = [];
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k) keys.push(k);
    }
  } catch (err) {
    console.warn('Unable to read sessionStorage keys:', err);
  }
  return keys.sort();
}

/**
 * checkIndexedDB
 * @description Try to list available IndexedDB databases (read-only). Returns Promise.
 * @returns {Promise<any[]>}
 */
async function checkIndexedDB() {
  if (typeof indexedDB === 'undefined') {
    console.log('IndexedDB not available in this environment.');
    return [];
  }
  try {
    if (typeof indexedDB.databases === 'function') {
      // Chrome and some browsers
      // @ts-ignore
      const dbs = await indexedDB.databases();
      console.log('IndexedDB databases discovered:', dbs);
      return dbs;
    } else {
      // Can't enumerate; just warn (we can still try to open known DB names if you know them)
      console.log('Your browser does not support indexedDB.databases(). If the app uses IndexedDB, we may need to export it manually by name.');
      return [];
    }
  } catch (err) {
    console.warn('Could not list IndexedDB databases:', err);
    return [];
  }
}

/**
 * buildMigrationItemsPayloadV2
 * @description Build an array of migration_items-style objects from provided keys.
 * @param {string[]} keys keys from localStorage to include
 * @param {boolean} includeSession include sessionStorage items as session:<key> entries
 * @returns {Array<any>}
 */
function buildMigrationItemsPayloadV2(keys = [], includeSession = false) {
  const out = [];
  keys.forEach((key) => {
    const raw = localStorage.getItem(key);
    if (raw === null) return;
    const item = normalizeValue(raw);
    out.push({
      id: getUUID(),
      migrated_collection_id: null,
      collection_name: key,
      item: item,
      inserted_at: new Date().toISOString(),
    });
  });

  if (includeSession) {
    collectSessionKeys().forEach((key) => {
      const raw = sessionStorage.getItem(key);
      if (raw === null) return;
      const item = normalizeValue(raw);
      out.push({
        id: getUUID(),
        migrated_collection_id: null,
        collection_name: `session:${key}`,
        item: item,
        inserted_at: new Date().toISOString(),
      });
    });
  }

  return out;
}

/**
 * downloadJSON
 * @description Download a JS object/array as a JSON file
 * @param {string} filename file name to download
 * @param {any} data object/array
 */
function downloadJSON(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * generateAndDownloadMigrationPayloadV2
 * @description Main entry: collect keys (prefixed-first fallback-to-all), build payload and download migration-payload.json
 * @param {Object} options options object:
 *   - includeSession (boolean) include sessionStorage items as session:<key> entries (default false)
 *   - prefixes (string[]) custom prefixes array (default common patterns)
 * @returns {Array<any>} generated payload
 */
function generateAndDownloadMigrationPayloadV2(options = { includeSession: false, prefixes: undefined }) {
  const prefixes = options.prefixes || undefined;
  const keys = collectKeys(prefixes);
  if (keys.length === 0) {
    console.log('No localStorage keys found. Checking sessionStorage next...');
    const sessionKeys = collectSessionKeys();
    if (sessionKeys.length === 0) {
      console.log('sessionStorage is also empty for this origin.');
      console.log('Possible reasons: you are not on the correct origin (subdomain/port), or the game stores state in IndexedDB (not localStorage).');
      return [];
    } else {
      console.log(`Found ${sessionKeys.length} sessionStorage keys. Exporting them as session:<key> entries.`);
      const payload = buildMigrationItemsPayloadV2([], true);
      downloadJSON('migration-payload.json', payload);
      return payload;
    }
  }

  const payload = buildMigrationItemsPayloadV2(keys, !!options.includeSession);
  console.log(`Built payload with ${payload.length} item(s). Downloading migration-payload.json ...`);
  downloadJSON('migration-payload.json', payload);
  return payload;
}

/**
 * Expose functions for console use
 */
window.listLocalStorageSample = listLocalStorageSample;
window.collectKeys = collectKeys;
window.collectSessionKeys = collectSessionKeys;
window.checkIndexedDB = checkIndexedDB;
window.generateAndDownloadMigrationPayloadV2 = generateAndDownloadMigrationPayloadV2;

console.log('migrationExport helper registered. Use generateAndDownloadMigrationPayloadV2({ includeSession: false }) to export.');