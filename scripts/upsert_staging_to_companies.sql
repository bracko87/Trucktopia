-- scripts/upsert_staging_to_companies.sql
-- Purpose:
--   Idempotent promotion of rows from public.staging_companies into public.companies.
--   - Creates a backup of affected companies
--   - Builds a normalized projection from staging_companies (uses common JSON keys as fallbacks)
--   - Inserts new companies or updates existing ones using ON CONFLICT (source_id)
--   - Updates only when incoming data is newer (prevents accidental downgrades)
--
-- Usage:
--   1) Inspect the preview (below) first:
--        psql <conn> -f scripts/upsert_staging_to_companies.sql -- set PREVIEW_ONLY = true
--   2) Run full upsert (ensure you have DB backups / run inside a transaction if desired).
--
-- Notes:
--   - This script assumes public.staging_companies has at least: source_id, owner_id, company_name, payload (jsonb) or node (jsonb) or inserted_at
--   - It will create public.companies_backup (LIKE companies) if it does not already exist and insert existing rows touched by this run.
--   - It does not automatically mark migrated_collections as imported. That step is included as a commented snippet for review.
--   - Adjust column list if your companies table contains additional required columns.

-- =========================
-- Configuration switch:
-- If you want to only preview rows (no writes), set PREVIEW_ONLY = true
-- In psql: \set PREVIEW_ONLY 'true'  OR run the file and then don't run the upsert block.
-- =========================

-- Preview: show staged rows to be promoted (run this first to review)
-- Helpful fields from staging_companies + JSON fallbacks
SELECT
  sc.id                                                     AS staging_id,
  sc.source_id,
  COALESCE(sc.company_name,
           (sc.node    ->> 'company_name'),
           (sc.payload ->> 'company_name'),
           (sc.payload ->> 'name'),
           (sc.node    ->> 'name')
  )                                                         AS name,
  sc.owner_id,
  COALESCE((sc.payload ->> 'capital'),
           (sc.node ->> 'capital')
  )::numeric                                                AS capital,
  COALESCE((sc.payload ->> 'level')::int,
           (sc.node ->> 'level')::int
  )                                                         AS level,
  COALESCE((sc.payload ->> 'reputation')::numeric,
           (sc.node ->> 'reputation')::numeric
  )                                                         AS reputation,
  COALESCE((sc.payload ->> 'owner_email'),
           (sc.node ->> 'owner_email'),
           (sc.payload ->> 'email'),
           (sc.node ->> 'email')
  )                                                         AS email,
  COALESCE((sc.payload ->> 'hub_name'),
           (sc.node ->> 'hub_name')
  )                                                         AS hub_name,
  COALESCE((sc.payload ->> 'hub_country'),
           (sc.node ->> 'hub_country')
  )                                                         AS hub_country,
  COALESCE((sc.payload ->> 'hub_region'),
           (sc.node ->> 'hub_region')
  )                                                         AS hub_region,
  COALESCE(sc.payload, sc.node, '{}'::jsonb)                AS data,
  COALESCE((sc.payload ->> 'created_at')::timestamptz, sc.inserted_at) AS created_at,
  sc.inserted_at                                             AS staging_inserted_at
FROM public.staging_companies sc
ORDER BY sc.inserted_at DESC
LIMIT 200;


-- ====== Safety backup of existing target rows ======
-- Create a backup table (once) that mirrors companies
CREATE TABLE IF NOT EXISTS public.companies_backup (LIKE public.companies INCLUDING ALL);

-- Insert any existing companies that will be touched into the backup (no-op on conflict)
INSERT INTO public.companies_backup
SELECT c.*
FROM public.companies c
WHERE c.source_id IS NOT NULL
  AND c.source_id IN (SELECT source_id FROM public.staging_companies)
ON CONFLICT DO NOTHING;


-- ====== Upsert block ======
-- NOTE: comment out the whole block if you only want a preview.
BEGIN;

