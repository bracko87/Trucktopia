/**
 * selectedHubStorage.ts
 *
 * Small helper to persist the user's preferred selected hub per-company into localStorage.
 * Persistence is intentionally simple (localStorage) and scoped by company id so different
 * companies/users don't conflict on a single browser.
 *
 * Exports:
 * - readSelectedHub(companyId): returns string | null
 * - writeSelectedHub(companyId, hubId): void
 */

/**
 * readSelectedHub
 * @description Read the selected hub id string from localStorage for the given companyId.
 * @param companyId string
 * @returns string | null
 */
export function readSelectedHub(companyId: string): string | null {
  if (!companyId) return null;
  try {
    const key = `tm_selected_hub_${companyId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return raw;
  } catch {
    return null;
  }
}

/**
 * writeSelectedHub
 * @description Persist the selected hub id string to localStorage for the given companyId.
 * @param companyId string
 * @param hubId string | null
 */
export function writeSelectedHub(companyId: string, hubId: string | null) {
  if (!companyId) return;
  try {
    const key = `tm_selected_hub_${companyId}`;
    if (!hubId) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, hubId);
    }
  } catch {
    // ignore storage errors
  }
}