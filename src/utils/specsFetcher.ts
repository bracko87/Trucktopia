/**
 * specsFetcher.ts
 *
 * Fetch and normalize vehicle/trailer technical specifications.
 *
 * Responsibilities:
 * - Prefer runtime Supabase lookup (public.vehicles) using /.netlify/functions/supabase-config.
 * - Fall back to the existing dynamic local imports when Supabase is unavailable or row missing.
 * - Provide a small in-memory + optional localStorage cache with TTL to avoid repeated requests.
 *
 * Notes:
 * - This file contains safe runtime fetches only; no secrets are embedded in the bundle.
 * - All public functions are documented with JSDoc.
 */

/**
 * VehicleSpecs
 * @description Normalized shape returned by the fetcher
 */
export interface VehicleSpecs {
  modelId?: string;
  title?: string;
  capacity?: string | number;
  engine?: string;
  reliability?: string | number;
  durability?: string | number;
  fuelConsumption?: string | number;
  maxSpeed?: string | number;
  maintenanceGroup?: string;
  year?: string | number;
  fuelTankCapacity?: string | number;
  [key: string]: any;
}

/**
 * Simple in-memory cache for fetched specs during the session.
 * Keys: normalized modelId string -> { ts, data }
 */
const IN_MEMORY_CACHE: Map<string, { ts: number; data: VehicleSpecs }> = new Map();

/**
 * LOCALSTORAGE_TTL_MS
 * @description TTL for optional localStorage caching (24h). Set to 0 to disable.
 */
const LOCALSTORAGE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * tryImport
 * @description Attempt to dynamically import a module. Returns module default or module, or null on failure.
 * @param path module path
 */
async function tryImport(path: string) {
  try {
    // dynamic import to keep bundlers safe
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = await import(path);
    return mod && (mod.default || mod);
  } catch {
    return null;
  }
}

/**
 * findInCollection
 * @description Try locate a matching item in a collection by common keys
 * @param collection array or object map
 * @param modelId modelId we are searching for
 */
function findInCollection(collection: any, modelId: string | undefined) {
  if (!collection || !modelId) return null;
  if (!Array.isArray(collection)) {
    if (collection[modelId]) return collection[modelId];
    const lower = modelId.toLowerCase();
    const foundKey = Object.keys(collection).find((k) => k.toLowerCase() === lower);
    if (foundKey) return collection[foundKey];
    collection = Object.values(collection);
  }
  if (Array.isArray(collection)) {
    const lower = (modelId || '').toLowerCase();
    return (
      collection.find((item: any) => {
        if (!item) return false;
        const candidates = [item.id, item.modelId, item.model, item.name, item.brand, item.title].filter(Boolean);
        return candidates.some((c: string) => String(c).toLowerCase() === lower);
      }) || null
    );
  }
  return null;
}

/**
 * normalizeSpecs
 * @description Convert a raw DB or local entry into VehicleSpecs shape (best-effort)
 * @param entry raw data entry
 */
function normalizeSpecs(entry: any): VehicleSpecs {
  if (!entry) return {};
  return {
    modelId: entry.id ?? entry.modelId ?? entry.model ?? entry.name ?? undefined,
    title: entry.title ?? entry.name ?? entry.model ?? undefined,
    capacity: entry.capacity ?? entry.tonnage ?? entry.payload ?? entry.maxPayload ?? undefined,
    engine:
      entry.engineDescription ??
      entry.engine ??
      entry['engine spec'] ??
      entry.enginePower ??
      entry['engine_power'] ??
      undefined,
    reliability: entry.reliability ?? entry.reliabilityPct ?? undefined,
    durability: entry.durability ?? entry.durabilityPct ?? undefined,
    fuelConsumption:
      entry.fuelConsumption ?? entry.fuel ?? entry['fuel consumption'] ?? entry.fuel_l100km ?? entry.fuel_l_100km ?? undefined,
    maxSpeed: entry.maxSpeed ?? entry.topSpeed ?? entry['max speed'] ?? undefined,
    maintenanceGroup: entry.maintenanceGroup ?? entry.maintenance ?? entry.maintenanceCategory ?? undefined,
    year: entry.year ?? entry.productionYear ?? undefined,
    fuelTankCapacity: entry.fuelTankCapacity ?? entry.fuelTank ?? entry.fuel_tank ?? undefined,
    ...entry,
  };
}

/**
 * getSupabaseConfig
 * @description Try obtain runtime Supabase config from the Netlify function.
 * @returns { url?: string, anon?: string } or null when not available
 */
async function getSupabaseConfig(): Promise<{ url: string; anon: string } | null> {
  try {
    const res = await fetch('/.netlify/functions/supabase-config', { method: 'GET' });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    if (!data) return null;
    const SUPABASE_URL = typeof data.SUPABASE_URL === 'string' ? data.SUPABASE_URL : null;
    const SUPABASE_ANON_KEY = typeof data.SUPABASE_ANON_KEY === 'string' ? data.SUPABASE_ANON_KEY : null;
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
    return { url: SUPABASE_URL, anon: SUPABASE_ANON_KEY };
  } catch {
    return null;
  }
}

/**
 * fetchFromSupabase
 * @description Query the public.vehicles table via the Supabase REST API using runtime config.
 *              Returns the first matching row or null.
 * @param modelId model identifier to look up (id or model)
 */
