/**
 * add_sync_trigger_migrated_collections.sql
 *
 * Purpose:
 * - Ensure migrated_collections.collection_name exists and is kept in sync with
 *   migrated_collections.collection_key for all future INSERT/UPDATE operations.
 *
 * Usage:
 * - Run the entire file in the Supabase SQL editor (or psql) as a single script.
 * - The script is idempotent: it uses IF NOT EXISTS / CREATE OR REPLACE / DROP TRIGGER IF EXISTS
 *   so it can be safely re-applied.
 *
 * Safety:
 * - This only modifies the migrated_collections table: adds column (if missing),
 *   backfills existing rows, creates an index (if missing) and installs a trigger.
 * - A previous backup step is recommended (you have already created a backup earlier).
 */

/* Begin transaction for atomicity */
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
CREATE OR REPLACE FUNCTION public.sync_collection_name()
RETURNS trigger AS $$
/**
 * sync_collection_name
 *
 * Trigger function to ensure collection_name mirrors collection_key on INSERT or UPDATE.
 * - If NEW.collection_key is non-null it will be copied to NEW.collection_name.
 * - This is intentionally simple and deterministic so future inserts don't need to
 *   remember to write collection_name themselves.
 */
BEGIN
  IF NEW.collection_key IS NOT NULL THEN
    NEW.collection_name := NEW.collection_key;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5) Drop any old trigger and (re)create it so the function is used on inserts/updates
DROP TRIGGER IF EXISTS trg_sync_collection_name ON public.migrated_collections;

CREATE TRIGGER trg_sync_collection_name
BEFORE INSERT OR UPDATE ON public.migrated_collections
FOR EACH ROW EXECUTE FUNCTION public.sync_collection_name();

COMMIT;

-- ---------------------------------------------------------------------
-- Verification (run after applying the script)
-- 1) Show latest rows:
-- SELECT id, collection_key, collection_name, migrated_at
-- FROM public.migrated_collections
-- ORDER BY migrated_at DESC NULLS LAST
-- LIMIT 25;
--
-- 2) Test an INSERT creates a row with collection_name set automatically:
-- INSERT INTO public.migrated_collections (collection_key, data)
-- VALUES ('__test_sync', '{"ok": true}') RETURNING id, collection_key, collection_name;
--
-- 3) Test an UPDATE keeps values in sync:
-- UPDATE public.migrated_collections
-- SET collection_key = '__test_sync_2'
-- WHERE collection_key = '__test_sync'
-- RETURNING id, collection_key, collection_name;
--
-- 4) Clean up test row (optional):
-- DELETE FROM public.migrated_collections WHERE collection_key LIKE '__test_sync%';
-- ---------------------------------------------------------------------

-- Rollback snippet (if you later decide to remove the shim)
-- Note: Back up table before running destructive operations.
-- BEGIN;
-- DROP TRIGGER IF EXISTS trg_sync_collection_name ON public.migrated_collections;
-- DROP FUNCTION IF EXISTS public.sync_collection_name();
-- -- Optionally drop the column (only after code is updated to not reference it)
-- ALTER TABLE public.migrated_collections DROP COLUMN IF EXISTS collection_name;
-- COMMIT;
-- ---------------------------------------------------------------------