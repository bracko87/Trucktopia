/**
 * scripts/create_migration_items_table.sql
 *
 * Create a target table to store imported items from migrated_collections.
 *
 * Purpose:
 * - Provide a simple unified table to store items from many tm_* collections.
 * - Each row stores the original collection_name and the JSON item.
 *
 * Run in Supabase SQL editor (or psql) once before running the importer.
 *
 * Notes:
 * - Adjust the column names/types if you prefer different structure.
 * - Adds an index on collection_name to speed queries.
 */
CREATE TABLE IF NOT EXISTS public.migration_items (
  id bigserial PRIMARY KEY,
  collection_name text NOT NULL,
  migrated_collection_id bigint, -- optional reference to migrated_collections.id if present
  item jsonb NOT NULL,
  imported_at timestamptz DEFAULT now()
);

-- Helpful index for queries by collection name:
CREATE INDEX IF NOT EXISTS idx_migration_items_collection_name ON public.migration_items (collection_name);