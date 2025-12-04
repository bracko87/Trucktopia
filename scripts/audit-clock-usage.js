/**
 * scripts/audit-clock-usage.js
 *
 * Simple audit script to locate usage of the central game clock and related
 * ticker APIs across the `src/` tree.
 *
 * Responsibilities:
 * - Walk the src directory recursively and inspect .ts/.tsx/.js/.jsx files.
 * - Search for common clock/ticker API usages and setInterval usage.
 * - Produce a summary and detailed per-file listing.
 * - Identify candidate engine files (paths containing "engine", "engines", "Engine", or under src/engines)
 *   that do NOT reference any of the known clock APIs (these are prioritized for fixes).
 *
 * Usage:
 *   node scripts/audit-clock-usage.js
 *
 * Output:
 *   - Writes a human readable report to scripts/audit-clock-report.txt
 *   - Also prints basic status to stdout
 *
 * Note:
 * - This script intentionally uses only Node built-in modules so it runs without extra dependencies.
 */

const fs = require('fs');
const path = require('path');

/**
 * Root directory to scan (relative to project root)
 */
const SRC_DIR = path.join(__dirname, '..', 'src');

/**
 * File extensions to include
 */
const INCLUDE_EXT = ['.ts', '.tsx', '.js', '.jsx'];

/**
 * Patterns to search for in files (key -> RegExp)
 */
const PATTERNS = {
  'nowUtcMs() / nowUtcMs': /\bnowUtcMs\s*\(/g,
  'GAME_CLOCK_EVENT': /\bGAME_CLOCK_EVENT\b/g,
  'gameClock:updated event': /gameClock:updated/g,
  'subscribe(gameClock) / subscribe(': /\bsubscribe\s*\(/g,
  'createClockTicker': /\bcreateClockTicker\s*\(/g,
  'ClockTicker type/name': /\bClockTicker\b/g,
  'startClock(': /\bstartClock\s*\(/g,
  'stopClock(': /\bstopClock\s*\(/g,
  'setSpeed(': /\bsetSpeed\s*\(/g,
  'advanceGameMs(': /\badvanceGameMs\s*\(/g,
  'setGameNowMs(': /\bsetGameNowMs\s*\(/g,
  'setGameOffsetMs(': /\bsetGameOffsetMs\s*\(/g,
  'setInterval(': /\bsetInterval\s*\(/g,
  'Engine starter import': /EngineStarter|startDriverEngine|startStaffConditionEngine|startStaffConditionEngine/gi,
  'clock utils import': /from\s+['"].*gameClock['"]/g
};

/**
 * Report path
 */
const REPORT_PATH = path.join(__dirname, 'audit-clock-report.txt');

/**
 * Recursively walk directory and return file paths
 * @param {string} dir
 * @returns {string[]}
 */
function walk(dir) {
  const results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  list.forEach((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // skip node_modules or obvious large folders
      if (entry.name === 'node_modules' || entry.name === '.git') return;
      results.push(...walk(full));
    } else if (entry.isFile()) {
      if (INCLUDE_EXT.includes(path.extname(entry.name))) {
        results.push(full);
      }
    }
  });
  return results;
}

/**
 * Read a file safely
 * @param {string} file
 * @returns {string|null}
 */
function readFileSafe(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (err) {
    return null;
  }
}

/**
 * Main audit
 */
function runAudit() {
  const files = [];
  try {
    if (!fs.existsSync(SRC_DIR)) {
      console.error(`Source directory not found: ${SRC_DIR}`);
      process.exitCode = 1;
      return;
    }
    files.push(...walk(SRC_DIR));
  } catch (err) {
    console.error('Failed to walk src directory', err);
    process.exitCode = 1;
    return;
  }

  const fileReports = [];
  const patternCounts = {};
  Object.keys(PATTERNS).forEach((k) => (patternCounts[k] = 0));

  const engineCandidates = [];
  const engineNoClock = [];

  files.forEach((file) => {
    const rel = path.relative(path.join(__dirname, '..'), file);
    const content = readFileSafe(file);
    if (content === null) return;

    const matches = {};
    let matchedAny = false;
    Object.entries(PATTERNS).forEach(([key, re]) => {
      const res = content.match(re);
      if (res && res.length > 0) {
        matches[key] = res.length;
        patternCounts[key] += res.length;
        matchedAny = true;
      }
    });

    // Detect engine-like files (path/name)
    const lower = file.toLowerCase();
    const isEngineFile = lower.includes(`${path.sep}engines${path.sep}`) || /engine/.test(path.basename(file).toLowerCase()) || lower.includes(`${path.sep}engine`) || /starter/.test(path.basename(file).toLowerCase());

    if (isEngineFile) {
      engineCandidates.push(rel);
      if (!matchedAny) {
        engineNoClock.push(rel);
      }
    }

    // also mark files that mention setInterval extensively (could be self-timers)
    const setIntervalMatches = content.match(/\bsetInterval\s*\(/g) || [];

    fileReports.push({
      file: rel,
      patterns: matches,
      setIntervalCount: setIntervalMatches.length
    });
  });

  // Build report text
  const lines = [];
  lines.push('Game Clock Usage Audit Report');
  lines.push('Generated at: ' + new Date().toISOString());
  lines.push('');
  lines.push(`Scanned files: ${files.length}`);
  lines.push('');
  lines.push('Pattern summary (total occurrences across project):');
  Object.entries(patternCounts).forEach(([k, v]) => {
    lines.push(`  - ${k}: ${v}`);
  });
  lines.push('');
  lines.push('Top findings:');
  lines.push(`  - Engine-like files found: ${engineCandidates.length}`);
  lines.push(`  - Engine-like files WITHOUT any known clock/ticker pattern: ${engineNoClock.length}`);
  lines.push('');
  lines.push('Files with relevant patterns (brief):');
  fileReports
    .filter((r) => Object.keys(r.patterns).length > 0)
    .sort((a, b) => {
      // sort by total matches desc
      const aCount = Object.values(a.patterns).reduce((s, n) => s + n, 0);
      const bCount = Object.values(b.patterns).reduce((s, n) => s + n, 0);
      return bCount - aCount;
    })
    .forEach((r) => {
      const total = Object.values(r.patterns).reduce((s, n) => s + n, 0);
      lines.push(`- ${r.file} — total matches: ${total}, setInterval() calls: ${r.setIntervalCount}`);
      Object.entries(r.patterns).forEach(([k, v]) => {
        lines.push(`    • ${k}: ${v}`);
      });
    });

  lines.push('');
  lines.push('Engine-like files that appear to NOT reference clock APIs (candidates to migrate):');
  if (engineNoClock.length === 0) {
    lines.push('  - <none found>');
  } else {
    engineNoClock.forEach((f) => lines.push('  - ' + f));
  }
  lines.push('');
  lines.push('Notes & Recommendations:');
  lines.push('  - Files that already reference createClockTicker / subscribe / GAME_CLOCK_EVENT are likely clock-aware.');
  lines.push('  - Files that use setInterval directly (and are engine-like) should be considered for migration to ClockTicker or subscribe(gameClock) so they follow authoritative game-time and react to speed/offset/absolute overrides.');
  lines.push('  - I recommend prioritising converting the engine-like files listed above to use the central clock subscription (either subscribe() or createClockTicker).');
  lines.push('');
  lines.push('End of report.');

  try {
    fs.writeFileSync(REPORT_PATH, lines.join('\n'), 'utf8');
    console.log(`Audit complete. Report written to: ${REPORT_PATH}`);
  } catch (err) {
    console.error('Failed to write report', err);
  }
}

runAudit();