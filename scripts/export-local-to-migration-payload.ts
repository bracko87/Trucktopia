/**
 * export-local-to-migration-payload.ts
 *
 * Browser helper to export relevant localStorage items into a migration_items-style JSON array.
 *
 * Usage:
 * 1. Open your game in the browser where local storage contains the data.
 * 2. Open DevTools → Console.
 * 3. Copy & paste the code from the "COPY THIS" block (below) OR use an equivalently built snippet produced by calling
 *    generateAndDownloadMigrationPayload() in the console.
 *
 * What it produces:
 * - downloads migration-payload.json, an array of objects shaped as small migration_items rows:
 *   { id, migrated_collection_id, collection_name, item, inserted_at }
 *
 * Notes:
 * - Uses crypto.randomUUID() in modern browsers to generate UUIDs. Falls back to a JS UUID generator when unavailable.
 * - The script normalizes values that are stringified JSON (attempts to JSON.parse up to 3 times).
 * - By default it collects localStorage keys that start with 'tm_' or 'tm_admin_' or 'tm_user_state_'.
 */

/**
 * normalizeValue
 * @description Attempt to parse nested stringified JSON values up to 3 times so exported items are real objects/arrays when possible.
 * @param raw any raw value from localStorage (string)
 * @returns parsed value (object/array/primitive)
 */
function normalizeValue(raw: string): any {
  let parsed: any = raw;
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
 * @description Simple UUID v4 fallback for environments where crypto.randomUUID is not available.
 * @returns uuid string
 */
function uuidv4Fallback(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    // eslint-disable-next-line no-mixed-operators
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * getUUID
 * @description Return a UUID using the browser's crypto.randomUUID if available, else fallback.
 * @returns uuid string
 */
function getUUID(): string {
  if (typeof (window as any).crypto !== 'undefined' && typeof (window as any).crypto.randomUUID === 'function') {
    return (window as any).crypto.randomUUID();
  }
  return uuidv4Fallback();
}

/**
 * collectLocalStorageKeys
 * @description Return keys we want to export. Adjust prefixes array if your app uses other key patterns.
 * @returns string[] keys to export
 */
function collectLocalStorageKeys(): string[] {
  const prefixes = ['tm_', 'tm_admin_', 'tm_user_state_', 'tm_user_', 'tm_game_']; // add more if needed
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    if (prefixes.some((p) => k.startsWith(p))) keys.push(k);
  }
  return keys.sort();
}

/**
 * buildMigrationItemsPayload
 * @description Build an array suitable for importing into migration_items table
 * @param keys optional list of keys (if omitted uses collectLocalStorageKeys)
 * @returns array of migration item objects
 */
function buildMigrationItemsPayload(keys?: string[]) {
  const useKeys = keys && keys.length ? keys : collectLocalStorageKeys();
  const out: Array<any> = [];

  useKeys.forEach((key) => {
    const raw = localStorage.getItem(key);
    if (raw === null) return;
    const item = normalizeValue(raw);
    out.push({
      id: getUUID(), // will be used as migration_items.id
      migrated_collection_id: null,
      collection_name: key, // place the localStorage key here - makes it easy to identify later
      item: item,
      inserted_at: new Date().toISOString()
    });
  });

  return out;
}

/**
 * downloadJSON
 * @description Trigger download of payload as a JSON file
 * @param filename file name to download
 * @param data JS object/array to serialize
 */
function downloadJSON(filename: string, data: any) {
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
 * generateAndDownloadMigrationPayload
 * @description Orchestrates payload creation and downloads migration-payload.json
 * @param whitelist optional list of localStorage keys to include (otherwise uses prefixes)
 */
export function generateAndDownloadMigrationPayload(whitelist?: string[]) {
  const payload = buildMigrationItemsPayload(whitelist);
  console.log('Exporting', payload.length, 'localStorage item(s) to migration-payload.json');
  downloadJSON('migration-payload.json', payload);
  return payload;
}

/**
 * COPY THIS (paste into your browser console)
 *
 * (function () {
 *   // If your console environment supports modules, you can import; otherwise just paste the function body above and call:
 *   const payload = (window as any).generateAndDownloadMigrationPayload ? (window as any).generateAndDownloadMigrationPayload() : (function() {
 *     // Minimal inline call if you pasted entire file into console — build & download:
 *     return (function buildAndDownload(){ const p = (window as any).buildMigrationItemsPayload ? (window as any).buildMigrationItemsPayload() : []; const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'migration-payload.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); return p; })();
 *   })();
 *   console.log('Done. Payload length:', payload.length);
 * })();
 *
 * Or, if you paste this file as-is into the console and run:
 *   generateAndDownloadMigrationPayload();
 *
 */