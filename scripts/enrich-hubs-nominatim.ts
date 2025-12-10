/**
 * enrich-hubs-nominatim.ts
 *
 * Read a normalized hubs JSON file named "hubs.normalized.json" (array of hubs),
 * query OpenStreetMap Nominatim for coordinates and country code for each hub (city+country),
 * and emit:
 *  - hubs.enriched.json  (full enriched objects)
 *  - hubs_update.sql     (idempotent UPDATE statements to apply to your DB)
 *
 * IMPORTANT:
 * - Respect Nominatim usage policy: 1 request per second and provide contact info.
 * - Set EMAIL and USER_AGENT below before running.
 *
 * Usage:
 * 1) Place your hubs.normalized.json in the project root (an array of objects, each with a stable id)
 * 2) Run with Node 18+ (which includes global fetch):
 *      node --enable-source-maps scripts/enrich-hubs-nominatim.ts
 *    Or compile with tsc then run node:
 *      npx tsc scripts/enrich-hubs-nominatim.ts && node dist/scripts/enrich-hubs-nominatim.js
 *
 * File-level comments: This script is intended as a one-off migration helper and outputs
 * SQL statements suitable for manual review and execution on your Postgres instance.
 */

/**
 * @fileoverview Enrich hubs using OpenStreetMap Nominatim (TypeScript Node script).
 */

import { promises as fs } from 'fs';
import path from 'path';

/**
 * Declare fetch in case TypeScript/Node environment does not implicitly include DOM types.
 * Node 18+ exposes global fetch. If your Node doesn't provide fetch, run this on Node 18+
 * or a runtime that provides fetch.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
declare const fetch: any;

/** Configuration - CHANGE THESE BEFORE RUNNING */
const INPUT_FILE = path.resolve(process.cwd(), 'hubs.normalized.json'); // input (array)
const OUTPUT_JSON = path.resolve(process.cwd(), 'hubs.enriched.json'); // enriched output
const OUTPUT_SQL = path.resolve(process.cwd(), 'hubs_update.sql'); // SQL updates
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const EMAIL = 'you@example.com'; // <-- Replace with your real contact email
const USER_AGENT = 'YourProjectName-Migration/1.0 (+https://yourdomain.example)'; // <-- Replace

/**
 * sleep
 * @description Sleep for specified milliseconds
 * @param ms milliseconds to wait
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * sqlEscape
 * @description Escape single quotes for SQL text fields
 * @param s input string
 * @returns escaped string wrapped in single quotes
 */
function sqlEscape(s: string | null | undefined): string {
  if (s == null) return 'NULL';
  return `'${String(s).replace(/'/g, "''")}'`;
}

/**
 * queryNominatim
 * @description Query Nominatim for the given query string (q) and return first result or null
 * @param q free-text query like "Herceg Novi, Montenegro"
 */
async function queryNominatim(q: string): Promise<any | null> {
  if (typeof fetch !== 'function') {
    throw new Error('Global fetch not available in this Node runtime. Use Node 18+ or a runtime that provides fetch.');
  }

  const params = new URLSearchParams({
    q,
    format: 'json',
    addressdetails: '1',
    limit: '1',
  });

  const url = `${NOMINATIM_URL}?${params.toString()}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept-Language': 'en',
      'From': EMAIL,
    },
  });

  if (!res.ok) {
    throw new Error(`Nominatim returned ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  return data[0];
}

/**
 * enrichHub
 * @description Attempt to geocode a hub and return enriched hub object + SQL update string
 * @param hub input hub object (must include id)
 */
