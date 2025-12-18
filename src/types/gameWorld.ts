/**
 * gameWorld.ts
 *
 * Single-world shim utilities.
 *
 * Purpose:
 * - After switching to a single-world architecture we keep a tiny shim so other
 *   modules that import these helpers keep functioning without world-specific behaviour.
 */

/**
 * GameWorldConfig
 * @description Minimal typed shape for world-like config (kept for compatibility).
 */
export interface GameWorldConfig {
  id: string;
  name?: string;
  enabled?: boolean;
  [key: string]: any;
}

/**
 * GAME_WORLDS
 * @description Single default manifest kept for compatibility.
 */
export const GAME_WORLDS: Record<string, GameWorldConfig> = {
  default: {
    id: 'default',
    name: 'Default',
    enabled: true
  }
};

/**
 * getCurrentWorld
 * @description Returns the single world id used by the app. No-op shim.
 */
export function getCurrentWorld(): string {
  return 'default';
}

/**
 * setCurrentWorld
 * @description No-op setter kept for compatibility with existing imports.
 */
export function setCurrentWorld(_: string): void {
  // intentionally no-op in single-world mode
}

/**
 * getWorldConfig
 * @description Returns the default world configuration.
 */
export function getWorldConfig(): GameWorldConfig {
  return GAME_WORLDS.default;
}