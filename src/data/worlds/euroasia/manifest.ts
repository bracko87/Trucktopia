/**
 * src/data/worlds/euroasia/manifest.ts
 *
 * Euro-Asia world manifest.
 *
 * Purpose:
 * - Provide only relative paths to world-specific resource modules.
 * - Do NOT include the dataset contents here — only paths.
 */

import type { WorldManifest } from "../index";

const manifest: WorldManifest = {
  id: "euroasia",
  name: "Euro-Asia Default World",
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