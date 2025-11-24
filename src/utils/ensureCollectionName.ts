/**
 * ensureCollectionName.ts
 *
 * Utility to normalize payloads for migrated_collections so that
 * collection_name is always present and mirrors collection_key when missing.
 *
 * This small helper is intentionally dependency-free and safe to use
 * before sending insert/update requests to the database.
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
 * @description Ensure the returned payload includes `collection_name`. If it is
 * missing or null, set it to the value of `collection_key`.
 *
 * @param payload - Partial payload intended for migrated_collections
 * @returns A new payload object with collection_name ensured
 */
export function ensureCollectionName<T extends MigratedCollectionPayload>(payload: T): T {
  // Shallow clone to avoid mutating caller's object
  const out = { ...payload } as T;

  // If collection_key exists and collection_name is falsy, set collection_name
  if (typeof out.collection_key === 'string' && (!out.collection_name || out.collection_name === null)) {
    out.collection_name = out.collection_key;
  }

  return out;
}