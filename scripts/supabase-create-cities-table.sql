-- scripts/supabase-create-cities-table.sql
-- 
-- Create and prepare a canonical "cities" table suitable for Supabase (Postgres + PostGIS).
-- Usage:
-- 1) Run this file in Supabase SQL editor or psql (connected to your Supabase DB).
-- 2) Import your CSV into a temporary staging table (or use the COPY example below).
-- 3) Run the idempotent upsert to synchronize into public.cities.
--
-- Notes:
-- - The table stores lat/lon as doubles and geom as geography(Point,4326) for spatial queries.
-- - Use lower(normalized_name) + country_code uniqueness to avoid duplicates while allowing
--   human-name variations.
-- - Keep 'source' and timestamps to track provenance for automated pipelines.
-- - Ensure you have the pgcrypto extension (gen_random_uuid) available on your Supabase DB.
--
-- File-level comment: Creates canonical cities table + helper indexes and sample import/upsert flow.

-- Ensure PostGIS is available (Supabase typically includes PostGIS)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Ensure gen_random_uuid is available (pgcrypto). Supabase usually has this too.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create canonical cities table
CREATE TABLE IF NOT EXISTS public.cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_name text NOT NULL,                -- original display name
  normalized_name text NOT NULL,          -- lowercased/normalized for matching
  country_code text,                      -- ISO-like code (lowercase preferred)
  country_name text,
  lat double precision,
  lon double precision,
  geom geography(Point,4326),             -- spatial point; populate from lat/lon
  source text,                            -- e.g. 'nominatim', 'migration_import', 'manual'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NULL
);

COMMENT ON TABLE public.cities IS 'Canonical city/hub table used by game backend. Stores coords and geography point for spatial queries';

-- Unique index to avoid duplicate (name+country) rows (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_cities_unique_name_country
  ON public.cities (lower(normalized_name), country_code);

-- Index on country_code for faster filtering by country
CREATE INDEX IF NOT EXISTS idx_cities_country_code ON public.cities (country_code);

-- Spatial index on geometry for fast spatial queries (nearest/within)
CREATE INDEX IF NOT EXISTS idx_cities_geom ON public.cities USING GIST (geom);

--------------------------------------------------------------------------------
-- Example: Import CSV into a temporary staging table (run locally or in SQL editor)
-- Prepare CSV with header: id,city_name,normalized_name,country_code,country_name,lat,lon,source
-- If you don't include id in CSV, leave the id column out and the staging will generate ids.
--------------------------------------------------------------------------------

-- Temporary staging table (use TEMP in a single session) - adjust columns to your CSV
CREATE TEMP TABLE staging_cities (
  id uuid,
  city_name text,
  normalized_name text,
  country_code text,
  country_name text,
  lat double precision,
  lon double precision,
  source text
);

-- If running psql locally (not available in Supabase SQL editor), use:
-- \copy staging_cities (id,city_name,normalized_name,country_code,country_name,lat,lon,source) FROM '/path/to/hubs_enriched.csv' CSV HEADER

-- If using Supabase UI import: import CSV directly into a permanent table or into staging_cities created in your DB.

--------------------------------------------------------------------------------
-- After CSV import into staging_cities, populate geom where lat/lon present
--------------------------------------------------------------------------------
UPDATE staging_cities
SET id = gen_random_uuid()
WHERE id IS NULL;

-- Populate geom on a persistent table (we will do this during upsert below for the target table).
-- For staging, we don't need to set geom - we'll use lat/lon values when upserting.

--------------------------------------------------------------------------------
-- Idempotent upsert from staging_cities -> public.cities
-- - Matches on id if provided, otherwise uses normalized_name+country_code uniqueness.
-- - Only updates fields when they differ (keeps updated_at stable otherwise).
--------------------------------------------------------------------------------

-- Upsert using a CTE to normalize input and avoid duplicate inserts in race conditions
WITH prepared AS (
  SELECT
    COALESCE(s.id, gen_random_uuid())::uuid AS id,
    s.city_name,
    COALESCE(NULLIF(s.normalized_name, ''), lower(s.city_name))::text AS normalized_name,
    lower(NULLIF(s.country_code, ''))::text AS country_code,
    s.country_name,
    s.lat,
    s.lon,
    s.source
  FROM staging_cities s
)
-- INSERT new rows that are not present by unique key
INSERT INTO public.cities (id, city_name, normalized_name, country_code, country_name, lat, lon, geom, source, created_at, updated_at)
SELECT
  p.id,
  p.city_name,
  p.normalized_name,
  p.country_code,
  p.country_name,
  p.lat,
  p.lon,
  CASE WHEN p.lat IS NOT NULL AND p.lon IS NOT NULL THEN ST_SetSRID(ST_MakePoint(p.lon,p.lat),4326)::geography ELSE NULL END,
  p.source,
  now(),
  now()
FROM prepared p
LEFT JOIN public.cities c
  ON (c.id = p.id) OR (lower(c.normalized_name) = lower(p.normalized_name) AND COALESCE(c.country_code,'') = COALESCE(p.country_code,''))
WHERE c.id IS NULL
ON CONFLICT (id) DO NOTHING; -- safety: if id already exists, skip

-- Then perform an UPDATE for existing rows, but only touch changed columns (uses IS DISTINCT FROM)
UPDATE public.cities c
SET
  city_name = p.city_name,
  normalized_name = p.normalized_name,
  country_code = p.country_code,
  country_name = p.country_name,
  lat = p.lat,
  lon = p.lon,
  geom = CASE WHEN p.lat IS NOT NULL AND p.lon IS NOT NULL THEN ST_SetSRID(ST_MakePoint(p.lon,p.lat),4326)::geography ELSE c.geom END,
  source = p.source,
  updated_at = now()
FROM prepared p
WHERE
  -- match existing row either by id or by normalized_name+country_code
  (
    c.id = p.id
    OR (lower(c.normalized_name) = lower(p.normalized_name) AND COALESCE(c.country_code,'') = COALESCE(p.country_code,''))
  )
  AND (
    c.city_name IS DISTINCT FROM p.city_name
    OR c.normalized_name IS DISTINCT FROM p.normalized_name
    OR c.country_code IS DISTINCT FROM p.country_code
    OR c.country_name IS DISTINCT FROM p.country_name
    OR c.lat IS DISTINCT FROM p.lat
    OR c.lon IS DISTINCT FROM p.lon
    OR ( (c.geom IS NULL) IS DISTINCT FROM (p.lat IS NOT NULL AND p.lon IS NOT NULL) )
  );

--------------------------------------------------------------------------------
-- Optional: cleanup staging_cities if it's permanent table (drop or truncate)
--------------------------------------------------------------------------------
-- DROP TABLE IF EXISTS staging_cities; -- uncomment if desired

--------------------------------------------------------------------------------
-- Useful validation queries
--------------------------------------------------------------------------------
-- Rows missing coordinates:
-- SELECT id, city_name, country_code, country_name FROM public.cities WHERE lat IS NULL OR lon IS NULL LIMIT 200;

-- Sample nearest-city query using PostGIS (find cities within 50km of a point)
-- SELECT id, city_name, country_code, lat, lon, ST_Distance(geom, ST_SetSRID(ST_MakePoint(<lon>,<lat>),4326)::geography) AS meters
-- FROM public.cities
-- WHERE geom IS NOT NULL
-- ORDER BY geom <-> ST_SetSRID(ST_MakePoint(<lon>,<lat>),4326)::geography
-- LIMIT 10;

-- End of script
