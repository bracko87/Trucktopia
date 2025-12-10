/**
 * scripts/audit-world-imports.ts
 *
 * Audit script to find world-specific imports and heavy data files in the repository.
 *
 * Responsibilities:
 * - Walk the repository (excluding node_modules, .git, dist, build) and scan .ts/.tsx/.js/.jsx/.json files.
 * - Collect import/require/dynamic-import specifiers.
 * - Flag imports and files that match world-related keywords (trucks, trailers, cities, distances, hub, seeders, assets/worlds, manifest).
 * - Detect heavy data files under src/data (size threshold configurable).
 * - Produce a JSON report at scripts/audit-world-imports-report.json and print a short summary to console.
 *
 * Notes:
 * - This file is written as an ESM-compatible TypeScript script. It uses import.meta.url to compute __dirname.
 * - Run via: npx ts-node scripts/audit-world-imports.ts
 *   or: npx tsc scripts/audit-world-imports.ts --outDir dist && node dist/scripts/audit-world-imports.js
 */

/**
 * Module imports
 * @remarks use Node ESM imports and derive __dirname from import.meta.url
 */
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import { statSync } from 'fs';

/**
 * ESM replacements for __filename and __dirname
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Report types
 */
/**
 * AuditImport
 * @description Details of a single import found in a file
 */
interface AuditImport {
  specifier: string;
  line: number;
  type: 'import' | 'require' | 'dynamic-import';
}

/**
 * FileReport
 * @description Audit report for a single file
 */
interface FileReport {
  filePath: string;
  sizeBytes?: number;
  heavy?: boolean;
  imports: AuditImport[];
  matchedKeywords: string[]; // world keywords found in specifiers or content
}

/**
 * AuditReport
 * @description Full audit output
 */
interface AuditReport {
  generatedAt: string;
  repoRoot: string;
  scannedFiles: number;
  matchedFiles: number;
  heavyFiles: number;
  files: FileReport[];
  config: {
    heavyFileThresholdBytes: number;
    fileExtensions: string[];
    excludeDirs: string[];
    worldKeywords: string[];
  };
}

/**
 * Config defaults
 */
const HEAVY_FILE_THRESHOLD_BYTES = 50 * 1024; // 50 KB
const FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json'];
const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build', 'out', '.next'];
const WORLD_KEYWORDS = [
  'truck',
  'trucks',
  'trailer',
  'trailers',
  'cities',
  'city',
  'distance',
  'distances',
  'hub',
  'hubs',
  'seed',
  'seeders',
  'manifest',
  'worlds',
  'assets/worlds',
  'cargo',
  'payload'
];

/**
 * isExcludedDir
 * @description Determine whether a directory should be skipped
 * @param dirName string
 * @returns boolean
 */
function isExcludedDir(dirName: string) {
  return EXCLUDE_DIRS.some((ex) => dirName === ex);
}

/**
 * readDirRecursive
 * @description Recursively walk a directory and yield file paths
 * @param dir string
 * @returns Promise<string[]>
 */
