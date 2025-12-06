/**
 * generate-migrated-users.js
 *
 * Copy or create public/exports/migrated-users.json from a source file.
 *
 * Usage:
 *  node scripts/generate-migrated-users.js            // tries common source locations
 *  node scripts/generate-migrated-users.js src/path.json // specify explicit source
 *
 * Purpose:
 * - Quickly ensure public/exports/migrated-users.json exists for local dev.
 * - Helpful when other tooling produces the migration JSON in a different folder.
 *
 * Notes:
 * - Uses only Node built-ins (fs, path).
 */

const fs = require('fs');
const path = require('path');

const DEST_DIR = path.resolve(process.cwd(), 'public', 'exports');
const DEST_PATH = path.join(DEST_DIR, 'migrated-users.json');

const argvSource = process.argv[2];

const candidateSources = argvSource ? [path.resolve(process.cwd(), argvSource)] : [
  path.resolve(process.cwd(), 'exports', 'migrated-users.json'),
  path.resolve(process.cwd(), 'exports', 'source-users.json'),
  path.resolve(process.cwd(), 'public', 'exports', 'migrated-users.json'),
  path.resolve(process.cwd(), 'exports', 'migrated-users.sample.json'),
  path.resolve(process.cwd(), 'exports', 'source-users.sample.json')
];

/**
 * findSource
 * @description Return first existing source file path or null.
 * @param {string[]} candidates
 * @returns {string|null}
 */
function findSource(candidates) {
  for (const c of candidates) {
    try {
      if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
    } catch (e) {
      // ignore
    }
  }
  return null;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyFile(src, dest) {
  const content = fs.readFileSync(src, 'utf8');
  // Validate JSON?
  try {
    JSON.parse(content);
  } catch (e) {
    console.error('Source file is not valid JSON:', src);
    process.exit(2);
  }
  ensureDir(path.dirname(dest));
  fs.writeFileSync(dest, content, 'utf8');
  console.log('Wrote migration file to:', dest);
}

function writeSample(dest) {
  const sample = {
    producedAt: new Date().toISOString(),
    users: [
      { id: 'sample-1', email: 'dev.user1@example.com', name: 'Dev UserOne', needsPasswordReset: false },
      { id: 'sample-2', email: 'dev.user2@example.com', name: 'Dev UserTwo', needsPasswordReset: true }
    ]
  };
  ensureDir(path.dirname(dest));
  fs.writeFileSync(dest, JSON.stringify(sample, null, 2), 'utf8');
  console.log('Wrote embedded sample to:', dest);
}

(function main() {
  const source = findSource(candidateSources);
  if (source) {
    console.log('Found source file:', source);
    copyFile(source, DEST_PATH);
    process.exit(0);
  }

  console.warn('No source file found in candidates:');
  candidateSources.forEach(c => console.warn(' -', c));
  console.log('Writing embedded sample to destination so your panel has data to use.');
  writeSample(DEST_PATH);
  process.exit(0);
})();