/**
 * src/data/worlds/index.ts
 *
 * Central entry for world manifests.
 *
 * Purpose:
 * - Expose the WorldManifest type used by per-world manifest files.
 * - Export the manifest map that references each world's manifest module.
 *
 * NOTE:
 * - Manifests must only contain paths to world-specific files (they must NOT embed datasets).
 * - This file intentionally stays small and type-focused so consumers can import the manifest map
 *   synchronously without pulling heavy world payloads.
 */

/**
 * WorldId
 * @description Simple alias for world identifier strings.
 */
export type WorldId = string;

/**
 * WorldManifest
 * @description Describes a world and the relative paths to its world-specific resources.
 *              Files MUST be paths (strings) referencing the real data modules; do not inline
 *              the actual file contents inside manifest files.
 */
export interface WorldManifest {
  id: WorldId;
  name?: string;
  files?: Record<string, string>; // resourceKey -> relative path
}

/**
 * Import concrete manifests
 * Each manifest file must only reference paths to the actual resource modules.
 */
import euroasia from './euroasia/manifest';
import american from './american/manifest';

/**
 * manifest
 * @description Registry of available world manifests keyed by world id.
 */
export const manifest: Record<string, WorldManifest> = {
  euroasia,
  american
};