async function readDirRecursive(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    // Skip excluded directories
    if (entry.isDirectory() && isExcludedDir(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      try {
        const nested = await readDirRecursive(fullPath);
        files.push(...nested);
      } catch {
        // ignore directories we can't read
      }
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * extractImportsFromContent
 * @description Find import/require/dynamic-import specifiers and their line numbers
 * @param content string
 * @returns AuditImport[]
 */
function extractImportsFromContent(content: string): AuditImport[] {
  const imports: AuditImport[] = [];
  const lines = content.split(/\r?\n/);

  const importRegex = /\bimport\s+(?:[\s\S]+?\s+from\s+)?['"]([^'"]+)['"]/; // matches import ... from 'x' or import 'x'
  const dynamicImportRegex = /import\(\s*['"]([^'"]+)['"]\s*\)/;
  const requireRegex = /\brequire\(\s*['"]([^'"]+)['"]\s*\)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    let m = importRegex.exec(line);
    if (m) {
      imports.push({ specifier: m[1], line: i + 1, type: 'import' });
      continue;
    }

    m = dynamicImportRegex.exec(line);
    if (m) {
      imports.push({ specifier: m[1], line: i + 1, type: 'dynamic-import' });
      continue;
    }

    m = requireRegex.exec(line);
    if (m) {
      imports.push({ specifier: m[1], line: i + 1, type: 'require' });
      continue;
    }
  }

  return imports;
}

/**
 * contentMatchesKeywords
 * @description Check whether a string contains any world-related keywords
 * @param input string
 * @returns string[] found keywords (lowercased)
 */
function contentMatchesKeywords(input: string): string[] {
  const found = new Set<string>();
  const lower = input.toLowerCase();
  for (const kw of WORLD_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) found.add(kw.toLowerCase());
  }
  return Array.from(found);
}

/**
 * isCandidateExtension
 * @description Check file extension to decide whether to scan content
 * @param filePath string
 * @returns boolean
 */
function isCandidateExtension(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  return FILE_EXTENSIONS.includes(ext);
}

/**
 * inspectFile
 * @description Inspect a single file: read contents, extract imports, detect keywords and heavy size
 * @param filePath string
 * @returns Promise<FileReport | null> - null if not a candidate file
 */
async function inspectFile(filePath: string): Promise<FileReport | null> {
  if (!isCandidateExtension(filePath)) return null;

  let content: string;
  try {
    content = await fs.readFile(filePath, 'utf8');
  } catch {
    return null; // skip unreadable files
  }

  const imports = extractImportsFromContent(content);
  const matchedKeywordsFromContent = contentMatchesKeywords(content);

  // Also check specifiers for keywords
  const matchedKeywordsFromImports = new Set<string>();
  for (const imp of imports) {
    const matched = contentMatchesKeywords(imp.specifier);
    for (const k of matched) matchedKeywordsFromImports.add(k);
  }

  const matchedKeywords = Array.from(new Set([...matchedKeywordsFromContent, ...Array.from(matchedKeywordsFromImports)]));

  // Stat file for size (only for files under src/data consider heavy)
  let sizeBytes: number | undefined;
  let heavy = false;
  try {
    const st = statSync(filePath);
    sizeBytes = st.size;
    // Mark heavy files inside src/data or that match explicit keywords
    if ((filePath.includes(`${path.sep}src${path.sep}data${path.sep}`) || matchedKeywords.length > 0) && sizeBytes >= HEAVY_FILE_THRESHOLD_BYTES) {
      heavy = true;
    }
  } catch {
    // ignore stat errors
  }

  // If no imports and no keywords and not heavy, skip
  if (imports.length === 0 && matchedKeywords.length === 0 && !heavy) return null;

  const report: FileReport = {
    filePath: path.relative(process.cwd(), filePath),
    sizeBytes,
    heavy,
    imports,
    matchedKeywords
  };

  return report;
}

/**
 * runAudit
 * @description Main function to run the audit and write report
 */
async function runAudit() {
  const repoRoot = path.resolve(__dirname, '..'); // assume script in scripts/
  const scanRoot = path.resolve(repoRoot); // scan from repo root
  console.log(`Starting world-imports audit from: ${scanRoot}`);
  const allFiles = await readDirRecursive(scanRoot);

  const filesToInspect = allFiles.filter((f) => {
    // quick filter: skip files in excluded directories
    const rel = path.relative(scanRoot, f);
    const segments = rel.split(path.sep);
    if (segments.some((s) => EXCLUDE_DIRS.includes(s))) return false;
    return isCandidateExtension(f);
  });

  let scannedFiles = 0;
  const fileReports: FileReport[] = [];
  for (const file of filesToInspect) {
    scannedFiles++;
    try {
      const r = await inspectFile(file);
      if (r) fileReports.push(r);
    } catch (err) {
      // ignore single file errors but log them
      // eslint-disable-next-line no-console
      console.error(`Failed to inspect ${file}:`, (err as Error).message);
    }
  }

  const matchedFiles = fileReports.length;
  const heavyFiles = fileReports.filter((f) => f.heavy).length;

  const report: AuditReport = {
    generatedAt: new Date().toISOString(),
    repoRoot: scanRoot,
    scannedFiles,
    matchedFiles,
    heavyFiles,
    files: fileReports,
    config: {
      heavyFileThresholdBytes: HEAVY_FILE_THRESHOLD_BYTES,
      fileExtensions: FILE_EXTENSIONS,
      excludeDirs: EXCLUDE_DIRS,
      worldKeywords: WORLD_KEYWORDS
    }
  };

  const outPath = path.join(__dirname, 'audit-world-imports-report.json');
  try {
    await fs.writeFile(outPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(`Report written to: ${outPath}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to write report:', (err as Error).message);
  }

  // Print concise summary
  console.log('--- Audit Summary ---');
  console.log(`Scanned files: ${scannedFiles}`);
  console.log(`Files with world keywords/imports: ${matchedFiles}`);
  console.log(`Heavy files detected: ${heavyFiles}`);
  console.log('Top matched files (first 30):');
  fileReports.slice(0, 30).forEach((f) => {
    console.log(`- ${f.filePath} ${f.heavy ? '(HEAVY)' : ''} keywords: [${f.matchedKeywords.join(', ')}] imports: ${f.imports.length}`);
  });

  // Exit code: 0 always (non-destructive). CI can inspect JSON if needed.
}

if (import.meta.url.endsWith('.ts') || import.meta.url.endsWith('.js')) {
  // Execute when run directly
  runAudit().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Audit failed:', (err as Error).message);
    process.exit(1);
  });
}
