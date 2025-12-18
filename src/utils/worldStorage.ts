/**
 * worldStorage.ts
 *
 * Single-world storage utilities.
 *
 * Responsibilities:
 * - Provide simple storage helpers that are NOT world-scoped (single-world).
 * - This simplifies migration away from multi-world keys.
 */

/**
 * Generate a storage key for the app. Single-world mode: no world prefix.
 * @param baseKey base key name
 * @param userEmail optional user email suffix
 * @returns string storage key
 */
export function getWorldStorageKey(baseKey: string, userEmail?: string): string {
  const userSuffix = userEmail ? `_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
  return `tm_${baseKey}${userSuffix}`;
}

/**
 * setWorldItem
 * @description Store JSON-serializable data under a key.
 * @param baseKey base key
 * @param data data to store
 * @param userEmail optional user email for per-user storage
 * @returns boolean success
 */
export function setWorldItem(baseKey: string, data: any, userEmail?: string): boolean {
  try {
    const key = getWorldStorageKey(baseKey, userEmail);
    const stringValue = JSON.stringify(data);
    localStorage.setItem(key, stringValue);
    return true;
  } catch (error) {
    console.warn(`Failed to store ${baseKey}:`, error);
    return false;
  }
}

/**
 * getWorldItem
 * @description Retrieve stored JSON data or null.
 * @param baseKey base key
 * @param userEmail optional user email
 */
export function getWorldItem(baseKey: string, userEmail?: string): any {
  try {
    const key = getWorldStorageKey(baseKey, userEmail);
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.warn(`Failed to get ${baseKey}:`, error);
    return null;
  }
}

/**
 * clearCurrentWorldData
 * @description Clear all tm_ prefixed keys for this app (single-world).
 */
export function clearCurrentWorldData(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('tm_')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
  console.log(`Cleared ${keysToRemove.length} items from localStorage (single-world)`);
}

/**
 * hasWorldData
 * @description Check if a per-user key exists.
 * @param baseKey string
 * @param userEmail string
 * @returns boolean
 */
export function hasWorldData(baseKey: string, userEmail: string): boolean {
  const key = getWorldStorageKey(baseKey, userEmail);
  return localStorage.getItem(key) !== null;
}