async function enrichHub(hub: any): Promise<{ enriched: any; sql: string }> {
  // Clone to avoid mutating original object in memory unexpectedly
  const base = { ...hub };

  // Compose query: prefer "city, country_name", fallback to name/other fields
  const parts: string[] = [];
  if (base.city) parts.push(String(base.city));
  if (base.country_name) parts.push(String(base.country_name));
  if (parts.length === 0 && base.name) parts.push(String(base.name));
  const q = parts.join(', ') || String(base.id);

  let result = null;
  let lat: number | null = base.lat ?? null;
  let lon: number | null = base.lon ?? null;
  let country_code: string | null = base.country_code ?? null;
  let country_name: string | null = base.country_name ?? null;
  let geocode_source: string | null = null;

  try {
    result = await queryNominatim(q);
    // polite pause will be handled by caller loop
  } catch (err) {
    // network/response error — keep existing values and mark geocode failed
    geocode_source = `error:${String((err && err.message) || err)}`;
  }

  if (result) {
    lat = result.lat ? parseFloat(result.lat) : lat;
    lon = result.lon ? parseFloat(result.lon) : lon;
    const addr = result.address ?? {};
    country_code = addr.country_code ? String(addr.country_code).toLowerCase() : country_code;
    country_name = addr.country ?? country_name;
    geocode_source = 'nominatim';
  } else if (geocode_source == null) {
    geocode_source = 'none';
  }

  const enriched = {
    ...base,
    lat: lat ?? null,
    lon: lon ?? null,
    country_code: country_code ?? null,
    country_name: country_name ?? null,
    geocode_source,
  };

  // Prepare idempotent UPDATE SQL for Postgres (only sets lat/lon/country fields and updated_at)
  // We make SQL conservative — only overwrite lat/lon/country_name/country_code
  const sql = `UPDATE hubs
SET
  lat = ${lat !== null ? lat : 'NULL'},
  lon = ${lon !== null ? lon : 'NULL'},
  country_code = ${sqlEscape(country_code)},
  country_name = ${sqlEscape(country_name)},
  updated_at = now()
WHERE id = '${String(base.id)}';`;

  return { enriched, sql };
}

/**
 * main
 * @description Entry point: read input JSON, enrich items, and write outputs
 */
async function main(): Promise<void> {
  try {
    // Validate config
    if (EMAIL === 'you@example.com' || USER_AGENT.includes('YourProjectName')) {
      console.warn('Please set EMAIL and USER_AGENT constants in the script to meaningful values before running (Nominatim usage policy).');
    }

    // Read input
    const exists = await fs.stat(INPUT_FILE).then(() => true).catch(() => false);
    if (!exists) {
      console.error(`Input file not found: ${INPUT_FILE}`);
      process.exitCode = 2;
      return;
    }

    const raw = await fs.readFile(INPUT_FILE, 'utf-8');
    let hubs: any[];
    try {
      hubs = JSON.parse(raw);
      if (!Array.isArray(hubs)) throw new Error('Expected an array of hubs as input.');
    } catch (err) {
      console.error('Failed to parse input JSON:', err);
      process.exitCode = 2;
      return;
    }

    const enrichedList: any[] = [];
    const sqlStatements: string[] = [];
    console.log(`Enriching ${hubs.length} hub(s). This will respect 1 request/sec politeness to Nominatim.`);

    for (let i = 0; i < hubs.length; i++) {
      const hub = hubs[i];
      const id = hub.id ?? hub._id ?? hub.uid ?? `hub-${i}`;
      if (!hub.id) hub.id = id; // ensure id exists for SQL matching

      process.stdout.write(`(${i + 1}/${hubs.length}) ${hub.name ?? hub.city ?? id} ... `);

      try {
        const { enriched, sql } = await enrichHub(hub);
        enrichedList.push(enriched);
        sqlStatements.push(sql);
        process.stdout.write(`done [${enriched.geocode_source}]\n`);
      } catch (err) {
        // on error produce conservative record and continue
        enrichedList.push({ ...hub, geocode_source: `error:${String(err && err.message)}` });
        sqlStatements.push(`-- Error enriching hub id=${hub.id}: ${String(err && err.message)}`);
        process.stdout.write(`error\n`);
      }

      // Sleep ~1100ms between requests to respect rate limit
      await sleep(1100);
    }

    // Write outputs
    await fs.writeFile(OUTPUT_JSON, JSON.stringify(enrichedList, null, 2), 'utf-8');
    await fs.writeFile(OUTPUT_SQL, sqlStatements.join('\n\n'), 'utf-8');
    console.log('Wrote enriched JSON ->', OUTPUT_JSON);
    console.log('Wrote SQL update file ->', OUTPUT_SQL);
    console.log('Review SQL before applying to your DB. The statements are idempotent updates keyed by hub id.');
  } catch (err) {
    console.error('Fatal error during enrichment:', err);
    process.exitCode = 1;
  }
}

/* Run main if script executed directly */
if (require.main === module) {
  main();
}