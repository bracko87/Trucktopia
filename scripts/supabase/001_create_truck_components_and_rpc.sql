-- 001_create_truck_components_and_rpc.sql
-- Purpose:
--   Create a canonical truck components table, a per-truck snapshot table, and
--   a PL/pgSQL RPC function rpc_apply_component_wear(...) that accepts component
--   updates (absolute values or deltas) and returns the authoritative component
--   state plus a computed overall condition.
--
-- Notes:
--   - This file is a safe starting point and includes comments where you'd add
--     RLS policies and further validation (company ownership checks).
--   - The RPC is SECURITY DEFINER; adjust the definers and policy rules to match
--     your Supabase project's security model before enabling in production.
--
-- Usage (example):
--   SELECT public.rpc_apply_component_wear(
--     '9f...-truck-uuid'::uuid,
--     '[{"component":"engine","delta":0.5},{"component":"tires","value":87}]'::jsonb,
--     'client', 'req-123'
--   );
--
-- Required PG extension for gen_random_uuid():
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) truck_components table (canonical per-component rows)
CREATE TABLE IF NOT EXISTS public.truck_components (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  truck_id uuid NOT NULL,
  component_key text NOT NULL,
  value numeric NOT NULL CHECK (value >= 0 AND value <= 100),
  updated_by uuid NULL,
  source text NULL,
  version integer NOT NULL DEFAULT 1,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (truck_id, component_key)
);

CREATE INDEX IF NOT EXISTS idx_truck_components_truck_id ON public.truck_components (truck_id);

-- 2) Snapshot table that stores computed overall condition and JSON components
CREATE TABLE IF NOT EXISTS public.truck_component_snapshot (
  truck_id uuid PRIMARY KEY,
  overall_condition numeric NOT NULL,
  components jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1
);

