-- 001_add_world_id_and_enable_rls.sql
-- 
-- Migration script to add a world_id column (default: 'euroasia') to key tables,
-- backfill existing rows for the Euro-Asia world, and enable Row-Level Security (RLS)
-- constrained to the current request world.
--
-- IMPORTANT:
--  - Run this first on a staging copy of your Supabase database and confirm behavior.
--  - Take a full database backup before running on production.
--  - This script assumes a single Postgres schema "public". If you use different schemas,
--    adapt table identifiers accordingly.
--  - After running this migration, clients MUST set the session-level "request.world_id"
--    value before performing queries (instructions below and helper function).
--
-- Summary of what this script does:
-- 1) Add a text column "world_id" with DEFAULT 'euroasia' to a set of relevant tables.
-- 2) Backfill existing rows (set world_id = 'euroasia' where NULL).
-- 3) Create helper RPC function set_request_world(world text) to set the session variable.
-- 4) Enable RLS and create strict policies that require world_id match the session variable.
--    Policies use current_setting('request.world_id', true) so they rely on the session var.
-- 5) Keep service_role keys / Supabase server API unaffected (service_role bypasses RLS).
--
-- NOTE: This migration only enables logical separation for the Euro-Asia world.
--       When you create the American world, seed rows with world_id = 'american'.
--
-- Run: psql -h <host> -U <user> -d <db> -f 001_add_world_id_and_enable_rls.sql
-- Or use Supabase SQL editor to execute the file in staging first.

BEGIN;

-- 1) Add world_id column (if not exists) and backfill to 'euroasia'
-- List of common tables used in the project; add any other tables you use.
-- We use IF EXISTS guards for safety.
ALTER TABLE IF EXISTS public.companies ADD COLUMN IF NOT EXISTS world_id text DEFAULT 'euroasia';
ALTER TABLE IF EXISTS public.staff ADD COLUMN IF NOT EXISTS world_id text DEFAULT 'euroasia';
ALTER TABLE IF EXISTS public.trucks ADD COLUMN IF NOT EXISTS world_id text DEFAULT 'euroasia';
ALTER TABLE IF EXISTS public.trailers ADD COLUMN IF NOT EXISTS world_id text DEFAULT 'euroasia';
ALTER TABLE IF EXISTS public.cities ADD COLUMN IF NOT EXISTS world_id text DEFAULT 'euroasia';
ALTER TABLE IF EXISTS public.hubs ADD COLUMN IF NOT EXISTS world_id text DEFAULT 'euroasia';
ALTER TABLE IF EXISTS public.jobs ADD COLUMN IF NOT EXISTS world_id text DEFAULT 'euroasia';
ALTER TABLE IF EXISTS public.offers ADD COLUMN IF NOT EXISTS world_id text DEFAULT 'euroasia';
ALTER TABLE IF EXISTS public.incoming_deliveries ADD COLUMN IF NOT EXISTS world_id text DEFAULT 'euroasia';
ALTER TABLE IF EXISTS public.manifests ADD COLUMN IF NOT EXISTS world_id text DEFAULT 'euroasia';
ALTER TABLE IF EXISTS public.storage_items ADD COLUMN IF NOT EXISTS world_id text DEFAULT 'euroasia';
ALTER TABLE IF EXISTS public.prices ADD COLUMN IF NOT EXISTS world_id text DEFAULT 'euroasia';
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS world_id text DEFAULT 'euroasia';
-- Add more ALTER TABLE ... ADD COLUMN IF NOT EXISTS ... lines for any other application tables.

