// scripts/generate-world-shim-suggestions.ts

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// --- ESM __dirname replacement ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Paths ---
const REPORT_PATH = path.join(process.cwd(), "scripts", "audit-world-imports-report.json");
const OUTPUT_DIR = path.join(process.cwd(), "scripts", "suggested-shims");
const WORLDS_DIR = path.join(process.cwd(), "src", "data", "worlds");

function safeMkdir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadReport() {
  if (!fs.existsSync(REPORT_PATH)) {
    console.error("ERROR: audit-world-imports-report.json not found.");
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(REPORT_PATH, "utf8"));
}

function findHeavyFiles(report: any) {
  const arr: Array<{ path: string; size: number }> = [];

  if (Array.isArray(report.files)) {
    for (const f of report.files) {
      if (!f.path) continue;
      arr.push({ path: f.path, size: f.size || 0 });
    }
  }

  arr.sort((a, b) => b.size - a.size);

  return arr.slice(0, 8);
}

function writeShimSuggestions(report: any) {
  safeMkdir(OUTPUT_DIR);

  const heavy = findHeavyFiles(report);

  const output = {
    scannedFiles: report.scannedFiles,
    heavyFiles: heavy,
    worldRelevantFiles: report.topMatchedFiles || [],
  };

  fs.writeFileSync(
    path.join(OUTPUT_DIR, "shim-suggestions.json"),
    JSON.stringify(output, null, 2),
    "utf8"
  );
}

function createWorldGettersScaffold() {
  safeMkdir(WORLDS_DIR);

  const indexPath = path.join(WORLDS_DIR, "index.ts");

  if (fs.existsSync(indexPath)) {
    console.log("World getter file already exists, skipping.");
    return;
  }

  const content = `
// Auto-generated world loader scaffold

export type WorldId = string;

export interface WorldManifest {
  id: WorldId;
  name?: string;
  files?: Record<string, string>;
}

export const manifest: Record<string, WorldManifest> = {
  "euroasia": { id: "euroasia", name: "Euro-Asia Default World" }
};

export async function loadWorldResource(resource: string, world?: WorldId): Promise<any> {
  const active = world ||
    (typeof process !== "undefined" && process.env.TM_CURRENT_WORLD) ||
    "euroasia";

  const entry = manifest[active];
  if (!entry || !entry.files || !entry.files[resource]) {
    throw new Error("World resource not found: " + resource);
  }

  const mod = await import(entry.files[resource]);
  return mod.default ?? mod;
}
`;

  fs.writeFileSync(indexPath, content, "utf8");
  console.log("Created src/data/worlds/index.ts");
}

function main() {
  console.log("Loading audit report…");

  const report = loadReport();
  writeShimSuggestions(report);
  createWorldGettersScaffold();

  console.log("Done.\nShim suggestions written to scripts/suggested-shims/");
}

main();
