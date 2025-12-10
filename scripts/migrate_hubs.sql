/*
/**
 * scripts/migrate_hubs.sql
 *
 * @fileoverview
 * Idempotent migration script to extract hubs / cities from migration_items
 * and upsert them into a canonical public.hubs table.
 *
 * Goals:
 * - Create staging_hubs for safe inspection and provenance (preserves migrated_item id).
 * - Normalize typical hub fields (source_id, name, city, country, lat, lon, hub_level).
 * - Upsert into public.hubs using source_id as the stable key if available.
 * - Provide preview/validation queries to run before applying destructive operations.
 *
 * Usage:
 *  - Preview mode: run the file but only execute the SELECT preview sections.
 *  - To run the full staging + upsert: execute the script after reviewing preview outputs.
 *
 * Safety:
 * - All CREATE statements are guarded with IF NOT EXISTS (idempotent).
 * - Staging inserts avoid duplicates by checking exact jsonb element existence and migrated_item id.
 * - Upsert uses ON CONFLICT (source_id) DO UPDATE — safe to re-run.
 * - The script does not delete or modify source migration tables.
 *
 * Notes:
 * - This script assumes migration_items table has at least: id, collection_name, migrated_collection_id, item (jsonb), inserted_at.
 * - Adjust JSON field accessors to match your actual migration_items schema if it differs.
 * - Requires pgcrypto (gen_random_uuid()) for hub id generation; the script creates the extension if missing.
 */
 
-- Ensure extension for gen_random_uuid exists (safe to run)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
 
-- 1) Create staging table for hub items (idempotent)
CREATE TABLE IF NOT EXISTS public.staging_hubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_item_id text,
  migrated_collection_id text,
  collection_name text,
  elem jsonb NOT NULL,
  extracted_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.staging_hubs IS 'Staging table containing candidate hub elements extracted from migration_items (provenance preserved).';
 
-- 2) Create canonical hubs table if missing (idempotent)
CREATE TABLE IF NOT EXISTS public.hubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text UNIQUE,
  name text,
  city text,
  country text,
  lat double precision,
  lon double precision,
  hub_level integer,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NULL
);
COMMENT ON TABLE public.hubs IS 'Canonical hubs table (locations).';
 
-- Index to speed up lookups by country/city
CREATE INDEX IF NOT EXISTS idx_hubs_country_city ON public.hubs ((lower(country)), (lower(city)));
CREATE UNIQUE INDEX IF NOT EXISTS idx_hubs_source_id_unique ON public.hubs (source_id) WHERE source_id IS NOT NULL;
 
-- 3) Preview: find candidate migration_items likely to contain hubs
-- Run these SELECTs first to validate candidate set before inserting into staging.
-- a) Total candidate count
SELECT
  COUNT(*) AS candidate_count
FROM migration_items mi
WHERE
  (
    mi.collection_name ILIKE '%hub%' OR
    mi.collection_name ILIKE '%hubs%' OR
    (mi.item ? 'hubs') OR
    (mi.item ? 'hub') OR
    (mi.item ? 'location') OR
    (mi.item ? 'city') OR
    (mi.item ? 'country') OR
    (mi.item ->> 'type') = 'hub'
  );

-- b) Sample candidates (show first 30 for inspection)
SELECT
  mi.id AS migration_item_id,
  mi.migrated_collection_id,
  mi.collection_name,
  jsonb_pretty(mi.item) AS item_preview
FROM migration_items mi
WHERE
  (
    mi.collection_name ILIKE '%hub%' OR
    mi.collection_name ILIKE '%hubs%' OR
    (mi.item ? 'hubs') OR
    (mi.item ? 'hub') OR
    (mi.item ? 'location') OR
    (mi.item ? 'city') OR
    (mi.item ? 'country') OR
    (mi.item ->> 'type') = 'hub'
  )
ORDER BY mi.inserted_at DESC NULLS LAST
LIMIT 30;
 
-- 4) Extraction: insert candidate elements into staging_hubs (idempotent)
-- This logic handles:
--  - migration_items.item as an object representing a hub
--  - migration_items.item containing arrays named 'hubs' or similar (jsonb_array_elements)
--  - avoids inserting exact duplicates (same migration_item_id + elem)
 
