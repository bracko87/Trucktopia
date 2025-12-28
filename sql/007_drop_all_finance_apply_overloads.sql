/**
 * 007_drop_all_finance_apply_overloads.sql
 *
 * Drop ALL public.finance_apply overloads safely by enumerating functions in
 * the public schema and issuing DROP FUNCTION for each exact signature.
 *
 * Usage:
 *  - Run this as a DB superuser/service-role in your Supabase SQL editor or psql.
 *  - After execution refresh the PostgREST / Supabase REST schema cache.
 *
 * This approach avoids guessing signatures and ensures every overloaded variant
 * is removed so the Netlify function won't be confused by RPC overloads.
 */

DO $$
DECLARE
  f record;
  sig text;
BEGIN
  FOR f IN
    SELECT p.oid, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'finance_apply' AND n.nspname = 'public'
  LOOP
    sig := pg_get_function_identity_arguments(f.oid);
    RAISE NOTICE 'Dropping function: %(% )', f.proname, sig;
    EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s);', f.proname, sig);
  END LOOP;
END
$$ LANGUAGE plpgsql;