async function fetchFromSupabase(modelId: string): Promise<any | null> {
  try {
    const cfg = await getSupabaseConfig();
    if (!cfg) return null;
    const base = cfg.url.replace(/\/$/, '');
    const headers = {
      apikey: cfg.anon,
      Authorization: `Bearer ${cfg.anon}`,
      Accept: 'application/json',
    };

    // 1) exact id match
    const idUrl = `${base}/rest/v1/vehicles?id=eq.${encodeURIComponent(modelId)}&select=*`;
    try {
      const r = await fetch(idUrl, { headers });
      if (r.ok) {
        const rows = await r.json().catch(() => null);
        if (Array.isArray(rows) && rows.length > 0) return rows[0];
      }
    } catch {
      // continue
    }

    // 2) exact model match
    const modelUrl = `${base}/rest/v1/vehicles?model=eq.${encodeURIComponent(modelId)}&select=*`;
    try {
      const r2 = await fetch(modelUrl, { headers });
      if (r2.ok) {
        const rows = await r2.json().catch(() => null);
        if (Array.isArray(rows) && rows.length > 0) return rows[0];
      }
    } catch {
      // continue
    }

    // 3) ilike fallback: model or title contains provided string
    const ilike = encodeURIComponent(`*${modelId}*`);
    const ilikeUrl = `${base}/rest/v1/vehicles?or=(model.ilike.${ilike},title.ilike.${ilike})&select=*`;
    try {
      const r3 = await fetch(ilikeUrl, { headers });
      if (r3.ok) {
        const rows = await r3.json().catch(() => null);
        if (Array.isArray(rows) && rows.length > 0) return rows[0];
      }
    } catch {
      // continue
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * readLocalCache
 * @description Try read cached specs from localStorage if enabled and valid
 * @param key cache key
 */
function readLocalCache(key: string): VehicleSpecs | null {
  if (LOCALSTORAGE_TTL_MS <= 0) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.ts || !parsed.data) return null;
    if (Date.now() - parsed.ts > LOCALSTORAGE_TTL_MS) {
      try { localStorage.removeItem(key); } catch { /* ignore */ }
      return null;
    }
    return parsed.data as VehicleSpecs;
  } catch {
    return null;
  }
}

/**
 * writeLocalCache
 * @description Persist specs to localStorage if enabled
 * @param key cache key
 * @param data specs
 */
function writeLocalCache(key: string, data: VehicleSpecs) {
  if (LOCALSTORAGE_TTL_MS <= 0) return;
  try {
    const payload = JSON.stringify({ ts: Date.now(), data });
    localStorage.setItem(key, payload);
  } catch {
    // ignore
  }
}

/**
 * fetchVehicleSpecs
 * @description Attempt to fetch and return normalized specs for a given modelId.
 *              Strategy:
 *               1) Try in-memory cache.
 *               2) Try localStorage cache (optional).
 *               3) Try Supabase public.vehicles using runtime config (preferred).
 *               4) Fall back to local dynamic imports (legacy datasets).
 * @param modelId model identifier (e.g. 'renualt-maxity' or 'Heno XZU720')
 * @returns VehicleSpecs
 */
export async function fetchVehicleSpecs(modelId?: string): Promise<VehicleSpecs> {
  if (!modelId) return {};

  const normalizedKey = String(modelId).toLowerCase().trim();
  // 1) in-memory cache
  const mem = IN_MEMORY_CACHE.get(normalizedKey);
  if (mem && Date.now() - mem.ts < LOCALSTORAGE_TTL_MS) {
    return mem.data;
  }

  // 2) localStorage cache
  const lsKey = `tm_specs_cache_${normalizedKey}`;
  const fromLs = readLocalCache(lsKey);
  if (fromLs) {
    IN_MEMORY_CACHE.set(normalizedKey, { ts: Date.now(), data: fromLs });
    return fromLs;
  }

  // 3) Supabase lookup
  try {
    const row = await fetchFromSupabase(normalizedKey);
    if (row) {
      const norm = normalizeSpecs(row);
      IN_MEMORY_CACHE.set(normalizedKey, { ts: Date.now(), data: norm });
      writeLocalCache(lsKey, norm);
      return norm;
    }
  } catch {
    // swallow and continue to fallback
  }

  // 4) Local dynamic import fallback (preserve previous behaviour)
  const candidatePaths = [
    '../data/trucks',
    '../data/trucks/index',
    '../../data/trucks',
    '../../data/trucks/index',
    '../data/trucks/big',
    '../data/trucks/medium',
    '../data/trucks/small',
    '../../data/trucks/big',
    '../../data/trucks/medium',
    '../../data/trucks/small',
  ];

  for (const p of candidatePaths) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const mod = await tryImport(p);
      if (!mod) continue;
      let entry = findInCollection(mod, modelId);
      if (!entry) entry = findInCollection(mod.trucks ?? mod.data ?? mod.items ?? null, modelId);
      if (entry) {
        const norm = normalizeSpecs(entry);
        IN_MEMORY_CACHE.set(normalizedKey, { ts: Date.now(), data: norm });
        writeLocalCache(lsKey, norm);
        return norm;
      }
      const groupKey = Object.keys(mod).find((k) => Array.isArray(mod[k]));
      if (groupKey) {
        entry = findInCollection(mod[groupKey], modelId);
        if (entry) {
          const norm = normalizeSpecs(entry);
          IN_MEMORY_CACHE.set(normalizedKey, { ts: Date.now(), data: norm });
          writeLocalCache(lsKey, norm);
          return norm;
        }
      }
    } catch {
      // continue to next path
    }
  }

  // Not found — cache empty result to avoid repeated lookups in the short term
  const empty: VehicleSpecs = {};
  IN_MEMORY_CACHE.set(normalizedKey, { ts: Date.now(), data: empty });
  writeLocalCache(lsKey, empty);
  return empty;
}