-- Backfill any NULL world_id to 'euroasia' (safety)
UPDATE public.companies SET world_id = 'euroasia' WHERE world_id IS NULL;
UPDATE public.staff SET world_id = 'euroasia' WHERE world_id IS NULL;
UPDATE public.trucks SET world_id = 'euroasia' WHERE world_id IS NULL;
UPDATE public.trailers SET world_id = 'euroasia' WHERE world_id IS NULL;
UPDATE public.cities SET world_id = 'euroasia' WHERE world_id IS NULL;
UPDATE public.hubs SET world_id = 'euroasia' WHERE world_id IS NULL;
UPDATE public.jobs SET world_id = 'euroasia' WHERE world_id IS NULL;
UPDATE public.offers SET world_id = 'euroasia' WHERE world_id IS NULL;
UPDATE public.incoming_deliveries SET world_id = 'euroasia' WHERE world_id IS NULL;
UPDATE public.manifests SET world_id = 'euroasia' WHERE world_id IS NULL;
UPDATE public.storage_items SET world_id = 'euroasia' WHERE world_id IS NULL;
UPDATE public.prices SET world_id = 'euroasia' WHERE world_id IS NULL;
UPDATE public.users SET world_id = 'euroasia' WHERE world_id IS NULL;

-- 2) Create a small helper RPC that sets a session-local GUC 'request.world_id'.
--    The application may call this RPC at the start of a request/session so that
--    RLS policies can use current_setting('request.world_id').
--
--    IMPORTANT SECURITY NOTE:
--    - This function is created SECURITY DEFINER so it can set the GUC for the session;
--      check the owner and permissions in your environment. In Supabase, authenticated
--      users calling this RPC will set their session variable only for their session.
--    - If you prefer to avoid SECURITY DEFINER, you might set the world via a server-side
--      proxy which sets the config before queries; choose the model that fits your security needs.
CREATE OR REPLACE FUNCTION public.set_request_world(w TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('request.world_id', w, true);
  RETURN current_setting('request.world_id', true);
END;
$$;

-- Grant execute to authenticated (optional; adjust according to your security model)
GRANT EXECUTE ON FUNCTION public.set_request_world(TEXT) TO authenticated;

-- 3) Enable Row-Level Security and create policies for each table
--    We wrap creation in DO blocks that check for table existence to be idempotent.

-- Helper DO block generator for tables: companies, staff, trucks, trailers, cities, hubs, jobs, offers, ...
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'companies','staff','trucks','trailers','cities','hubs','jobs','offers',
    'incoming_deliveries','manifests','storage_items','prices','users'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE c.relname = tbl AND n.nspname = 'public') THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);

      -- Drop existing similarly-named policies if present to avoid duplicates on re-run
      BEGIN
        EXECUTE format('DROP POLICY IF EXISTS rls_select_world ON public.%I;', tbl);
        EXECUTE format('DROP POLICY IF EXISTS rls_insert_world ON public.%I;', tbl);
        EXECUTE format('DROP POLICY IF EXISTS rls_update_world ON public.%I;', tbl);
        EXECUTE format('DROP POLICY IF EXISTS rls_delete_world ON public.%I;', tbl);
      EXCEPTION WHEN OTHERS THEN
        -- ignore
      END;

      -- SELECT: allow only rows where world_id equals session's request.world_id
      EXECUTE format($pol$CREATE POLICY rls_select_world ON public.%I FOR SELECT USING (world_id = current_setting(''request.world_id'', true));$pol$, tbl);

      -- INSERT: only allow inserts when the inserted row's world_id matches the session value
      EXECUTE format($pol$CREATE POLICY rls_insert_world ON public.%I FOR INSERT WITH CHECK (world_id = current_setting(''request.world_id'', true));$pol$, tbl);

      -- UPDATE: only allow updating rows that belong to the session world and ensure updated world_id still matches
      EXECUTE format($pol$CREATE POLICY rls_update_world ON public.%I FOR UPDATE USING (world_id = current_setting(''request.world_id'', true)) WITH CHECK (world_id = current_setting(''request.world_id'', true));$pol$, tbl);

      -- DELETE: only allow deleting rows that belong to the session world
      EXECUTE format($pol$CREATE POLICY rls_delete_world ON public.%I FOR DELETE USING (world_id = current_setting(''request.world_id'', true));$pol$, tbl);

    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 4) Final notes: commit
COMMIT;

-- End of migration file.
