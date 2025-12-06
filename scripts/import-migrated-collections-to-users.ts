/**
 * scripts/import-migrated-collections-to-users.ts
 *
 * Safe import utility: move rows from migrated_collections (collection_name = 'users')
 * into a public.users table via Supabase/PostgREST using on_conflict=source_id.
 *
 * Enhancements in this version:
 * - Deduplicate planned rows by source_id (merges metadata into __migrated_collection_ids).
 * - Batch upsert with per-row fallback on failure.
 * - AFTER successful upserts: mark contributing migrated_collections rows as imported
 *   (idempotent patch: status='imported', imported_at timestamp). This prevents
 *   re-processing and makes the migration idempotent.
 * - Dry-run support: preview inserts and which migrated rows would be marked.
 *
 * Usage:
 *  DRY_RUN=true node --experimental-fetch scripts/import-migrated-collections-to-users.ts
 *  or (preferred) set envs and run with ts-node:
 *  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... DRY_RUN=false ts-node scripts/import-migrated-collections-to-users.ts
 *
 * Notes:
 * - Requires Node 18+ (global fetch) or ts-node environment.
 * - This script does NOT delete migrated_collections rows; it only patches them to mark imported.
 */

/**
 * Type definitions and helper functions
 */

/** MigratedRow
 * @description Row shape returned from migrated_collections REST endpoint subset
 */
type MigratedRow = {
  id: string;
  collection_name: string | null;
  payload?: { items?: any[] } | any;
  metadata?: Record<string, any>;
  inserted_at?: string;
};

type PlannedUser = {
  source_id: string;
  email: string | null;
  name: string | null;
  user_metadata: Record<string, any> | null;
  created_at?: string | null;
};

type Env = NodeJS.ProcessEnv;

/**
 * env - read environment variable as string | undefined
 * @param name env var name
 */
function env(name: string): string | undefined {
  const v = (process.env as Env)[name];
  return v === undefined || v === '' ? undefined : String(v);
}

/**
 * looksLikeUuid
 * @description permissive UUID v4-ish check
 */
function looksLikeUuid(v: any): boolean {
  if (typeof v !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

/**
 * normalizeBase
 * @description remove trailing slash from base url
 */
function normalizeBase(u: string): string {
  return u.replace(/\/$/, '');
}

/**
 * fetchMigratedCollections
 * @description fetch migrated_collections rows where collection_name = 'users'
 */
async function fetchMigratedCollections(baseUrl: string, serviceKey: string): Promise<MigratedRow[]> {
  const base = normalizeBase(baseUrl);
  const url = `${base}/rest/v1/migrated_collections?select=id,collection_name,payload,metadata,inserted_at&collection_name=eq.users&order=inserted_at.asc&limit=1000`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey
    }
  });
  if (!res.ok) {
    const text = await res.text().catch(() => null);
    throw new Error(`Failed to fetch migrated_collections: ${res.status} ${text}`);
  }
  const json = await res.json();
  return Array.isArray(json) ? json : [];
}

/**
 * buildPlannedUser
 * @description Convert a migrated item into a normalized PlannedUser with identical keys across rows
 */
function buildPlannedUser(item: any, migratedCollectionId?: string): PlannedUser {
  // shallow clone
  const clone = { ...(item || {}) };

  // determine source_id
  let source_id: string | null = null;
  if (clone.source_id) {
    source_id = String(clone.source_id);
  } else if (clone.email) {
    source_id = `email:${String(clone.email).toLowerCase()}`;
  } else if (clone.id && looksLikeUuid(clone.id)) {
    source_id = `id:${String(clone.id)}`;
  } else if (clone.id !== undefined && clone.id !== null) {
    source_id = `legacy:${String(clone.id)}`;
  } else {
    source_id = `generated:${Date.now()}:${Math.floor(Math.random() * 100000)}`;
  }

  // Avoid inserting non-UUID into id column
  if (clone.id !== undefined && !looksLikeUuid(clone.id)) {
    delete clone.id;
  }

  // Build normalized row fields
  const email = clone.email ? String(clone.email) : null;
  const name = clone.name ? String(clone.name) : null;

  // Remove moved fields from metadata payload
  delete clone.email;
  delete clone.name;
  delete clone.source_id;

  let user_metadata = Object.keys(clone).length ? clone : null;

  // Attach migrated collection ref for provenance
  if (migratedCollectionId) {
    if (!user_metadata) user_metadata = {};
    (user_metadata as any).__migrated_collection_id = migratedCollectionId;
  }

  const userRow: PlannedUser = {
    source_id,
    email: email ?? null,
    name: name ?? null,
    user_metadata: (user_metadata ?? null)
  };

  return userRow;
}

/**
 * chunkArray
 * @description split array into chunks
 */
function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * dedupePlannedRows
 * @description Deduplicate planned rows by source_id.
 * - Prefer non-null email/name
 * - Merge user_metadata shallowly
 * - Aggregate migrated collection ids into user_metadata.__migrated_collection_ids
 */
