-- scripts/restore_migrated_collections_shim.sql
-- 
-- Purpose:
--   Provide a safe, repeatable SQL script that ensures migrated_collections
--   contains a compatibility column `collection_name` and a trigger that
--   keeps it synchronized with `collection_key` on INSERT or UPDATE.
--
-- Usage:
--   Paste the contents below into the Supabase SQL editor (or run with psql).
--
-- Rollback:
--   To remove the trigger and column later, see the DROP section at the end of this file.
--
BEGIN;

-- 1) Ensure compatibility column exists
ALTER TABLE public.migrated_collections
  ADD COLUMN IF NOT EXISTS collection_name text;

-- 2) Backfill existing rows when collection_key is present
UPDATE public.migrated_collections
  SET collection_name = collection_key
  WHERE collection_name IS NULL AND collection_key IS NOT NULL;

-- 3) Index to accelerate lookups by collection_name
CREATE INDEX IF NOT EXISTS idx_migrated_collections_collection_name ON public.migrated_collections (collection_name);

-- 4) Trigger function to sync collection_name from collection_key on INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.sync_collection_name()
RETURNS trigger AS $$
/**
 * sync_collection_name
 * Ensure collection_name mirrors collection_key for compatibility.
 * Called BEFORE INSERT OR UPDATE on migrated_collections.
 */
BEGIN
  IF NEW.collection_key IS NOT NULL THEN
    NEW.collection_name := NEW.collection_key;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5) Replace existing trigger if any, then create trigger
DROP TRIGGER IF EXISTS trg_sync_collection_name ON public.migrated_collections;

CREATE TRIGGER trg_sync_collection_name
BEFORE INSERT OR UPDATE ON public.migrated_collections
FOR EACH ROW EXECUTE FUNCTION public.sync_collection_name();

COMMIT;

-- ---------------------------------------------------------------------
-- Quick verification examples (run after the script):
-- 1) Show most recent rows:
-- SELECT id, collection_key, collection_name, migrated_at
-- FROM public.migrated_collections
-- ORDER BY migrated_at DESC NULLS LAST
-- LIMIT 25;
--
-- 2) Insert a test row to verify automatic sync then read it:
-- INSERT INTO public.migrated_collections (collection_key, data) VALUES ('__test_sync', '{"ok":true}');
-- SELECT id, collection_key, collection_name FROM public.migrated_collections WHERE collection_key = '__test_sync';
--
-- ---------------------------------------------------------------------
-- Optional rollback (use only when you are sure):
-- DROP TRIGGER IF EXISTS trg_sync_collection_name ON public.migrated_collections;
-- DROP FUNCTION IF EXISTS public.sync_collection_name();
-- ALTER TABLE public.migrated_collections DROP COLUMN IF EXISTS collection_name;
-- DROP INDEX IF EXISTS idx_migrated_collections_collection_name;
-- ---------------------------------------------------------------------