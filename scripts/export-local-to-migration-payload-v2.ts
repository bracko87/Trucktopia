/**
 * export-local-to-migration-payload-v2.ts
 *
 * Robust browser console helper to export localStorage/sessionStorage into a migration-payload.json
 * - Falls back to all keys if no known prefixes are found
 * - Attempts to JSON.parse nested stringified JSON values up to 3 times
 * - Optionally reads from sessionStorage and can list IndexedDB databases (read-only check)
 *
 * Usage:
 * 1. Open your game in the browser (the origin that holds your saved state).
 * 2. Open DevTools → Console.
 * 3. Paste the whole file content into the console and press Enter.
 * 4. Run generateAndDownloadMigrationPayloadV2() to export everything it finds.
 *
 * Safety:
 * - This only reads browser storage and triggers a file download. No network or server calls.
 * - The generated file is safe to inspect locally before you import it into Supabase.
 */

/**
 * normalizeValue
 * @description Try to parse nested JSON string values up to 3 times.
 * @param raw string raw value from storage
 * @returns parsed value or original string if not parseable
 */
function normalizeValue(raw: string) {
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
 * @returns uuid string
 */
function uuidv4Fallback() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * getUUID
 * @description Use crypto.randomUUID when available, else fallback
 * @returns uuid string
 */
function getUUID() {
  // @ts-ignore
  if (typeof window.crypto !== 'undefined' && typeof window.crypto.randomUUID === 'function') {
    // @ts-ignore
    return window.crypto.randomUUID();
  }
  return uuidv4Fallback();
}

/**
 * collectKeys
 * @description Collect keys from localStorage (prefixed-first strategy), with fallback to all keys.
 * @param prefixes optional array of prefixes to prefer (default includes tm_ and common patterns)
 * @returns array of keys to export
 */
function collectKeys(prefixes = ['tm_', 'tm_admin_', 'tm_user_state_', 'tm_user_', 'tm_game_']) {
  const allKeys: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) allKeys.push(k);
    }
  } catch (err) {
    console.warn('Unable to read localStorage keys (maybe access denied):', err);
  }

  const matched = allKeys.filter((k) => prefixes.some((p) => k.startsWith(p)));
  if (matched.length > 0) {
    console.log(`Found ${matched.length} keys matching prefixes. Exporting them.`);
    return matched.sort();
  }

  // Fallback: if no prefix matches, export all keys (if any)
  if (allKeys.length > 0) {
    console.log(`No keys matched known prefixes. Falling back to exporting all ${allKeys.length} localStorage keys.`);
    return allKeys.sort();
  }

  // No localStorage keys
  console.log('No localStorage keys found.');
  return [];
}

/**
 * collectSessionKeys
 * @description Collect keys from sessionStorage (for additional safety). Returns array.
 * @returns string[] session keys
 */
function collectSessionKeys() {
  const keys: string[] = [];
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k) keys.push(k);
    }
  } catch (err) {
    console.warn('Unable to read sessionStorage keys (maybe access denied):', err);
  }
  return keys.sort();
}

/**
 * buildMigrationItemsPayloadV2
 * @description Build an array of migration_items-style objects from provided keys.
 * @param keys keys from localStorage to include
 * @param includeSession boolean include sessionStorage keys as separate collection entries (default false)
 * @returns array suitable for migration-payload.json
 */
function buildMigrationItemsPayloadV2(keys: string[], includeSession = false) {
  const out: Array<any> = [];

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
 * @param filename file name to download
 * @param data object/array
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
 * listLocalStorageSample
 * @description Helpful debug: logs a small sample (first N keys + value length / parsed type)
 * @param count how many keys to sample (default 20)
 */
function listLocalStorageSample(count = 20) {
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
}

/**
 * checkIndexedDB
 * @description Try to list available IndexedDB databases (if supported) — read-only check.
 * @returns Promise resolving to array of DB names and objectStore names (best-effort)
 */
async function checkIndexedDB() {
  if (typeof indexedDB === 'undefined') {
    console.log('IndexedDB not available in this environment.');
    return [];
  }
  // indexedDB.databases() is not supported in all browsers (Chrome supports it)
  try {
    // @ts-ignore
    if (typeof indexedDB.databases === 'function') {
      // @ts-ignore
      const dbs = await indexedDB.databases();
      console.log('IndexedDB databases discovered:', dbs);
      return dbs;
    }
  } catch (err) {
    console.warn('Could not list IndexedDB databases (browser may not support indexedDB.databases()).', err);
  }

  // Fallback: attempt to open a couple known database names (cannot enumerate). Return empty.
  console.log('Could not enumerate IndexedDB databases. If game uses IndexedDB, you may need a separate export approach.');
  return [];
}

/**
 * generateAndDownloadMigrationPayloadV2
 * @description Main entry: collect keys (prefixed-first fallback-to-all), build payload and download migration-payload.json
 * @param options options object:
 *    - includeSession (boolean) include sessionStorage items as session:<key> entries (default false)
 *    - prefixes (string[]) custom prefixes array (default common tm_ patterns)
 */
function generateAndDownloadMigrationPayloadV2(options = { includeSession: false, prefixes: undefined }) {
  const prefixes = options.prefixes || undefined;
  const keys = collectKeys(prefixes);
  if (keys.length === 0) {
    // No localStorage keys. We'll also try sessionStorage, and then stop.
    console.log('No localStorage keys found. Checking sessionStorage next...');
    const sessionKeys = collectSessionKeys();
    if (sessionKeys.length === 0) {
      console.log('sessionStorage is also empty for this origin.');
      console.log('Possible reasons: you are not on the correct origin (subdomain/port), or the game stores state in IndexedDB (not localStorage).');
      console.log('Run listLocalStorageSample() and checkIndexedDB() for more diagnostics.');
      return [];
    } else {
      console.log(`Found ${sessionKeys.length} sessionStorage keys. Exporting them as session:<key> entries.`);
      const payload = buildMigrationItemsPayloadV2([], true);
      downloadJSON('migration-payload-session.json', payload);
      return payload;
    }
  }

  // Build payload and download
  const payload = buildMigrationItemsPayloadV2(keys, !!options.includeSession);
  console.log(`Built payload with ${payload.length} migration item(s). Downloading migration-payload.json ...`);
  downloadJSON('migration-payload.json', payload);
  return payload;
}

/**
 * COPY THIS (paste into your browser console)
 *
 * // Minimal quick checks:
 * listLocalStorageSample(30); // shows up to 30 keys + small preview
 * Object.keys(localStorage).length; // quick count
 * Object.keys(sessionStorage).length; // session count
 * checkIndexedDB(); // async - lists DBs in supported browsers
 *
 * // To export:
 * generateAndDownloadMigrationPayloadV2({ includeSession: false });
 *
 * // If nothing exports, try including session:
 * generateAndDownloadMigrationPayloadV2({ includeSession: true });
 *
 * Notes:
 * - Run these ON THE SAME ORIGIN your game runs on (same protocol+host+port).
 * - If you use a local dev URL different from the Supabase preview domain, open the correct one before running the script.
 */
console.log('Export helper loaded: run listLocalStorageSample(), checkIndexedDB(), or generateAndDownloadMigrationPayloadV2() now.');