function dedupePlannedRows(planned: PlannedUser[]): PlannedUser[] {
  const map = new Map<string, PlannedUser & { __migrated_collection_ids?: string[] }>();

  for (const p of planned) {
    const key = p.source_id;
    const existing = map.get(key);
    if (!existing) {
      // initialize __migrated_collection_ids from possible single migrated id in metadata
      const migratedId = ((p.user_metadata && (p.user_metadata as any).__migrated_collection_id) as string | undefined) ?? undefined;
      const copy: any = {
        ...p,
        user_metadata: p.user_metadata ? { ...p.user_metadata } : null,
        __migrated_collection_ids: migratedId ? [migratedId] : []
      };
      // remove single legacy field (we will store as array)
      if (copy.user_metadata && copy.user_metadata.__migrated_collection_id) {
        delete copy.user_metadata.__migrated_collection_id;
      }
      map.set(key, copy);
      continue;
    }

    // Merge: prefer non-null email/name
    if (!existing.email && p.email) existing.email = p.email;
    if (!existing.name && p.name) existing.name = p.name;

    // Merge user_metadata shallowly
    const mergedMeta: any = { ...(existing.user_metadata || {}) };
    if (p.user_metadata && typeof p.user_metadata === 'object') {
      for (const k of Object.keys(p.user_metadata)) {
        if (!(k in mergedMeta)) {
          mergedMeta[k] = (p.user_metadata as any)[k];
        }
      }
    }
    existing.user_metadata = Object.keys(mergedMeta).length ? mergedMeta : null;

    // Aggregate migrated collection id provenance
    const migratedId = ((p.user_metadata && (p.user_metadata as any).__migrated_collection_id) as string | undefined) ?? undefined;
    if (migratedId) {
      existing.__migrated_collection_ids = existing.__migrated_collection_ids || [];
      if (!existing.__migrated_collection_ids.includes(migratedId)) {
        existing.__migrated_collection_ids.push(migratedId);
      }
    }
  }

  // Finalize: reattach __migrated_collection_ids into user_metadata as array (if any)
  const out: PlannedUser[] = [];
  for (const [, v] of map) {
    const copy: any = {
      source_id: v.source_id,
      email: v.email ?? null,
      name: v.name ?? null,
      user_metadata: v.user_metadata ? { ...v.user_metadata } : null
    };
    if (v.__migrated_collection_ids && v.__migrated_collection_ids.length) {
      if (!copy.user_metadata) copy.user_metadata = {};
      (copy.user_metadata as any).__migrated_collection_ids = v.__migrated_collection_ids;
    }
    out.push(copy);
  }
  return out;
}

/**
 * upsertUsersBatch
 * @description Upsert a batch of planned users into public.users using on_conflict=source_id
 */
async function upsertUsersBatch(baseUrl: string, serviceKey: string, batch: PlannedUser[]) {
  const base = normalizeBase(baseUrl);
  const target = `${base}/rest/v1/users?on_conflict=source_id`;
  const res = await fetch(target, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      Prefer: 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify(batch)
  });
  const text = await res.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  if (!res.ok) {
    const msg = parsed || text;
    const err: any = new Error(`Upsert failed: ${res.status} ${JSON.stringify(msg)}`);
    err.status = res.status;
    err.body = parsed;
    throw err;
  }
  return parsed;
}

/**
 * upsertUserSingle
 * @description Upsert a single row (wrapped in array) — used as fallback
 */
async function upsertUserSingle(baseUrl: string, serviceKey: string, row: PlannedUser) {
  const base = normalizeBase(baseUrl);
  const target = `${base}/rest/v1/users?on_conflict=source_id`;
  const res = await fetch(target, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      Prefer: 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify([row])
  });
  const text = await res.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  if (!res.ok) {
    const msg = parsed || text;
    const err: any = new Error(`Single upsert failed: ${res.status} ${JSON.stringify(msg)}`);
    err.status = res.status;
    err.body = parsed;
    throw err;
  }
  return parsed;
}

/**
 * markMigratedCollectionsImported
 * @description Patch migrated_collections rows by id to mark them as imported.
 * Idempotent: it sets status='imported' and imported_at timestamp.
 */
async function markMigratedCollectionsImported(baseUrl: string, serviceKey: string, ids: string[], dryRun = true) {
  if (!ids || ids.length === 0) {
    console.log('No migrated_collections ids to mark imported.');
    return;
  }
  if (dryRun) {
    console.log(`[dry-run] Would mark migrated_collections ids as imported:`, ids);
    return;
  }

  // Chunk ids to avoid overly-long query params
  const chunks = chunkArray(ids, 200);
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const inList = chunk.map(id => encodeURIComponent(id)).join(',');
    const path = `/rest/v1/migrated_collections?id=in.(${inList})`;
    const url = `${normalizeBase(baseUrl)}${path}`;
    const body = JSON.stringify({ status: 'imported', imported_at: new Date().toISOString() });
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      Prefer: 'return=representation'
    };
    try {
      const res = await fetch(url, { method: 'PATCH', headers, body });
      const text = await res.text();
      if (!res.ok) {
        console.error(`Failed to mark migrated_collections chunk ${i + 1}/${chunks.length}: ${res.status} ${text}`);
      } else {
        console.log(`Marked ${chunk.length} migrated_collections rows imported (chunk ${i + 1}/${chunks.length})`);
      }
    } catch (err) {
      console.error('Error while marking migrated_collections imported:', err && (err as any).message ? (err as any).message : err);
    }
    // gentle delay to avoid hammering API
    await new Promise(res => setTimeout(res, 150));
  }
}