WITH
-- extract arrays present under common keys (hubs, data.hubs, payload.hubs, items) into rows
array_elements AS (
  SELECT
    mi.id::text AS migration_item_id,
    mi.migrated_collection_id::text AS migrated_collection_id,
    mi.collection_name,
    jsonb_array_elements(mi.item -> 'hubs') AS elem
  FROM migration_items mi
  WHERE mi.item ? 'hubs'
  UNION ALL
  SELECT
    mi.id::text AS migration_item_id,
    mi.migrated_collection_id::text AS migrated_collection_id,
    mi.collection_name,
    jsonb_array_elements(mi.item -> 'data' -> 'hubs') AS elem
  FROM migration_items mi
  WHERE mi.item -> 'data' ? 'hubs'
  UNION ALL
  SELECT
    mi.id::text AS migration_item_id,
    mi.migrated_collection_id::text AS migrated_collection_id,
    mi.collection_name,
    jsonb_array_elements(mi.item -> 'items') AS elem
  FROM migration_items mi
  WHERE mi.item ? 'items'
),
-- extract top-level objects that look like a hub
object_elements AS (
  SELECT
    mi.id::text AS migration_item_id,
    mi.migrated_collection_id::text AS migrated_collection_id,
    mi.collection_name,
    mi.item AS elem
  FROM migration_items mi
  WHERE
    (
      mi.collection_name ILIKE '%hub%' OR
      mi.collection_name ILIKE '%hubs%' OR
      (mi.item ->> 'type') = 'hub' OR
      (mi.item ? 'city') OR
      (mi.item ? 'country') OR
      (mi.item ? 'location')
    )
)
-- Insert only elements that are not already present in staging_hubs (by migration_item_id + elem)
INSERT INTO public.staging_hubs (migration_item_id, migrated_collection_id, collection_name, elem)
SELECT ae.migration_item_id, ae.migrated_collection_id, ae.collection_name, ae.elem
FROM (
  SELECT * FROM array_elements
  UNION ALL
  SELECT * FROM object_elements
) ae
LEFT JOIN public.staging_hubs sh
  ON sh.migration_item_id = ae.migration_item_id
  AND sh.elem = ae.elem
WHERE sh.id IS NULL;
 
-- 5) Preview staging results (run after the extraction above)
-- a) How many staging rows were added?
SELECT COUNT(*) AS staging_hubs_count FROM public.staging_hubs;
 
-- b) Show sample staging entries missing coordinates (useful to spot incomplete data)
SELECT id, migration_item_id, migrated_collection_id, collection_name, jsonb_pretty(elem) AS elem_preview
FROM public.staging_hubs
WHERE ( (elem->'location' ->> 'lat') IS NULL AND (elem->>'lat') IS NULL )
  OR ( (elem->'location' ->> 'lon') IS NULL AND (elem->>'lon') IS NULL )
LIMIT 50;
 
-- c) Sample staging entries with available lat/lon
SELECT id, migration_item_id, migrated_collection_id, collection_name,
  COALESCE( (elem->'location'->>'lat'), elem->>'lat' ) AS lat,
  COALESCE( (elem->'location'->>'lon'), elem->>'lon' ) AS lon,
  elem ->> 'name' AS name,
  elem ->> 'city' AS city,
  elem ->> 'country' AS country,
  jsonb_pretty(elem) AS elem_preview
FROM public.staging_hubs
WHERE COALESCE( (elem->'location'->>'lat'), elem->>'lat' ) IS NOT NULL
  AND COALESCE( (elem->'location'->>'lon'), elem->>'lon' ) IS NOT NULL
LIMIT 100;
 
-- 6) Upsert staging rows into canonical public.hubs (idempotent)
-- Extract normalized columns and use source_id preference:
-- source_id: elem->>'source_id' OR elem->>'id' OR migrated_collection_id
-- name: elem->>'name' or elem->>'hub_name'
-- city/country: various paths (elem->>'city' or elem->'location'->>'city')
-- lat/lon: coalesced from elem->'location'->>'lat' OR elem->>'lat'
-- hub_level: elem->>'level' or elem->>'hub_level'
 
-- WARNING: preview the rows to be upserted before running the UPDATE/INSERT below.
-- The following statement performs the upsert. Run it when you're ready.
 
BEGIN;
WITH prepared AS (
  SELECT
    sh.id AS staging_id,
    sh.migration_item_id,
    sh.migrated_collection_id,
    -- prefer an explicit source_id from payload, fallback to migrated_collection_id as provenance key
    COALESCE(
      NULLIF(sh.elem ->> 'source_id', ''),
      NULLIF(sh.elem ->> 'id', ''),
      NULLIF(sh.elem ->> 'hub_id', ''),
      sh.migrated_collection_id
    )::text AS source_id,
    COALESCE(sh.elem ->> 'name', sh.elem ->> 'hub_name', sh.elem ->> 'title') AS name,
    COALESCE(sh.elem ->> 'city', sh.elem -> 'location' ->> 'city', sh.elem -> 'address' ->> 'city') AS city,
    COALESCE(sh.elem ->> 'country', sh.elem -> 'location' ->> 'country', sh.elem -> 'address' ->> 'country') AS country,
    NULLIF(COALESCE(sh.elem -> 'location' ->> 'lat', sh.elem ->> 'lat'), '')::double precision AS lat,
    NULLIF(COALESCE(sh.elem -> 'location' ->> 'lon', sh.elem ->> 'lon'), '')::double precision AS lon,
    NULLIF(COALESCE(sh.elem ->> 'level', sh.elem ->> 'hub_level'), '')::int AS hub_level,
    sh.elem AS data,
    COALESCE(
      NULLIF(sh.elem ->> 'createdAt', ''), 
      NULLIF(sh.elem ->> 'created_at', ''),
      NULLIF(sh.elem ->> 'inserted_at', ''),
      now()::text
    )::timestamptz AS created_at
  FROM public.staging_hubs sh
)
-- Upsert into hubs using source_id uniqueness; if source_id is null we try to match on a fingerprint (name+city+country)
INSERT INTO public.hubs (source_id, name, city, country, lat, lon, hub_level, data, created_at, updated_at)
SELECT
  p.source_id,
  p.name,
  p.city,
  p.country,
  p.lat,
  p.lon,
  p.hub_level,
  p.data,
  p.created_at,
  now() AS updated_at
