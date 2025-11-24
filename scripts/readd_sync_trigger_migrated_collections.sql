-- readd_sync_trigger_migrated_collections.sql
-- Purpose:
--   Recreate the sync trigger/function that keeps migrated_collections.collection_name
--   in sync with migrated_collections.collection_key. This script is idempotent
--   and safe to re-run.
--
-- Usage:
--   Run in Supabase SQL Editor or via psql:
--     psql "<CONN>" -f readd_sync_trigger_migrated_collections.sql
--
BEGIN;

-- 1) Ensure compatibility column exists (safe: IF NOT EXISTS)
ALTER TABLE public.migrated_collections
  ADD COLUMN IF NOT EXISTS collection_name text;

-- 2) Backfill existing rows where collection_name is missing
UPDATE public.migrated_collections
  SET collection_name = collection_key
  WHERE collection_name IS NULL AND collection_key IS NOT NULL;

-- 3) Add an index to speed lookups by collection_name (safe: IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_migrated_collections_collection_name ON public.migrated_collections (collection_name);

-- 4) Trigger function: keep collection_name mirrored to collection_key on INSERT/UPDATE
-- Note: use a named dollar-quote ($sync$) to avoid parser issues with embedded comment styles.
CREATE OR REPLACE FUNCTION public.sync_collection_name()
RETURNS trigger AS $sync$
-- sync_collection_name
-- Trigger function to ensure NEW.collection_name mirrors NEW.collection_key
BEGIN
  IF NEW.collection_key IS NOT NULL THEN
    NEW.collection_name := NEW.collection_key;
  END IF;
  RETURN NEW;
END;
$sync$ LANGUAGE plpgsql;

-- 5) (Re)create trigger that invokes the function on INSERT or UPDATE
DROP TRIGGER IF EXISTS trg_sync_collection_name ON public.migrated_collections;

CREATE TRIGGER trg_sync_collection_name
BEFORE INSERT OR UPDATE ON public.migrated_collections
FOR EACH ROW EXECUTE FUNCTION public.sync_collection_name();

COMMIT;
