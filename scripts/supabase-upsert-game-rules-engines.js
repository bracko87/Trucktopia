/**
 * supabase-upsert-game-rules-engines.js
 *
 * Simple Node script (uses fetch) to upsert the manifest into Supabase via REST (PostgREST).
 *
 * Usage:
 *   - Set environment variables:
 *       SUPABASE_URL=https://your-project.supabase.co
 *       SUPABASE_ANON_KEY=eyA...
 *   - Run:
 *       node scripts/supabase-upsert-game-rules-engines.js
 *
 * Notes:
 * - This script expects three tables in your Supabase/Postgres schema:
 *     game_rules (id TEXT PRIMARY KEY, name TEXT, description TEXT, category TEXT, status TEXT, version TEXT, last_modified TIMESTAMP, author TEXT, code_paths JSONB, notes TEXT, metadata JSONB)
 *     engines (id TEXT PRIMARY KEY, name TEXT, description TEXT, path TEXT, tags TEXT[], mount_status TEXT, status TEXT, version TEXT, last_modified TIMESTAMP, author TEXT, notes TEXT, metadata JSONB)
 *     cron_jobs (id TEXT PRIMARY KEY, name TEXT, description TEXT, path TEXT, schedule TEXT, trigger TEXT, status TEXT, last_modified TIMESTAMP, author TEXT, notes TEXT, metadata JSONB)
 *
 * - The script uses the Supabase REST endpoint (/rest/v1/<table>) and the 'on_conflict' query param to upsert by id.
 * - Adjust table/column names as needed to match your DB schema.
 */

/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');

/**
 * @description Reads manifest from src/data/game-rules-engines.ts (compiled JSON export).
 * Since that file is TypeScript exporting a JS object, we also provide a JSON copy here by requiring the TS file via ts-node is not assumed.
 * To keep things simple, we'll require a generated JSON representation. If you prefer, convert the TS manifest to JSON first.
 */
(async () => {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL || '';
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
      process.exit(1);
    }

    // Load the manifest JS/TS file by path: we will import the JS-compiled manifest if present.
    // Fallback: try loading a JSON file next to the TS file (game-rules-engines.json)
    const manifestPathJson = path.join(__dirname, '..', 'src', 'data', 'game-rules-engines.json');
    const manifestPathTs = path.join(__dirname, '..', 'src', 'data', 'game-rules-engines.ts');

    let manifest;
    if (fs.existsSync(manifestPathJson)) {
      manifest = JSON.parse(fs.readFileSync(manifestPathJson, 'utf8'));
    } else if (fs.existsSync(manifestPathTs)) {
      // naive parse: read file and eval manifest export (not safe for untrusted code).
      // The TS file exports `export const manifest = {...}` — we extract the object literal.
      const raw = fs.readFileSync(manifestPathTs, 'utf8');
      const start = raw.indexOf('export const manifest');
      if (start === -1) throw new Error('manifest export not found in TS file; please produce a JSON file at src/data/game-rules-engines.json or adjust this script.');
      // As a safe alternative, ask user to create a JSON file; here we throw instructive error.
      throw new Error('Please create src/data/game-rules-engines.json (JSON) derived from the TS manifest so this script can import it. For now the script aborts to avoid unsafe eval.');
    } else {
      throw new Error('Manifest not found. Please create src/data/game-rules-engines.json from the TypeScript manifest before running this script.');
    }

    // Helper for REST calls
    async function supabaseUpsert(table, items) {
      if (!Array.isArray(items) || items.length === 0) {
        console.log(`Skipping ${table}: no items.`);
        return;
      }
      const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${table}?on_conflict=id`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        },
        body: JSON.stringify(items)
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed upsert ${table}: ${res.status} ${res.statusText} - ${text}`);
      }
      const data = await res.json();
      console.log(`Upserted ${data.length} rows into ${table}`);
      return data;
    }

    // Perform upserts for each table
    console.log('Starting upsert to Supabase...');

    await supabaseUpsert('game_rules', manifest.gameRules.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      category: r.category || null,
      status: r.status,
      version: r.version || null,
      last_modified: r.lastModified || null,
      author: r.author || null,
      code_paths: r.codePaths || null,
      notes: r.notes || null,
      metadata: r.metadata || null
    })));

    await supabaseUpsert('engines', manifest.engines.map(e => ({
      id: e.id,
      name: e.name,
      description: e.description,
      path: e.path || null,
      tags: e.tags || null,
      mount_status: e.mountStatus || null,
      status: e.status || null,
      version: e.version || null,
      last_modified: e.lastModified || null,
      author: e.author || null,
      notes: e.notes || null,
      metadata: e.metadata || null
    })));

    await supabaseUpsert('cron_jobs', manifest.cronJobs.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description,
      path: c.path || null,
      schedule: c.schedule || null,
      trigger: c.trigger || null,
      status: c.status || null,
      last_modified: c.lastModified || null,
      author: c.author || null,
      notes: c.notes || null,
      metadata: c.metadata || null
    })));

    console.log('All done. Review Supabase tables to validate data.');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();