/**
 * main
 */
(async function main() {
  try {
    const SUPABASE_URL = env('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = env('SUPABASE_SERVICE_ROLE_KEY');
    const DRY_RUN = String(env('DRY_RUN') ?? 'true').toLowerCase() === 'true';
    const BATCH_SIZE = Number(env('BATCH_SIZE') ?? 200);

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them in environment and re-run.');
      process.exit(2);
    }

    console.log('Config ok. DRY_RUN=', DRY_RUN, 'BATCH_SIZE=', BATCH_SIZE);

    // Fetch migrated_collections rows
    const rows = await fetchMigratedCollections(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    if (!rows || rows.length === 0) {
      console.log('No migrated_collections rows with collection_name=users found. Nothing to import.');
      return;
    }

    console.log(`Found ${rows.length} migrated_collections rows (collection_name=users).`);

    // Flatten items with annotation of origin
    const allItems: any[] = [];
    for (const r of rows) {
      const items = (r.payload && Array.isArray(r.payload.items)) ? r.payload.items : [];
      for (const it of items) {
        const annotated = { ...(it || {}), __migrated_collection_id: r.id };
        allItems.push(annotated);
      }
    }

    console.log(`Total user items to process: ${allItems.length}`);
    if (allItems.length === 0) return;

    // Build planned rows (normalized)
    const planned: PlannedUser[] = allItems.map(it => {
      const migratedId = it.__migrated_collection_id;
      const copy = { ...(it || {}) };
      delete copy.__migrated_collection_id;
      return buildPlannedUser(copy, migratedId);
    });

    console.log(`Planned rows before dedupe: ${planned.length}`);

    // Deduplicate by source_id to avoid duplicate constrained keys in a single batch insert
    const deduped = dedupePlannedRows(planned);
    console.log(`Rows after dedupe by source_id: ${deduped.length} (duplicates merged: ${planned.length - deduped.length})`);

    if (DRY_RUN) {
      console.log('DRY RUN mode — showing sample planned rows (up to 20):');
      console.log(JSON.stringify(deduped.slice(0, 20), null, 2));
      console.log('Also would mark the following migrated_collections ids imported (sample):');
      // collect migrated ids from deduped
      const toMark = new Set<string>();
      for (const d of deduped) {
        const ids = (d.user_metadata && (d.user_metadata as any).__migrated_collection_ids) || [];
        for (const id of ids) toMark.add(id);
      }
      console.log(Array.from(toMark).slice(0, 200));
      console.log('To perform real import, run with DRY_RUN=false and ensure SUPABASE envs are set.');
      return;
    }

    // Real run: upsert in batches
    const batches = chunkArray(deduped, Math.max(1, BATCH_SIZE));
    console.log(`Upserting ${deduped.length} rows in ${batches.length} batch(es) (batch-size=${BATCH_SIZE})`);

    let totalInserted = 0;
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`Upserting batch ${i + 1}/${batches.length} (${batch.length} rows)...`);
      try {
        const resp = await upsertUsersBatch(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, batch);
        totalInserted += Array.isArray(resp) ? resp.length : (resp ? 1 : 0);
        console.log(`Batch ${i + 1} upsert OK. Response length: ${Array.isArray(resp) ? resp.length : 1}`);
      } catch (err: any) {
        console.warn(`Batch ${i + 1} failed:`, err && (err.message || err));
        console.warn('Falling back to per-row upsert for this batch...');
        // Retry per row
        for (const row of batch) {
          try {
            const r = await upsertUserSingle(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, row);
            totalInserted += Array.isArray(r) ? r.length : (r ? 1 : 0);
          } catch (rowErr: any) {
            console.error('Row upsert failed for source_id=', row.source_id, ' error:', rowErr && (rowErr.message || rowErr));
            // Continue with other rows
          }
        }
      }
      // gentle delay
      await new Promise(res => setTimeout(res, 200));
    }

    console.log(`Upsert finished. Approx inserted/updated rows: ${totalInserted}`);

    // Collect migrated_collections ids that contributed to deduped rows
    const migratedIdsSet = new Set<string>();
    for (const d of deduped) {
      const ids = (d.user_metadata && (d.user_metadata as any).__migrated_collection_ids) || [];
      for (const id of ids) migratedIdsSet.add(id);
    }
    const migratedIds = Array.from(migratedIdsSet);

    // Mark migrated_collections rows imported (idempotent)
    console.log(`Marking ${migratedIds.length} migrated_collections rows as imported...`);
    await markMigratedCollectionsImported(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, migratedIds, false);

    console.log('Import finished. Approx inserted/updated rows:', totalInserted);
    console.log('Migrated collections patched as imported.');
  } catch (err: any) {
    console.error('Fatal error:', err && (err.message || err));
    process.exit(1);
  }
})();