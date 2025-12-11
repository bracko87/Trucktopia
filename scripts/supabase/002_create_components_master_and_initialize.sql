-- 002_create_components_master_and_initialize.sql
--
-- Create a canonical master list of truck components and provide an RPC
-- that can initialize per-truck component rows (value = 100) for any truck.
--
-- Idempotent: safe to run multiple times.
--
-- Notes:
-- - This assumes a table public.truck_components already exists (created by 001_create_truck_components_and_rpc.sql).
-- - truck_components must have a unique constraint (truck_id, component_key).
-- - The RPC accepts a truck id (text/uuid) and upserts a row per master component only if missing.
-- - Add RLS policies after deploying so only authorised actors can call this RPC or modify rows.
--
-- Example usage:
-- SELECT * FROM rpc_initialize_truck_components('truck-abc-123');
--

BEGIN;

-- Create master table for components
CREATE TABLE IF NOT EXISTS public.truck_components_master (
  component_key text PRIMARY KEY,
  label text NOT NULL,
  importance numeric NOT NULL DEFAULT 1.0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed canonical components list with sensible importance weights.
-- Keys are chosen to match the keys used in client engines (camelCase where appropriate).
INSERT INTO public.truck_components_master (component_key, label, importance)
VALUES
  ('engine', 'Engine', 0.30),
  ('transmission', 'Transmission', 0.20),
  ('tires', 'Tires', 0.08),
  ('brakes', 'Brakes', 0.06),
  ('battery', 'Battery', 0.03),
  ('radiator', 'Radiator / Cooling System', 0.04),
  ('alternator', 'Alternator', 0.02),
  ('fuelSystem', 'Fuel System', 0.03),
  ('exhaust', 'Exhaust System', 0.025),
  ('clutch', 'Clutch Assembly', 0.05),
  ('steering', 'Steering Components', 0.04),
  ('suspension', 'Suspension', 0.035)
ON CONFLICT (component_key) DO UPDATE
  SET label = EXCLUDED.label,
      importance = EXCLUDED.importance;

-- Ensure the truck_components table exists (best-effort check).
-- If truck_components does not exist, the RPC below will fail until the earlier migration is applied.
-- The RPC below is defensive and will raise a clear error if the table is missing.

-- RPC: initialize a truck's components using the master list.
-- Accepts a truck id (text) and inserts a row for each master component if missing.
-- Returns the rows from truck_components for the truck.
CREATE OR REPLACE FUNCTION public.rpc_initialize_truck_components(p_truck_id text)
RETURNS TABLE(
  truck_id text,
  component_key text,
  value numeric,
  updated_at timestamptz,
  source text,
  version integer,
  meta jsonb
) AS $$
DECLARE
  rec record;
  _table_exists boolean := false;
BEGIN
  -- Verify target table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'truck_components'
  ) INTO _table_exists;

  IF NOT _table_exists THEN
    RAISE EXCEPTION 'Target table public.truck_components not found. Run the earlier migration that creates truck_components first.';
  END IF;

  FOR rec IN SELECT component_key FROM public.truck_components_master LOOP
    -- Insert an initial component row for the truck if missing.
    -- Expected truck_components columns: truck_id, component_key, value, updated_at, source, version, meta
    -- If your schema uses different column names or types, adapt the INSERT accordingly.
    INSERT INTO public.truck_components (truck_id, component_key, value, updated_at, source, version, meta)
    VALUES (p_truck_id, rec.component_key, 100::numeric, now(), 'init', 1, '{}'::jsonb)
    ON CONFLICT (truck_id, component_key) DO NOTHING;
  END LOOP;

  RETURN QUERY
    SELECT truck_id::text, component_key, value, updated_at, source, version, meta
    FROM public.truck_components
    WHERE truck_id = p_truck_id
    ORDER BY component_key;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- NOTE: SECURITY CONSIDERATIONS
-- - The function is marked SECURITY DEFINER so it can perform work even under row-level security.
-- - After deploying, create a specific policy that allows only authorized authenticated users (or service role) to call this RPC.
--   Example: grant execute on function public.rpc_initialize_truck_components(text) to web_role;
-- - Consider wrapping this RPC invocation in server-side code (Edge Function) that validates the caller company->truck ownership.

COMMIT;