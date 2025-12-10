/**
 * export-hub-locations-dev.js
 *
 * Dev-console helper to extract hub / city-like objects from the running app's
 * client state and download them as JSON and CSV ready for a hub_locations
 * migration. Paste into the browser console while your app is running in dev.
 *
 * Responsibilities:
 * - Try multiple ways to access client game state (window helpers, common globals)
 * - Recursively scan the object graph to find arrays that look like hub/city lists
 * - Normalize fields into a stable export shape:
 *     { source_id, name, country, country_code, region, min_hub_level, max_hub_level, buildable, lat, lon, data }
 * - Trigger JSON and CSV downloads and attempt to copy JSON to clipboard
 *
 * Usage:
 * - Open the app in dev > open browser console > paste entire file > call `exportHubLocationsDev()`.
 *
 * Safety:
 * - Read-only: this script only reads memory from the running page.
 * - Uses shallow heuristics; inspect exported rows for accuracy and rerun with mapping tweaks if needed.
 */

/**
 * Helper: run the export process
 * @returns {Promise<void>}
 */
async function exportHubLocationsDev() {
  try {
    const state = detectGameState();
    if (!state) {
      console.warn('No game state found on window. Ensure ExposeGameState or a global store is mounted.');
      console.info('Common keys checked: __getGameState, __getCompany, __GAME_STATE__, __EXPOSED_GAME_STATE__, gameState, appState, store');
      return;
    }

    const candidates = findHubLikeArrays(state);
    if (!candidates || candidates.length === 0) {
      console.warn('No hub-like arrays found inside detected state. You may need to expose game state to window or run from a page that has hubs loaded.');
      return;
    }

    // Merge candidate arrays (dedupe by source_id or name)
    const merged = mergeCandidates(candidates);

    // Normalize and enrich rows
    const normalized = merged.map(normalizeEntry).filter(Boolean);

    if (normalized.length === 0) {
      console.warn('No normalized rows produced. Inspect a sample of the merged candidate objects:', merged.slice(0, 5));
      return;
    }

    // Create JSON and CSV and trigger downloads
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const jsonName = `hub_locations_export_${timestamp}.json`;
    const csvName = `hub_locations_export_${timestamp}.csv`;
    downloadAsFile(JSON.stringify(normalized, null, 2), jsonName, 'application/json');
    downloadAsFile(makeCsv(normalized), csvName, 'text/csv');

    // Try to copy JSON to clipboard (best-effort)
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(JSON.stringify(normalized, null, 2));
        console.log('JSON copied to clipboard (large payloads may be truncated by your browser).');
      } else {
        console.info('Clipboard API unavailable - JSON download created instead.');
      }
    } catch (err) {
      console.info('Could not copy to clipboard:', err);
    }

    console.log(`Export complete — ${normalized.length} rows. Files downloaded: ${jsonName}, ${csvName}`);
    console.log('Sample row:', normalized[0]);
  } catch (err) {
    console.error('exportHubLocationsDev failed', err);
  }
}

/**
 * Attempt to detect game state using several heuristics and common helpers.
 * Returns the most promising object (game state or root store) or null.
 */
function detectGameState() {
  // 1) Known explicit helpers exposed by ExposeGameState
  if (typeof window !== 'undefined') {
    // __getGameState is a function that returns latest snapshot
    if (typeof window.__getGameState === 'function') {
      try {
        const s = window.__getGameState();
        if (s) return s;
      } catch (e) {
        // ignore
      }
    }

    // __getCompany helper
    if (typeof window.__getCompany === 'function') {
      try {
        const c = window.__getCompany();
        if (c) return { company: c };
      } catch (e) {}
    }

    // Common global keys
    const keysToCheck = ['__GAME_STATE__', '__EXPOSED_GAME_STATE__', 'gameState', 'appState', 'state', 'store'];
    for (const k of keysToCheck) {
      // try direct property
      if (k in window) {
        try {
          const v = window[k];
          if (v) return v;
        } catch {}
      }
    }

    // If there's a global store with getState (Redux-like)
    for (const k of Object.keys(window)) {
      try {
        const val = window[k];
        if (val && typeof val.getState === 'function') {
          try {
            const st = val.getState();
            if (st) return st;
          } catch {}
        }
      } catch {}
    }
  }
  return null;
}

/**
 * Recursively search for arrays that look like hub-like lists.
 * Heuristic: arrays of objects where items contain >=2 of the hub-related keys.
 * @param root any
 * @returns {Array<any[]>} list of arrays found
 */
