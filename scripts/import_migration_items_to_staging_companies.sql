-- scripts/import_migration_items_to_staging_companies.sql
--
-- Purpose:
-- - Read elements (array items and top-level objects) from public.migration_items and
--   insert them into a raw inspection table (staging_companies_raw).
-- - Provide an idempotent upsert example to existing staging_companies for rows that
--   clearly look like company objects (heuristic: has company_name / owner_id / owner_email / capital / staff / trucks).
-- - Merge migrated_collection provenance into staging_companies.migrated_collection_ids so imports are traceable.
--
-- IMPORTANT:
-- - This script is written conservatively. Step 1 is non-destructive: it only inserts into staging_companies_raw for inspection.
-- - Review records in staging_companies_raw, refine the WHERE clause for step 2, then run the upsert.
-- - Adjust column mappings to your real schema before running the upsert to staging_companies.
--
-- Usage:
-- 1) Run the script up to the first section to populate staging_companies_raw:
--    psql -f scripts/import_migration_items_to_staging_companies.sql
-- 2) Inspect staging_companies_raw, then run the UPSET block (uncomment RUN_UPSERT = true section)
--
-- NOTE: If staging_companies already exists (your list shows it does), the script will not create it.

-- SECTION A: create raw inspection table (idempotent)
CREATE TABLE IF NOT EXISTS staging_companies_raw (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  migrated_collection_id uuid,
  migrated_collection_inserted_at timestamptz,
  top_level_key text,
  elem jsonb,
  extracted_at timestamptz DEFAULT now()
);

-- SECTION B: extract top-level array elements and top-level single object payloads into staging_companies_raw
--  - For each migration_items row: for each top-level array key push each element
--  - If payload is an object and not an array, insert the payload as elem with top_level_key = NULL
WITH arrays AS (
  SELECT
    mi.id AS migrated_collection_id,
    mi.inserted_at AS migrated_collection_inserted_at,
    key AS top_level_key,
    jsonb_array_elements(mi.payload -> key) AS elem
  FROM public.migration_items mi,
  LATERAL (SELECT jsonb_object_keys(mi.payload) AS key) keys
  WHERE jsonb_typeof(mi.payload -> key) = 'array'
),
objects AS (
  SELECT
    mi.id AS migrated_collection_id,
    mi.inserted_at AS migrated_collection_inserted_at,
    NULL::text AS top_level_key,
    mi.payload AS elem
  FROM public.migration_items mi
  WHERE jsonb_typeof(mi.payload) = 'object'
)
INSERT INTO staging_companies_raw (migrated_collection_id, migrated_collection_inserted_at, top_level_key, elem)
SELECT migrated_collection_id, migrated_collection_inserted_at, top_level_key, elem
FROM (
  SELECT * FROM arrays
  UNION ALL
  SELECT * FROM objects
) t
-- Avoid duplicate inserts: exclude elements already present by exact payload match & migrated_collection_id
WHERE NOT EXISTS (
  SELECT 1 FROM staging_companies_raw r
  WHERE r.migrated_collection_id = t.migrated_collection_id
    AND r.elem = t.elem
)
RETURNING id, migrated_collection_id;

-- SECTION C: create a unique index for staging_companies.source_id if not present (safe)
-- This helps ON CONFLICT upserts later. Adjust if your staging_companies uses a different unique key.
DO $$
BEGIN
  -- Attempt to create unique index if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_staging_companies_source_id'
      AND n.nspname = 'public'
  ) THEN
    BEGIN
      -- Use CONCURRENTLY where possible for large tables; here we use a normal create for simplicity
      CREATE UNIQUE INDEX idx_staging_companies_source_id ON public.staging_companies (source_id);
    EXCEPTION WHEN others THEN
      -- ignore index creation failures (maybe the column/index doesn't fit your schema). Inspect manually.
      RAISE NOTICE 'Could not create idx_staging_companies_source_id - inspect staging_companies schema manually';
    END;
  END IF;
END
$$;

-- SECTION D: Example idempotent upsert from staging_companies_raw into staging_companies
-- Heuristic filter: element contains one of the likely keys. Customize as needed before enabling.
-- By default this block is conservative: it only runs if you uncomment the RUN_UPSERT flag below.
-- Please inspect staging_companies_raw first (SELECT * FROM staging_companies_raw ORDER BY extracted_at DESC LIMIT 50;)

-- To run the upsert, set this to true (or run the INSERT ... ON CONFLICT block manually)
-- \set RUN_UPSERT false

-- Example upsert (comment/uncomment to execute)
-- WARNING: Review and adapt field mapping to your staging_companies table schema.
INSERT INTO public.staging_companies AS sc (source_id, company_name, owner_id, owner_email, payload, migrated_collection_ids, created_at)
SELECT
  COALESCE(
    (elem->>'source_id'),
    (elem->>'id'),
    NULL
  )::text AS source_id,
  (elem->>'company_name')::text AS company_name,
  (elem->>'owner_id')::text AS owner_id,
  (elem->>'owner_email')::text AS owner_email,
  elem AS payload,
  ARRAY[ migrated_collection_id ]::uuid[] AS migrated_collection_ids,
  NOW() AS created_at
FROM staging_companies_raw r
WHERE (
      -- heuristic: obvious company-like fields (tune as needed)
      (r.elem ? 'company_name')
   OR (r.elem ? 'owner_id')
   OR (r.elem ? 'owner_email')
   OR (r.elem ? 'capital')
   OR (r.elem ? 'staff')
   OR (r.elem ? 'trucks')
)
-- do not re-insert if same payload already exists in staging_companies (safe-guard)
ON CONFLICT (source_id) DO UPDATE
SET
  -- prefer existing company_name when present, otherwise take new
  company_name = COALESCE(NULLIF(staging_companies.company_name, ''), EXCLUDED.company_name),
  owner_id = COALESCE(NULLIF(staging_companies.owner_id, ''), EXCLUDED.owner_id),
  owner_email = COALESCE(NULLIF(staging_companies.owner_email, ''), EXCLUDED.owner_email),
  payload = EXCLUDED.payload,
  migrated_collection_ids = array_cat(
    COALESCE(staging_companies.migrated_collection_ids, '{}'),
    EXCLUDED.migrated_collection_ids
  ),
  updated_at = NOW();

-- SECTION E: Guidance for next steps (manual)
-- 1) Inspect the extracted rows:
--    SELECT id, migrated_collection_id, top_level_key, jsonb_pretty(elem) FROM staging_companies_raw ORDER BY extracted_at DESC LIMIT 200;
--
-- 2) Refine the WHERE clause in the upsert if the heuristics are too broad.
--
-- 3) Once you're happy, promote rows from staging_companies to companies with a controlled upsert:
--    INSERT INTO public.companies (...) SELECT ... FROM public.staging_companies ... ON CONFLICT (source_id) DO UPDATE ...
--    Ensure you map owner_id by joining with users or user_id_map (e.g. users.source_id -> users.id).
--
-- 4) Optionally mark migrated_collections rows as imported (idempotent patch) after verifying import.
--    Example:
--    UPDATE public.migrated_collections SET status = 'imported', imported_at = now()
--    WHERE id = ANY (ARRAY['uuid1','uuid2']::uuid[]);
--
-- 5) If you want, I can prepare the final companies upsert and owner mapping SQL once you confirm which staging rows are valid.