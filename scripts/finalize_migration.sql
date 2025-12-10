-- scripts/finalize_migration.sql
-- 
-- Finalize migration actions (idempotent).
-- Purpose:
--  - Ensure unique index on companies.source_id (if present).
--  - Add FK constraint companies.owner_id -> users.id (ON DELETE SET NULL) if not present.
--  - Create migration_runs audit table if missing, and insert a run record (uses staging_companies_archive if present).
--  - Create/ensure trigger to maintain updated_at on companies.
--  - Mark migrated_collections rows as 'imported' based on staging archive provenance (if archive table exists).
--
-- Safety:
--  - All operations are guarded by existence checks; the script is safe to run multiple times.
--  - It will NOT attempt to alter companies rows before constraints if orphan owners exist (it checks for the constraint name).
--  - Preview queries are provided at the top — run them first if you wish to inspect what will be touched.
--
-- Usage:
--  psql -f scripts/finalize_migration.sql <connection-string>
--
-- NOTE:
--  If you removed the staging table without creating an archive, the migration_runs insert and migrated_collections marking will be skipped,
--  but FK, index and trigger will still be applied (subject to the preconditions below).
--
/* ---------------------------
   Preview helper queries (optional)
   Run these manually if you want to double-check before applying the changes.
   --------------------------- */
-- 1) Orphan owners (should return zero rows)
-- SELECT c.id, c.name, c.owner_id FROM public.companies c
-- WHERE c.owner_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = c.owner_id) LIMIT 50;

-- 2) Source_id duplicates (should return zero rows)
-- SELECT source_id, count(*) FROM public.companies WHERE source_id IS NOT NULL GROUP BY source_id HAVING count(*) > 1;

-- 3) Staging archive preview (if present)
-- SELECT count(*) FROM public.staging_companies_archive;

/* ---------------------------
   1) Ensure unique index on source_id (idempotent)
   --------------------------- */
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_source_id_unique
  ON public.companies (source_id)
  WHERE source_id IS NOT NULL;

-- Small, safe pause point for review if running interactively.
-- You can run the preview queries above now and continue when ready.

/* ---------------------------
   2) Add FK constraint companies.owner_id -> users.id (idempotent)
   --------------------------- */
DO $$
BEGIN
  -- Only add the constraint if it does not already exist
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.conname = 'fk_companies_owner'
      AND t.relname = 'companies'
  ) THEN
    -- The alter will fail if orphan owner_ids exist. We rely on the prior integrity checks.
    BEGIN
      EXECUTE 'ALTER TABLE public.companies
               ADD CONSTRAINT fk_companies_owner
               FOREIGN KEY (owner_id) REFERENCES public.users (id)
               ON DELETE SET NULL';
    EXCEPTION WHEN others THEN
      -- If it fails, raise a descriptive notice for the operator and re-raise the error to stop execution.
      RAISE NOTICE ''Failed to add fk_companies_owner constraint. Please ensure there are no orphan owner_id values and try again.'';
      RAISE;
    END;
  ELSE
    RAISE NOTICE 'Constraint fk_companies_owner already exists - skipping ALTER.';
  END IF;
END$$;

/* ---------------------------
   3) Ensure updated_at trigger/function exists (idempotent)
   --------------------------- */
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
/**
 * touch_updated_at
 * @description Trigger function to set NEW.updated_at = now() on UPDATE operations.
 */
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Ensure the trigger exists (drop if present and re-create to guarantee correct behavior)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_trigger tg
    JOIN pg_class t ON tg.tgrelid = t.oid
    WHERE tg.tgname = 'trg_companies_touch_updated_at'
      AND t.relname = 'companies'
  ) THEN
    -- trigger exists, nothing to do (kept idempotent). If you prefer re-creating every run, uncomment the DROP below.
    -- EXECUTE 'DROP TRIGGER IF EXISTS trg_companies_touch_updated_at ON public.companies';
    RAISE NOTICE 'Trigger trg_companies_touch_updated_at already exists - leaving in place.';
  ELSE
    EXECUTE 'CREATE TRIGGER trg_companies_touch_updated_at
             BEFORE UPDATE ON public.companies
             FOR EACH ROW
             EXECUTE FUNCTION public.touch_updated_at()';
    RAISE NOTICE 'Trigger trg_companies_touch_updated_at created.';
  END IF;
END$$;

/* ---------------------------
   4) Create migration_runs audit table (if missing)
   --------------------------- */
CREATE TABLE IF NOT EXISTS public.migration_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_by text,
  run_at timestamptz DEFAULT now(),
  migrated_ids jsonb,
  row_count integer,
  notes text
);

/* ---------------------------
   5) Insert a migration_runs record (uses staging_companies_archive if present).
   This block is idempotent from an informational point of view; multiple runs will insert multiple run records.
   --------------------------- */
DO $$
DECLARE
  migrated jsonb := '[]'::jsonb;
  rc integer := 0;
  src_exists boolean := false;
BEGIN
  -- Check whether staging_companies_archive exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'staging_companies_archive'
  ) INTO src_exists;

  IF src_exists THEN
    SELECT jsonb_agg(migrated_collection_id) FILTER (WHERE migrated_collection_id IS NOT NULL)::jsonb
    INTO migrated
    FROM public.staging_companies_archive;
  ELSE
    -- If no archive is present, attempt to collect from migrated_collections rows already marked imported
    SELECT jsonb_agg(id)::jsonb INTO migrated FROM (
      SELECT id FROM public.migrated_collections WHERE status = 'imported' ORDER BY inserted_at DESC LIMIT 1000
    ) t;
  END IF;

  SELECT count(*) INTO rc FROM public.companies;

  INSERT INTO public.migration_runs (run_by, migrated_ids, row_count, notes)
  VALUES (current_user, COALESCE(migrated, '[]'::jsonb), rc,
          'Finalization run: ensured FK, trigger, indexes and recorded migration provenance.');
  RAISE NOTICE 'Inserted migration_runs row (companies count=%).', rc;
END$$;

/* ---------------------------
   6) Mark migrated_collections rows as imported (idempotent)
   - Only runs if staging_companies_archive exists and has migrated_collection_id values.
   - Skips rows already marked as imported.
   --------------------------- */
DO $$
DECLARE
  src_exists boolean := false;
  ids_count integer := 0;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'staging_companies_archive'
  ) INTO src_exists;

  IF NOT src_exists THEN
    RAISE NOTICE 'staging_companies_archive does not exist - skipping migrated_collections update.';
    RETURN;
  END IF;

  -- Count distinct migrated ids in archive
  EXECUTE
    'SELECT count(DISTINCT migrated_collection_id) FROM public.staging_companies_archive WHERE migrated_collection_id IS NOT NULL'
    INTO ids_count;

  IF ids_count = 0 THEN
    RAISE NOTICE 'No migrated_collection_id values found in staging_companies_archive - skipping update.';
    RETURN;
  END IF;

  -- Perform idempotent update
  EXECUTE $sql$
    WITH ids AS (
      SELECT DISTINCT migrated_collection_id::uuid AS id
      FROM public.staging_companies_archive
      WHERE migrated_collection_id IS NOT NULL
    )
    UPDATE public.migrated_collections mc
    SET status = 'imported',
        imported_at = COALESCE(mc.imported_at, now())
    FROM ids
    WHERE mc.id = ids.id
      AND mc.status IS DISTINCT FROM 'imported';
  $sql$;

  RAISE NOTICE 'Marked migrated_collections as imported using % distinct archive ids.', ids_count;
END$$;

-- End of script.
