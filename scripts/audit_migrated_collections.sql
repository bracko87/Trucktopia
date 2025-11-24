-- audit_migrated_collections.sql
-- 
-- Purpose:
--   Idempotent SQL script to create an audit table and a function that checks
--   the migrated_collections table for missing/NULL collection_name values.
-- 
-- Usage:
--   1) Run this file once in your DB (Supabase SQL editor / psql).
--   2) Execute: SELECT * FROM public.audit_migrated_collections(); to run the audit
--      (this inserts a row into migrated_collections_audit and returns the audit row).
--   3) Inspect the table public.migrated_collections_audit for historical results.
-- 
-- Notes:
--   - The function aggregates up to 10 sample rows where collection_name IS NULL
--     into a JSONB array (missing_sample) to help debugging.
--   - The script is safe to re-run (CREATE TABLE IF NOT EXISTS / CREATE OR REPLACE FUNCTION).
--   - No external extensions required.

BEGIN;

-- 1) Audit table to store periodic checks
CREATE TABLE IF NOT EXISTS public.migrated_collections_audit (
  id bigserial PRIMARY KEY,
  checked_at timestamptz NOT NULL DEFAULT now(),
  total_rows bigint NOT NULL,
  missing_count bigint NOT NULL,
  missing_sample jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text
);

-- 2) Audit function
CREATE OR REPLACE FUNCTION public.audit_migrated_collections()
RETURNS TABLE (
  audit_id bigint,
  checked_at timestamptz,
  total_rows bigint,
  missing_count bigint,
  missing_sample jsonb,
  notes text
) AS $audit$
/**
 * audit_migrated_collections
 *
 * Run an audit of public.migrated_collections:
 * - Count total rows
 * - Count rows where collection_name IS NULL
 * - Capture up to 10 example rows (id, collection_key, migrated_at) as JSONB
 * - Insert a row into migrated_collections_audit and return it
 */
DECLARE
  v_total bigint := 0;
  v_missing bigint := 0;
  v_sample jsonb := '[]'::jsonb;
  v_notes text := '';
  v_rec record;
BEGIN
  -- Count totals
  SELECT count(*) INTO v_total FROM public.migrated_collections;
  SELECT count(*) INTO v_missing FROM public.migrated_collections WHERE collection_name IS NULL;

  -- Collect up to 10 sample rows where collection_name is NULL
  SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  INTO v_sample
  FROM (
    SELECT id, collection_key, migrated_at
    FROM public.migrated_collections
    WHERE collection_name IS NULL
    ORDER BY migrated_at DESC NULLS LAST
    LIMIT 10
  ) t;

  IF v_missing = 0 THEN
    v_notes := 'OK';
  ELSE
    v_notes := 'MISSING collection_name';
  END IF;

  -- Insert audit row
  INSERT INTO public.migrated_collections_audit (checked_at, total_rows, missing_count, missing_sample, notes)
  VALUES (now(), v_total, v_missing, v_sample, v_notes)
  RETURNING id, checked_at, total_rows, missing_count, missing_sample, notes
  INTO v_rec;

  -- Return the inserted row
  audit_id := v_rec.id;
  checked_at := v_rec.checked_at;
  total_rows := v_rec.total_rows;
  missing_count := v_rec.missing_count;
  missing_sample := v_rec.missing_sample;
  notes := v_rec.notes;
  RETURN NEXT;
END;
$audit$ LANGUAGE plpgsql VOLATILE;

COMMIT;

-- Quick example: after running the file, you can run:
-- SELECT * FROM public.audit_migrated_collections();