function findHubLikeArrays(root) {
  const results = [];
  const seen = new WeakSet();
  const maxNodes = 20000; // safety guard
  let nodeCount = 0;

  const hubKeys = [
    'source_id', 'sourceId', 'source', 'name', 'city', 'country', 'country_code', 'countryCode',
    'lat', 'lon', 'latitude', 'longitude', 'location_id', 'locationId', 'id'
  ];

  function scoreObject(obj) {
    if (!obj || typeof obj !== 'object') return 0;
    let score = 0;
    for (const k of Object.keys(obj)) {
      if (hubKeys.includes(k)) score++;
    }
    return score;
  }

  function visit(obj) {
    if (nodeCount++ > maxNodes) return;
    if (!obj || typeof obj !== 'object') return;
    if (seen.has(obj)) return;
    seen.add(obj);

    // If it's an array, check if it contains hub-like objects
    if (Array.isArray(obj) && obj.length > 0) {
      const sample = obj.slice(0, Math.min(10, obj.length));
      let matches = 0;
      for (const item of sample) {
        if (item && typeof item === 'object') {
          if (scoreObject(item) >= 2) matches++;
        }
      }
      // If majority of sample items score >= 2, treat as candidate
      if (matches >= Math.ceil(sample.length / 2)) {
        results.push(obj);
      }
      // Recurse into array items too
      for (const it of obj) {
        visit(it);
      }
      return;
    }

    // Recurse into object properties
    try {
      for (const k of Object.keys(obj)) {
        try {
          visit(obj[k]);
        } catch {}
      }
    } catch {}
  }

  visit(root);
  return results;
}

/**
 * Merge arrays of candidate hub-like objects into single deduped list.
 * Deduplicate by source_id, then by name.
 * @param {Array<any[]>} arrays
 * @returns {any[]}
 */
function mergeCandidates(arrays) {
  const mapBySource = new Map();
  const mapByName = new Map();
  const merged = [];

  arrays.forEach((arr) => {
    arr.forEach((item) => {
      if (!item || typeof item !== 'object') return;
      const sid = normalizeString(item.source_id ?? item.sourceId ?? item.source ?? item.id ?? item._id ?? null);
      const name = normalizeString(item.name ?? item.city ?? item.label ?? null);

      if (sid) {
        if (!mapBySource.has(sid)) {
          mapBySource.set(sid, item);
        } else {
          // merge shallowly (prefer fields from existing)
          mapBySource.set(sid, { ...item, ...mapBySource.get(sid) });
        }
      } else if (name) {
        if (!mapByName.has(name)) {
          mapByName.set(name, item);
        } else {
          mapByName.set(name, { ...item, ...mapByName.get(name) });
        }
      } else {
        merged.push(item);
      }
    });
  });

  // Push source-id entries first, then name-based, then generic entries
  for (const v of mapBySource.values()) merged.push(v);
  for (const v of mapByName.values()) merged.push(v);
  return merged;
}

/**
 * Normalize a single raw entry to the target hub_locations shape.
 * @param {any} raw
 * @returns {object|null}
 */
function normalizeEntry(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const source_id = raw.source_id ?? raw.sourceId ?? raw.source ?? raw.id ?? raw._id ?? null;
  // For cases where source_id is numeric nested (e.g., {source: {id: '...'}}), try exploring
  const nestedSource = (typeof source_id === 'object' && source_id !== null) ? (source_id.id ?? source_id.sourceId ?? null) : null;
  const finalSourceId = nestedSource ?? source_id;

  const name = raw.name ?? raw.city ?? raw.label ?? (typeof raw.location === 'string' ? raw.location : null) ?? null;
  const country = raw.country ?? raw.country_name ?? raw.countryName ?? raw.countryCode ? undefined : undefined;
  const country_code = raw.country_code ?? raw.countryCode ?? raw.country ?? raw.country_name ?? null;

  // Lat/lon tolerant parsing
  const lat = coerceNumber(raw.lat ?? raw.latitude ?? raw.coords?.lat ?? raw.position?.lat ?? raw.location?.lat ?? raw.geo?.lat ?? raw.location_lat ?? null);
  const lon = coerceNumber(raw.lon ?? raw.longitude ?? raw.coords?.lon ?? raw.position?.lng ?? raw.position?.lon ?? raw.location?.lon ?? raw.geo?.lon ?? raw.location_lon ?? null);

  // Some apps store coords as [lon,lat] or [lat,lon]
  if ((lat == null || lon == null) && Array.isArray(raw.coords) && raw.coords.length >= 2) {
    const a = raw.coords;
    // guess: if values are usual lon/lat ranges
    if (Math.abs(a[0]) <= 180 && Math.abs(a[1]) <= 90) {
      // assume [lon, lat]
      return buildEntry(finalSourceId, name, country, country_code, { lat: coerceNumber(a[1]), lon: coerceNumber(a[0]) }, raw);
    } else if (Math.abs(a[0]) <= 90 && Math.abs(a[1]) <= 180) {
      return buildEntry(finalSourceId, name, country, country_code, { lat: coerceNumber(a[0]), lon: coerceNumber(a[1]) }, raw);
    }
  }

  return buildEntry(finalSourceId, name, country, country_code, { lat, lon }, raw);
}

