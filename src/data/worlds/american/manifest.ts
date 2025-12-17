/**
 * src/data/worlds/american/manifest.ts
 *
 * American world manifest.
 *
 * Purpose:
 * - Provide only relative paths to world-specific resource modules.
 * - If American reuses the same shared files, point to the same locations.
 */

import type { WorldManifest } from "../index";

const manifest: WorldManifest = {
  id: "american",
  name: "American Default World",
  files: {
    trucks: "../../trucks.ts",
    trailers: "../../trailers.ts",
    cities: "../../cities.ts",
    driverSkills: "../../driverSkills.ts",
    hubLevels: "../../hubLevels.ts",
    engines: "../../game-rules-engines.ts",

    trailerAdditions: "../../trailer-additions.ts",
    trailerAvailability: "../../trailer-availability.ts",
    trailerCleanup: "../../trailer-cleanup.ts",
  }
};

export default manifest;