-- migration_create_hub_locations.sql
--
-- Purpose:
--  - Create a canonical hub_locations table holding buildable / candidate hub sites.
--  - Add indexes, constraints and triggers for integrity and performance.
--  - Add location_id to existing hubs and link existing hubs based on source_id.
--  - Upsert initial records (Frankfurt, Zrenjanin).
--
-- Usage:
--  psql <conn> -f scripts/migration_create_hub_locations.sql
--
-- NOTE:
--  - The script creates the "pgcrypto" extension if missing so gen_random_uuid() is available.
--  - Test in staging and backup DB before running in production.
--

/* Ensure pgcrypto is available for gen_random_uuid() */
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

BEGIN;

--------------------------------------------------------------------------------
-- 1) Create hub_locations table (idempotent)
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hub_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text NOT NULL UNIQUE,            -- canonical short id (e.g. 'frankfurt')
  name text NOT NULL,                        -- human display name
  country text,                              -- human country name
  country_code text,                         -- optional ISO code
  region text,                               -- region tag (e.g. 'euro-asia')
  min_hub_level int DEFAULT 1,
  max_hub_level int DEFAULT 10,
  buildable boolean DEFAULT true,            -- is this site buildable?
  data jsonb DEFAULT '{}'::jsonb,            -- flexible metadata (capacity, cost, tags...)
  lat double precision,                      -- optional latitude
  lon double precision,                      -- optional longitude
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

--------------------------------------------------------------------------------
-- 2) Indexes & JSON GIN index
--------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS hub_locations_region_idx ON public.hub_locations (region);
CREATE INDEX IF NOT EXISTS hub_locations_buildable_idx ON public.hub_locations (buildable);
CREATE INDEX IF NOT EXISTS hub_locations_source_id_idx ON public.hub_locations (source_id);
CREATE INDEX IF NOT EXISTS hub_locations_data_gin ON public.hub_locations USING GIN (data);

--------------------------------------------------------------------------------
-- 3) Add location_id to hubs (if not present)
--------------------------------------------------------------------------------
ALTER TABLE public.hubs ADD COLUMN IF NOT EXISTS location_id uuid;

--------------------------------------------------------------------------------
-- 4) Upsert the two initial hub_locations rows
--------------------------------------------------------------------------------
INSERT INTO public.hub_locations (
  source_id, name, country, region, min_hub_level, max_hub_level, data, lat, lon
) VALUES
  ('frankfurt', 'Frankfurt', 'Germany', 'euro-asia', 1, 10, '{"capacity":100,"cost":50000}'::jsonb, NULL, NULL),
  ('zrenjanin', 'Zrenjanin', 'Serbia', 'euro-asia', 1, 3, '{"capacity":5,"cost":2000}'::jsonb, NULL, NULL)
ON CONFLICT (source_id) DO UPDATE
SET
  name = EXCLUDED.name,
  country = EXCLUDED.country,
  region = EXCLUDED.region,
  min_hub_level = LEAST(GREATEST(EXCLUDED.min_hub_level, 1), EXCLUDED.max_hub_level),
  max_hub_level = GREATEST(EXCLUDED.max_hub_level, EXCLUDED.min_hub_level),
  data = COALESCE(public.hub_locations.data, '{}'::jsonb) || EXCLUDED.data,
  updated_at = now();

--------------------------------------------------------------------------------
-- 5) Link existing hubs to hub_locations by source_id
--    Only update when different or NULL to reduce churn.
--------------------------------------------------------------------------------
UPDATE public.hubs h
SET location_id = hl.id
FROM public.hub_locations hl
WHERE h.source_id = hl.source_id
  AND (h.location_id IS NULL OR h.location_id <> hl.id);

--------------------------------------------------------------------------------
-- 6) Add foreign key constraint hubs.location_id -> hub_locations.id (if not exists)
--------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hubs_location_fkey'
  ) THEN
    ALTER TABLE public.hubs
      ADD CONSTRAINT hubs_location_fkey
      FOREIGN KEY (location_id)
      REFERENCES public.hub_locations (id)
      ON DELETE SET NULL;
  END IF;
END
$$;

--------------------------------------------------------------------------------
-- 7) Add check constraint for min/max hub level (if not exists)
--------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hub_locations_levels_check'
  ) THEN
    ALTER TABLE public.hub_locations
      ADD CONSTRAINT hub_locations_levels_check
      CHECK (min_hub_level >= 1 AND max_hub_level >= min_hub_level);
  END IF;
END
$$;

--------------------------------------------------------------------------------
-- 8) Trigger to update updated_at automatically for hub_locations
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_updated_at_hub_locations()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_hub_locations_touch_updated_at ON public.hub_locations;
CREATE TRIGGER trg_hub_locations_touch_updated_at
BEFORE UPDATE ON public.hub_locations
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at_hub_locations();

--------------------------------------------------------------------------------
-- 9) Helpful: ensure GIN index exists for hubs.data if you plan to query JSON there
--    (uncomment if you use JSON queries on hubs.data)
-- CREATE INDEX IF NOT EXISTS hubs_data_gin ON public.hubs USING GIN (data);

COMMIT;

/* End of migration script */