WITH sc AS (
  SELECT
    sc.*,
    -- normalized fields with fallbacks; prefer explicit column values when available
    COALESCE(sc.company_name,
             (sc.node    ->> 'company_name'),
             (sc.payload ->> 'company_name'),
             (sc.payload ->> 'name'),
             (sc.node    ->> 'name')
    ) AS norm_name,
    COALESCE((sc.payload ->> 'capital'), (sc.node ->> 'capital'))::numeric AS norm_capital,
    COALESCE((sc.payload ->> 'level')::int, (sc.node ->> 'level')::int) AS norm_level,
    COALESCE((sc.payload ->> 'reputation')::numeric, (sc.node ->> 'reputation')::numeric) AS norm_reputation,
    COALESCE((sc.payload ->> 'owner_email'), (sc.node ->> 'owner_email'), (sc.payload ->> 'email'), (sc.node ->> 'email')) AS norm_email,
    COALESCE((sc.payload ->> 'hub_name'), (sc.node ->> 'hub_name')) AS norm_hub_name,
    COALESCE((sc.payload ->> 'hub_country'), (sc.node ->> 'hub_country')) AS norm_hub_country,
    COALESCE((sc.payload ->> 'hub_region'), (sc.node ->> 'hub_region')) AS norm_hub_region,
    COALESCE(sc.payload, sc.node, '{}'::jsonb) AS norm_data,
    COALESCE((sc.payload ->> 'created_at')::timestamptz, sc.inserted_at) AS norm_created_at,
    -- set incoming updated_at to now() by default (you can choose to use sc.inserted_at if preferred)
    COALESCE((sc.payload ->> 'updated_at')::timestamptz, now()) AS norm_updated_at
  FROM public.staging_companies sc
)
INSERT INTO public.companies (
  source_id,
  name,
  owner_id,
  capital,
  level,
  reputation,
  email,
  hub_name,
  hub_country,
  hub_region,
  data,
  created_at,
  updated_at
)
SELECT
  -- Ensure source_id exists. If missing, generate a deterministic fallback (you may prefer to skip such rows)
  COALESCE(source_id, md5(COALESCE(norm_name, '') || COALESCE(norm_email, '')) ) AS source_id,
  norm_name,
  owner_id,
  norm_capital,
  norm_level,
  norm_reputation,
  norm_email,
  norm_hub_name,
  norm_hub_country,
  norm_hub_region,
  norm_data,
  norm_created_at,
  norm_updated_at
FROM sc
ON CONFLICT (source_id) DO UPDATE
SET
  -- Prefer the incoming (EXCLUDED) values but keep existing values if incoming is NULL.
  name       = COALESCE(EXCLUDED.name, public.companies.name),
  owner_id   = COALESCE(EXCLUDED.owner_id, public.companies.owner_id),
  capital    = COALESCE(EXCLUDED.capital, public.companies.capital),
  level      = COALESCE(EXCLUDED.level, public.companies.level),
  reputation = COALESCE(EXCLUDED.reputation, public.companies.reputation),
  email      = COALESCE(EXCLUDED.email, public.companies.email),
  hub_name   = COALESCE(EXCLUDED.hub_name, public.companies.hub_name),
  hub_country= COALESCE(EXCLUDED.hub_country, public.companies.hub_country),
  hub_region = COALESCE(EXCLUDED.hub_region, public.companies.hub_region),
  -- Merge JSON: prefer keeping historic keys from companies.data and overlay/merge incoming data
  data       = COALESCE(public.companies.data, '{}'::jsonb) || COALESCE(EXCLUDED.data, '{}'::jsonb),
  -- Only update updated_at when incoming row is newer (prevents accidental back-dating)
  updated_at = CASE
                 WHEN public.companies.updated_at IS NULL THEN EXCLUDED.updated_at
                 WHEN EXCLUDED.updated_at >= public.companies.updated_at THEN EXCLUDED.updated_at
                 ELSE public.companies.updated_at
               END
WHERE public.companies.updated_at IS NULL OR EXCLUDED.updated_at >= public.companies.updated_at;

COMMIT;


-- ====== Post-upsert verification ======
-- Count how many staging rows exist and how many of those are now present in companies
SELECT
  (SELECT count(*) FROM public.staging_companies) AS staging_total,
  (SELECT count(*) FROM public.companies c WHERE c.source_id IN (SELECT source_id FROM public.staging_companies)) AS companies_matched;


-- ====== OPTIONAL: Map owner by owner_email (if owner_id missing) ======
-- Uncomment and run only if you need to populate owner_id from users.email for staging rows
-- UPDATE public.staging_companies sc
-- SET owner_id = u.id
-- FROM public.users u
-- WHERE sc.owner_id IS NULL
--   AND COALESCE(sc.owner_email, (sc.payload ->> 'owner_email')) = u.email;


-- ====== OPTIONAL: Mark migrated_collections imported (manual review recommended) ======
-- Many projects prefer to mark provenance rows after manual verification. The example below assumes
-- staging_companies contains a migrated_collection_id column or that you have a mapping table staging_company_candidates.
-- Uncomment and adapt only after you have manually verified results.
-- UPDATE public.migrated_collections mc
-- SET status = 'imported', imported_at = now()
-- WHERE mc.id IN (
--   SELECT DISTINCT migrated_collection_id FROM public.staging_company_candidates WHERE migration_item_id IS NOT NULL
-- );
