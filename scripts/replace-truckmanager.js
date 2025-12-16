/**
 * replace-truckmanager.js
 *
 * File-level:
 * Small utility script to perform an exact, case-sensitive source replacement
 * of the phrase "Truck Manager" -> "Trucktopia" across project files under /src.
 *
 * Usage:
 *   node scripts/replace-truckmanager.js
 *
 * The script:
 * - Scans files under the 'src' directory for common text/code extensions.
 * - For each file containing the exact string "Truck Manager" (case-sensitive),
 *   creates a .bak backup of the original file, replaces all occurrences, and
 *   saves the updated file.
 *
 * Notes:
 * - This is a best-effort helper; please review changes before committing.
 * - If you prefer automatic commits, reply "Commit changes" and I will apply them.
 */

/**
 * @description Node built-ins used by the script
 */
const fs = require('fs');
const path = require('path');

/**
 * @description File extensions to scan for replacements
 */
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.html', '.css', '.txt']);

/**
 * @description The exact, case-sensitive target and replacement strings
 */
const TARGET = 'Truck Manager';
const REPLACEMENT = 'Trucktopia';

/**
 * @function walkDir
 * @description Recursively walk a directory and collect file paths.
 * @param {string} dir Directory to walk
 * @returns {string[]} Array of file paths
 */
function walkDir(dir) {
  const results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results.push(...walkDir(filePath));
    } else {
      results.push(filePath);
    }
  });
  return results;
}

/**
 * @function shouldProcess
 * @description Determine whether a file should be processed based on extension and path.
 * @param {string} filePath File path
 * @returns {boolean}
 */
function shouldProcess(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  // avoid node_modules, build, public, scripts (except this one) etc.
  const lower = filePath.toLowerCase();
  if (lower.includes('node_modules') || lower.includes('dist') || lower.includes('build') || lower.includes('.git')) return false;
  return EXTENSIONS.has(ext);
}

/**
 * @function replaceInFile
 * @description If the target string exists in file, create a .bak and replace all occurrences.
 * @param {string} filePath File path to update
 * @returns {boolean} true if file was modified
 */
function replaceInFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes(TARGET)) return false;
    const updated = content.split(TARGET).join(REPLACEMENT);
    // create backup
    fs.writeFileSync(`${filePath}.bak`, content, 'utf8');
    fs.writeFileSync(filePath, updated, 'utf8');
    return true;
  } catch (err) {
    console.error('Error processing', filePath, err);
    return false;
  }
}

/**
 * @description Main runner
 */
function main() {
  const baseDir = path.resolve(process.cwd(), 'src');
  if (!fs.existsSync(baseDir)) {
    console.error('src directory not found. Run this script from the project root.');
    process.exit(1);
  }

  const allFiles = walkDir(baseDir);
  const candidates = allFiles.filter(shouldProcess);

  const modified = [];
  for (const f of candidates) {
    const changed = replaceInFile(f);
    if (changed) modified.push(f);
  }

  if (modified.length === 0) {
    console.log('No occurrences of "', TARGET, '" found in scanned files.');
  } else {
    console.log('Replaced occurrences in', modified.length, 'file(s):');
    modified.forEach((m) => console.log(' -', m));
    console.log('\nBackups created with .bak extensions alongside each modified file.');
    console.log('Please review changes and commit them when ready.');
  }
}

main();