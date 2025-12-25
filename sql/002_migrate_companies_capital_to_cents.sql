-- 002_migrate_companies_capital_to_cents.sql
-- WARNING: run in a safe window and backup before migrating production data.
-- This converts companies.capital from numeric/float to bigint cents.
-- Adjust the USING expression if capital is stored as integer already.

-- 1) Add new column temporary
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS capital_cents bigint;

-- 2) Populate capital_cents from existing capital (assumes capital is stored as numeric/decimal with 2 decimals)
UPDATE public.companies
SET capital_cents = CASE
  WHEN capital IS NULL THEN 0
  ELSE ROUND((capital::numeric) * 100)::bigint
END;

-- 3) Validate (manual check recommended)
-- SELECT id, capital, capital_cents FROM public.companies LIMIT 20;

-- 4) When validated, drop old column and rename (do this in a single maintenance window)
-- ALTER TABLE public.companies DROP COLUMN capital;
-- ALTER TABLE public.companies RENAME COLUMN capital_cents TO capital;
-- Note: update your application to treat companies.capital as integer cents.