-- 3) RPC function: rpc_apply_component_wear
-- Accepts:
--   p_truck_id uuid
--   p_updates jsonb  -> expected to be an array of objects:
--      [{ "component":"engine", "delta": 0.3 }, { "component":"tires", "value": 86 }]
--      - "delta" treats the number as percent points to subtract from current value
--      - "value" sets an absolute value (0..100)
--   p_source text (optional) -> provenance (client|engine|worker)
--   p_request_id text (optional) -> idempotency / debugging aid
--
-- Returns:
--   jsonb {
--     components: { component_key: value, ... },
--     snapshot: { truck_id, overall_condition, computed_at, version, components },
--     offers: [ ... ]  -- reserved; empty array for stub (server might return offers)
--   }
CREATE OR REPLACE FUNCTION public.rpc_apply_component_wear(
  p_truck_id uuid,
  p_updates jsonb,
  p_source text DEFAULT 'client',
  p_request_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  elem jsonb;
  comp_key text;
  comp_delta numeric;
  comp_value numeric;
  inserted_component RECORD;
  -- weight mapping used for overall condition (must align with client logic)
  -- tune these weights for your game balance
  total_weight numeric := 0;
  weighted_sum numeric := 0;
  comp_row RECORD;
  components_json jsonb := '{}'::jsonb;
  snapshot_record RECORD;
BEGIN
  IF p_truck_id IS NULL THEN
    RAISE EXCEPTION 'truck_id is required';
  END IF;

  -- Validate p_updates shape: if null -> no-op but return current state
  IF p_updates IS NOT NULL THEN
    -- Iterate array of updates (if it's object single, normalize to array by caller)
    FOR elem IN SELECT * FROM jsonb_array_elements(p_updates)
    LOOP
      comp_key := NULL;
      comp_delta := NULL;
      comp_value := NULL;

      -- Extract fields permissively
      IF (elem ? 'component') THEN
        comp_key := (elem ->> 'component')::text;
      ELSIF (elem ? 'component_key') THEN
        comp_key := (elem ->> 'component_key')::text;
      END IF;

      IF comp_key IS NULL OR trim(comp_key) = '' THEN
        -- skip malformed entry
        CONTINUE;
      END IF;

      IF (elem ? 'delta') THEN
        comp_delta := (elem ->> 'delta')::numeric;
      END IF;

      IF (elem ? 'value') THEN
        comp_value := (elem ->> 'value')::numeric;
      END IF;

      -- If provided absolute value, clamp and use it. Otherwise compute new value using delta.
      IF comp_value IS NOT NULL THEN
        comp_value := GREATEST(0, LEAST(100, comp_value));
      ELSE
        -- fetch existing or default 100
        SELECT tc.value INTO comp_value
        FROM public.truck_components tc
        WHERE tc.truck_id = p_truck_id AND tc.component_key = comp_key
        LIMIT 1;

        IF comp_value IS NULL THEN
          comp_value := 100;
        END IF;

        IF comp_delta IS NOT NULL THEN
          comp_value := GREATEST(0, LEAST(100, comp_value - comp_delta));
        END IF;
      END IF;

      -- Upsert the component row (insert new or update existing)
      INSERT INTO public.truck_components (truck_id, component_key, value, updated_by, source, version, meta, updated_at)
      VALUES (
        p_truck_id,
        comp_key,
        comp_value,
        -- updated_by: attempt to read jwt.claim.sub if present (Supabase sets it into current_setting)
        NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid,
        p_source,
        1,
        jsonb_build_object('request_id', p_request_id, 'applied_at', now()),
        now()
      )
      ON CONFLICT (truck_id, component_key)
      DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = now(),
        source = EXCLUDED.source,
        version = public.truck_components.version + 1,
        updated_by = COALESCE(NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid, public.truck_components.updated_by),
        meta = public.truck_components.meta || EXCLUDED.meta
      RETURNING component_key, value INTO inserted_component;

      -- Merge into components_json progressively (client will reconcile if needed)
      components_json := components_json || jsonb_build_object(inserted_component.component_key, inserted_component.value);
    END LOOP;
  END IF;

  -- Recompute authoritative components for this truck (pull current state)
  components_json := (SELECT coalesce(jsonb_object_agg(component_key, value), '{}'::jsonb)
                      FROM public.truck_components
                      WHERE truck_id = p_truck_id);

  -- Compute weighted overall_condition using an importance mapping
  -- IMPORTANT: Keep this logic aligned with client weights to avoid surprises.
  SELECT
    SUM( (value::numeric) * CASE
      WHEN component_key = 'engine' THEN 0.30
      WHEN component_key = 'transmission' THEN 0.20
      WHEN component_key = 'tires' THEN 0.08
      WHEN component_key = 'brakes' THEN 0.06
      WHEN component_key = 'battery' THEN 0.03
      WHEN component_key = 'radiator' THEN 0.04
      WHEN component_key = 'alternator' THEN 0.02
      WHEN component_key = 'fuelSystem' THEN 0.03
      WHEN component_key = 'exhaust' THEN 0.025
      WHEN component_key = 'clutch' THEN 0.05
      WHEN component_key = 'steering' THEN 0.04
      ELSE 0.03
    END )::numeric AS weighted_sum,
    SUM( CASE
      WHEN component_key = 'engine' THEN 0.30
      WHEN component_key = 'transmission' THEN 0.20
      WHEN component_key = 'tires' THEN 0.08
      WHEN component_key = 'brakes' THEN 0.06
      WHEN component_key = 'battery' THEN 0.03
      WHEN component_key = 'radiator' THEN 0.04
      WHEN component_key = 'alternator' THEN 0.02
      WHEN component_key = 'fuelSystem' THEN 0.03
      WHEN component_key = 'exhaust' THEN 0.025
      WHEN component_key = 'clutch' THEN 0.05
      WHEN component_key = 'steering' THEN 0.04
      ELSE 0.03
    END )::numeric AS weight_total
  INTO weighted_sum, total_weight
  FROM public.truck_components
  WHERE truck_id = p_truck_id;

  IF total_weight IS NULL OR total_weight = 0 THEN
    -- fallback: when no components exist yet, treat overall as 100
    weighted_sum := 100 * 1;
    total_weight := 1;
  END IF;

  -- Calculate overall condition (0..100)
  snapshot_record.overall_condition := ROUND((weighted_sum / total_weight)::numeric, 4);

  -- Upsert snapshot table
  INSERT INTO public.truck_component_snapshot (truck_id, overall_condition, components, computed_at, version)
  VALUES (p_truck_id, snapshot_record.overall_condition, components_json, now(), 1)
  ON CONFLICT (truck_id)
  DO UPDATE SET
    overall_condition = EXCLUDED.overall_condition,
    components = EXCLUDED.components,
    computed_at = now(),
    version = public.truck_component_snapshot.version + 1
  RETURNING truck_id, overall_condition, components, computed_at, version INTO snapshot_record;

  -- Return authoritative payload. "offers" is a reserved key; engines/workers may populate it later.
  RETURN jsonb_build_object(
    'components', components_json,
    'snapshot', jsonb_build_object(
      'truck_id', snapshot_record.truck_id,
      'overall_condition', snapshot_record.overall_condition,
      'components', snapshot_record.components,
      'computed_at', snapshot_record.computed_at,
      'version', snapshot_record.version
    ),
    'offers', '[]'::jsonb
  );
END;
$$;

-- Helpful GRANT examples (adapt per your Supabase policy; don't use superuser keys on client)
-- GRANT EXECUTE ON FUNCTION public.rpc_apply_component_wear(uuid, jsonb, text, text) TO authenticated;
-- GRANT SELECT, INSERT, UPDATE ON public.truck_components TO authenticated;
-- GRANT SELECT, INSERT, UPDATE ON public.truck_component_snapshot TO authenticated;

-- IMPORTANT: Create row-level security policies that ensure only authorized users
-- can modify components for trucks that belong to their company. Example policy stub:
--
-- ALTER TABLE public.truck_components ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "components_modify_own_company" ON public.truck_components
--   FOR ALL
--   USING (
--     exists (
--       select 1 from companies c
--       where c.id = <resolve_truck_company_id_function>(truck_id)
--       and c.owner_id = current_setting('request.jwt.claim.sub', true)::uuid
--     )
--   );
--
-- Note: resolving truck -> company ownership often requires a trucks table with a company_id FK.
-- Implement that check in your environment and prefer server-side RPC for authoritative updates.