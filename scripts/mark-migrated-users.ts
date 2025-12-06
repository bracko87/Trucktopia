/**
 * scripts/mark-migrated-users.ts
 *
 * Node helper: read a migration source JSON (exports/source-users.json or migration-payload-full.json)
 * and produce exports/migrated-users.json where each user is annotated with:
 *   needsPasswordReset: true  // when password is empty or missing
 *
 * Usage:
 *   npx tsx scripts/mark-migrated-users.ts
 *   npx tsx scripts/mark-migrated-users.ts path/to/source.json
 *
 * This script is intentionally simple and writes a compact safe JSON file that the client
 * can later consume to install migration metadata into localStorage.
 */

import fs from 'fs/promises';
import path from 'path';
import process from 'process';

type RawUser = {
  id?: string;
  email?: string | null;
  password?: string | null;
  [key: string]: any;
};

const DEFAULT_CANDIDATES = [
  path.resolve('exports', 'source-users.json'),
  path.resolve('migration-payload-full.json'),
  path.resolve('exports', 'migration-payload-full.json'),
];

function pickSource(provided?: string): string | null {
  if (provided) {
    const resolved = path.resolve(provided);
    return resolved;
  }
  for (const p of DEFAULT_CANDIDATES) {
    try {
      // we'll check existence async later; return candidate to be validated
      return p;
    } catch {
      // continue
    }
  }
  return null;
}

/**
 * normalizeEmail
 * @description Normalize a value into an email-like lowercase string or null
 */
function normalizeEmail(v: any): string | null {
  if (!v) return null;
  const s = String(v).trim().toLowerCase();
  if (s === '' || s === 'null' || s === 'undefined') return null;
  return s;
}

/**
 * main
 * @description Read source JSON, produce migrated users file in exports/migrated-users.json
 */
async function main() {
  try {
    const arg = process.argv[2];
    const candidate = pickSource(arg);
    if (!candidate) {
      console.error('No source candidates available. Provide a path or place exports/source-users.json or migration-payload-full.json in repo root.');
      process.exit(2);
    }

    let srcPath = candidate;
    // If candidate is a directory-called path that doesn't exist, try to find any existing candidate
    if (!(await exists(srcPath))) {
      // attempt to find the first existing from list
      let found: string | null = null;
      for (const p of DEFAULT_CANDIDATES) {
        if (await exists(p)) {
          found = p;
          break;
        }
      }
      if (!found) {
        console.error('No source file found. Searched:\n', DEFAULT_CANDIDATES.join('\n'));
        process.exit(2);
      }
      srcPath = found;
    }

    console.log('[mark] Using source file:', srcPath);
    const raw = await fs.readFile(srcPath, 'utf-8');
    const json = JSON.parse(raw);

    // Try to extract an array of users from a few shapes
    let users: RawUser[] = [];
    if (Array.isArray(json)) users = json;
    else if (Array.isArray(json.users)) users = json.users;
    else {
      // shallow search for array-like shape
      for (const k of Object.keys(json)) {
        if (Array.isArray((json as any)[k]) && ((json as any)[k].length === 0 || typeof (json as any)[k][0] === 'object')) {
          users = (json as any)[k];
          break;
        }
      }
    }

    if (!Array.isArray(users)) {
      console.error('Source JSON did not contain a users array; aborting.');
      process.exit(2);
    }

    const migrated = users.map((u) => {
      const email = normalizeEmail(u.email ?? u.email_address ?? u.id);
      const hasPassword = typeof u.password === 'string' && u.password.trim() !== '';
      const needsPasswordReset = !hasPassword;
      return {
        id: u.id ?? email ?? null,
        email,
        // Keep other minimal metadata for reference but avoid copying large payloads
        name: (u as any).name ?? null,
        needsPasswordReset,
      };
    });

    const outDir = path.resolve('exports');
    await fs.mkdir(outDir, { recursive: true });
    const outPath = path.resolve(outDir, 'migrated-users.json');
    await fs.writeFile(outPath, JSON.stringify({ producedAt: new Date().toISOString(), users: migrated }, null, 2), 'utf-8');
    console.log(`[mark] Wrote ${migrated.length} migrated users to ${outPath}`);
    console.log('[mark] Example entries:');
    console.log(migrated.slice(0, 10));
    process.exit(0);
  } catch (err: any) {
    console.error('[mark] Fatal error:', err?.message ?? err);
    process.exit(1);
  }
}

async function exists(fp: string) {
  try {
    await fs.access(fp);
    return true;
  } catch {
    return false;
  }
}

main();