/**
 * src/config/world.ts
 *
 * World manifest loader and helper utilities.
 *
 * Responsibilities:
 * - Provide a typed interface for world manifests.
 * - Expose an async loader (loadWorldManifest) which dynamically imports the
 *   correct manifest based on process.env.WORLD.
 * - Expose a synchronous helper (getBuildWorld) that returns the build-time world
 *   slug (useful in places where you only need the slug).
 *
 * Notes:
 * - We intentionally use dynamic imports so the manifest is only loaded when requested.
 * - When using separate Netlify sites with different WORLD env vars, the runtime build
 *   will load the appropriate manifest. You can extend the WorldManifest interface
 *   with more precise types for countries/trucks/seeders later.
 */

/**
 * WorldManifest
 * @description Minimal typed shape for a world manifest. Extend as needed.
 */
export interface WorldManifest {
  /** Human readable name (e.g. "Euro-Asia") */
  name: string;
  /** Short slug used across the repo (e.g. "euroasia", "american") */
  slug: string;
  /** Optional list of country codes included in this world (can be empty or full objects) */
  countries?: string[] | any[];
  /** Optional list of seeders, datasets or other world-specific modules */
  seeders?: string[] | any[];
  /** Optional path under public/ or CDN where world assets are located */
  assetsPath?: string;
  /** Additional arbitrary metadata allowed */
  [key: string]: any;
}

/**
 * getBuildWorld
 * @description Returns the build-time WORLD environment variable or the default 'euroasia'.
 *              Useful for conditional non-async usage.
 * @returns string
 */
export function getBuildWorld(): string {
  return (process.env.WORLD || 'euroasia').toString();
}

/**
 * loadWorldManifest
 * @description Dynamically import the manifest for the current build WORLD.
 *              Uses dynamic import paths with explicit cases so tooling is explicit.
 * @returns Promise<WorldManifest>
 */
export async function loadWorldManifest(): Promise<WorldManifest> {
  const WORLD = getBuildWorld();

  switch (WORLD) {
    case 'american':
      return (await import('../data/worlds/american/manifest')).default as WorldManifest;
    case 'euroasia':
    default:
      return (await import('../data/worlds/euroasia/manifest')).default as WorldManifest;
  }
}