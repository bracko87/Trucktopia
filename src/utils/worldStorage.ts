/**
 * World-aware storage utilities
 * Ensures complete data isolation between game worlds
 */

import { getCurrentWorld } from '../types/gameWorld';

/**
 * Generate world-specific storage key
 */
export function getWorldStorageKey(baseKey: string, userEmail?: string): string {
  const worldId = getCurrentWorld();
  const userSuffix = userEmail ? `_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
  return `tm_${worldId}_${baseKey}${userSuffix}`;
}

/**
 * World-specific storage setter
 */
export function setWorldItem(baseKey: string, data: any, userEmail?: string): boolean {
  try {
    const key = getWorldStorageKey(baseKey, userEmail);
    const stringValue = JSON.stringify(data);
    localStorage.setItem(key, stringValue);
    return true;
  } catch (error) {
    console.warn(`Failed to store ${baseKey} for world ${getCurrentWorld()}:`, error);
    return false;
  }
}

/**
 * World-specific storage getter
 */
export function getWorldItem(baseKey: string, userEmail?: string): any {
  try {
    const key = getWorldStorageKey(baseKey, userEmail);
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.warn(`Failed to get ${baseKey} for world ${getCurrentWorld()}:`, error);
    return null;
  }
}

/**
 * Clear all data for current world (useful for testing)
 */
export function clearCurrentWorldData(): void {
  const worldId = getCurrentWorld();
  const keysToRemove: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(`tm_${worldId}_`)) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
  console.log(`Cleared ${keysToRemove.length} items for world ${worldId}`);
}

/**
 * Check if user has data in specific world
 */
export function hasWorldData(worldId: string, userEmail: string): boolean {
  const testKey = `tm_${worldId}_user_profile_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
  return localStorage.getItem(testKey) !== null;
}