FROM prepared p
ON CONFLICT (source_id) WHERE source_id IS NOT NULL
DO UPDATE SET
  name = COALESCE(EXCLUDED.name, public.hubs.name),
  city = COALESCE(EXCLUDED.city, public.hubs.city),
  country = COALESCE(EXCLUDED.country, public.hubs.country),
  lat = COALESCE(EXCLUDED.lat, public.hubs.lat),
  lon = COALESCE(EXCLUDED.lon, public.hubs.lon),
  hub_level = COALESCE(EXCLUDED.hub_level, public.hubs.hub_level),
  data = public.hubs.data || EXCLUDED.data,
  updated_at = now();
 
-- For rows where source_id is NULL, attempt to merge by fingerprint (name+city+country) to avoid duplicates.
-- This is optional and will only insert when no matching name+city+country exists.
WITH prepared_null_source AS (
  SELECT *
  FROM prepared
  WHERE source_id IS NULL OR trim(source_id) = ''
)
INSERT INTO public.hubs (source_id, name, city, country, lat, lon, hub_level, data, created_at, updated_at)
SELECT
  -- create a generated stable source id for provenance (prefix 'gen:')
  ('gen:' || md5(coalesce(name,'') || '|' || coalesce(city,'') || '|' || coalesce(country,'') || '|' || COALESCE((data->>'id'), ''))) AS source_id,
  name, city, country, lat, lon, hub_level, data, created_at, now()
FROM prepared_null_source pns
WHERE NOT EXISTS (
  SELECT 1 FROM public.hubs h
  WHERE
    lower(coalesce(h.name,'')) = lower(coalesce(pns.name,'')) AND
    lower(coalesce(h.city,'')) = lower(coalesce(pns.city,'')) AND
    lower(coalesce(h.country,'')) = lower(coalesce(pns.country,''))
);
COMMIT;
 
-- 7) Validation queries after upsert: counts and samples
-- a) Total hubs count
SELECT COUNT(*) AS hubs_total FROM public.hubs;
 
-- b) Hubs without coordinates (might be OK for some cases)
SELECT id, source_id, name, city, country, data
FROM public.hubs
WHERE lat IS NULL OR lon IS NULL
LIMIT 200;
 
-- c) Potential duplicates by name+city+country (case-insensitive)
SELECT lower(name) AS name_l, lower(city) AS city_l, lower(country) AS country_l, count(*) AS ct, array_agg(id) AS ids
FROM public.hubs
GROUP BY name_l, city_l, country_l
HAVING count(*) > 1
LIMIT 200;
 
-- 8) Optional: mark migrating items / migrated_collections as imported (dry-run preview)
-- NOTE: adapt the source of migrated ids (we used migrated_collection_id stored in staging_hubs)
-- Preview the migrated_collections rows that contributed to hubs:
SELECT DISTINCT sh.migrated_collection_id AS migrated_id, mc.collection_name, mc.status, mc.inserted_at, mc.imported_at
FROM public.staging_hubs sh
LEFT JOIN public.migrated_collections mc ON mc.id::text = sh.migrated_collection_id
ORDER BY mc.inserted_at DESC NULLS LAST
LIMIT 200;
 
-- If preview looks good, you can mark those migrated_collections as imported (uncomment to apply).
-- BEGIN;
-- WITH ids AS (
--   SELECT DISTINCT migrated_collection_id::uuid AS id FROM public.staging_hubs WHERE migrated_collection_id IS NOT NULL
-- )
-- UPDATE public.migrated_collections mc
-- SET status = 'imported', imported_at = COALESCE(mc.imported_at, now())
-- FROM ids
-- WHERE mc.id = ids.id AND mc.status IS DISTINCT FROM 'imported';
-- COMMIT;
 
-- 9) Optional housekeeping: create a trigger to touch updated_at on hubs updates
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
 
DROP TRIGGER IF EXISTS trg_hubs_touch_updated_at ON public.hubs;
CREATE TRIGGER trg_hubs_touch_updated_at
BEFORE UPDATE ON public.hubs
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();
 
-- End of script
