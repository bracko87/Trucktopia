/**
 * server/migrate-server.ts
 *
 * Small server-side helper used to perform safe inserts into
 * public.migrated_collections. Ensures collection_name mirrors collection_key
 * to avoid relying on DB-side shims.
 *
 * This file uses fetch to call the Supabase REST API directly so it requires
 * SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to be available in the environment.
 */

 /**
  * MigratedCollectionPayload
  * @description Minimal shape expected when inserting into migrated_collections.
  */
export interface MigratedCollectionPayload {
  collection_key: string;
  collection_name?: string | null;
  data?: any;
  metadata?: any;
  [k: string]: any;
}

/**
 * ensureCollectionName
 * @description Ensure collection_name is present on payload.
 *
 * @param payload - payload to normalize
 * @returns normalized payload
 */
export function ensureCollectionName<T extends MigratedCollectionPayload>(payload: T): T {
  const out = { ...payload } as T;
  if (typeof out.collection_key === 'string' && (!out.collection_name || out.collection_name === null)) {
    out.collection_name = out.collection_key;
  }
  return out;
}

/**
 * insertMigratedCollection
 * @description Insert a row into public.migrated_collections using Supabase REST.
 * Ensures collection_name is set. Returns the inserted row representation.
 *
 * @param payload - MigratedCollectionPayload to insert
 */
export async function insertMigratedCollection(payload: MigratedCollectionPayload) {
  // Runtime config (set these in env)
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase credentials are not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).');
  }

  const normalized = ensureCollectionName(payload);

  const res = await fetch(`${SUPABASE_URL}/rest/v1/migrated_collections`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      Prefer: 'return=representation'
    },
    body: JSON.stringify(normalized)
  });

  const body = await res.json();

  if (!res.ok) {
    const msg = typeof body === 'object' ? JSON.stringify(body) : String(body);
    throw new Error(`Supabase insert failed: ${res.status} ${msg}`);
  }

  // return first inserted row (Supabase returns an array when using return=representation)
  return Array.isArray(body) && body.length > 0 ? body[0] : body;
}