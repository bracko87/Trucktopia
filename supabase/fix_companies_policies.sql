/*
  supabase/fix_companies_policies.sql

  File-level: Safe, idempotent SQL to ensure the "companies" table has the expected columns,
  backfill owner_email from existing data, and (re)create RLS policies and an index.

  Usage:
   - Open Supabase SQL editor, paste the entire file contents and run it as one query.
   - Or run the individual sections in order. Do not add extra characters outside the blocks.
*/

-- Ensure table exists (safe)
CREATE TABLE IF NOT EXISTS public.companies (
  id text PRIMARY KEY,
  owner_email text,
  data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Ensure columns exist (safe, idempotent)
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS data jsonb;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS owner_email text;

-- Backfill owner_email from JSON "data" field, if possible
UPDATE public.companies
SET owner_email = COALESCE(owner_email, data->>'owner_email', data->>'email')
WHERE owner_email IS NULL
  AND (data->>'owner_email' IS NOT NULL OR data->>'email' IS NOT NULL);

-- If there is an "email" column (plain column), update owner_email from it. Use a DO block with proper dollar-quoting.
DO $do$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'companies'
      AND column_name = 'email'
  ) THEN
    EXECUTE $exec$
      UPDATE public.companies
      SET owner_email = COALESCE(owner_email, email::text)
      WHERE owner_email IS NULL AND email IS NOT NULL;
    $exec$;
  END IF;
END;
$do$ LANGUAGE plpgsql;

-- If there is an "owner" column, attempt to backfill from it as well
DO $do$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'companies'
      AND column_name = 'owner'
  ) THEN
    EXECUTE $exec$
      UPDATE public.companies
      SET owner_email = COALESCE(owner_email, owner::text)
      WHERE owner_email IS NULL AND owner IS NOT NULL;
    $exec$;
  END IF;
END;
$do$ LANGUAGE plpgsql;

-- Re-create safe RLS policies (idempotent via DROP IF EXISTS)
DROP POLICY IF EXISTS "Allow authenticated insert with owner_email check" ON public.companies;
CREATE POLICY "Allow authenticated insert with owner_email check" ON public.companies
  FOR INSERT
  WITH CHECK (
    current_setting('jwt.claims.email') = owner_email
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Owners can select their companies" ON public.companies;
CREATE POLICY "Owners can select their companies" ON public.companies
  FOR SELECT
  USING (
    current_setting('jwt.claims.email') = owner_email
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Owners can update their companies" ON public.companies;
CREATE POLICY "Owners can update their companies" ON public.companies
  FOR UPDATE
  USING (
    current_setting('jwt.claims.email') = owner_email
    AND auth.role() = 'authenticated'
  )
  WITH CHECK (
    current_setting('jwt.claims.email') = owner_email
  );

DROP POLICY IF EXISTS "Owners can delete their companies" ON public.companies;
CREATE POLICY "Owners can delete their companies" ON public.companies
  FOR DELETE
  USING (
    current_setting('jwt.claims.email') = owner_email
    AND auth.role() = 'authenticated'
  );

-- Optional index
CREATE INDEX IF NOT EXISTS idx_companies_owner_email ON public.companies(owner_email);

-- Quick verification
SELECT id, owner_email, created_at FROM public.companies LIMIT 10;