/**
 * Build the final exported shape, filling sensible defaults.
 */
function buildEntry(sourceId, name, country, country_code, coords, raw) {
  const row = {
    source_id: sourceId ? String(sourceId) : null,
    name: name ?? (raw?.city ?? raw?.label ?? null),
    country: (raw?.country_name ?? raw?.country ?? null) || null,
    country_code: country_code ?? (typeof raw?.country === 'string' && raw.country.length === 2 ? raw.country : null),
    region: raw?.region ?? 'euro-asia',
    min_hub_level: raw?.min_hub_level ?? raw?.minLevel ?? 1,
    max_hub_level: raw?.max_hub_level ?? raw?.maxLevel ?? 10,
    buildable: raw?.buildable ?? true,
    lat: coords.lat ?? null,
    lon: coords.lon ?? null,
    data: scrubLarge(raw)
  };

  // If both name and either source_id or coords are missing, drop it (not actionable)
  if (!row.name || (!row.source_id && (row.lat == null || row.lon == null))) {
    // still return if name+country exists; caller can inspect
    // but for migration we prefer rows with either source_id or coords
    // return null to drop
    // However we will keep name+country rows (useful as minimal seeds)
    if (!row.source_id && (row.lat == null || row.lon == null)) {
      // keep minimal entry but warn
      console.warn('Weak row (no source_id and no coords) - keeping as minimal:', { name: row.name, country: row.country });
    }
  }

  return row;
}

/**
 * Utility: coerce numeric value from string/number or null
 */
function coerceNumber(v) {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Utility: normalize string or return null
 */
function normalizeString(v) {
  if (!v && v !== 0) return null;
  return String(v).trim();
}

/**
 * Scrub large circular / heavy fields from raw object and keep a small data payload.
 * This avoids embedding entire app state into the export.
 */
function scrubLarge(obj) {
  const seen = new WeakSet();
  function clean(v, depth = 0) {
    if (v == null) return v;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v;
    if (depth > 3) return '[Truncated]';
    if (typeof v === 'object') {
      if (seen.has(v)) return '[Circular]';
      seen.add(v);
      if (Array.isArray(v)) {
        return v.slice(0, 5).map((it) => clean(it, depth + 1));
      } else {
        const out = {};
        for (const k of Object.keys(v)) {
          // Skip very large known keys
          if (['parent', 'children', 'dom', 'el', '__proto__'].includes(k)) continue;
          try {
            out[k] = clean(v[k], depth + 1);
          } catch {
            out[k] = '[Error]';
          }
        }
        return out;
      }
    }
    return String(v);
  }
  try {
    return clean(obj, 0);
  } catch {
    return {};
  }
}

/**
 * Make CSV from normalized rows. Simple and safe: quotes fields and escapes quotes.
 */
function makeCsv(rows) {
  if (!rows || rows.length === 0) return '';
  const headers = ['source_id', 'name', 'country', 'country_code', 'region', 'min_hub_level', 'max_hub_level', 'buildable', 'lat', 'lon', 'data'];
  const esc = (v) => {
    if (v == null) return '';
    const s = typeof v === 'string' ? v : (typeof v === 'object' ? JSON.stringify(v) : String(v));
    return `"${s.replace(/"/g, '""')}"`;
  };
  const lines = [headers.join(',')];
  for (const r of rows) {
    const row = headers.map((h) => esc(r[h]));
    lines.push(row.join(','));
  }
  return lines.join('\n');
}

/**
 * Trigger browser download of a blob
 */
function downloadAsFile(content, filename, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Remove a few extremely large fields from raw object so exported JSON stays focused.
 */
function scrubLargeFields(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const copy = { ...obj };
  delete copy.largeBlob;
  delete copy.image;
  delete copy.html;
  return copy;
}

/**
 * Utility: shallow scrub used in buildEntry
 */
function scrub(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return scrubLarge(obj);
  }
}

/**
 * Exported to window for convenience in console
 */
window.exportHubLocationsDev = exportHubLocationsDev;

// Inform the user how to run
console.info('export-hub-locations-dev.js loaded. Run exportHubLocationsDev() to extract hub-like data.');