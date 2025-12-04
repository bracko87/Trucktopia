-- add_source_id_unique_indexes.sql
-- Purpose: Ensure deterministic upsert behaviour by creating UNIQUE indexes on source_id
-- for the sandbox tables (users, companies, hubs). These indexes only apply to non-NULL
-- source_id values so we avoid conflicts for intentionally NULL source_id rows.
-- Run this in your Supabase SQL editor. The statements are idempotent (use IF NOT EXISTS).

-- Ensure pgcrypto (for gen_random_uuid) is enabled if you plan to create new rows elsewhere
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- USERS: unique index on source_id (non-null) + email index
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND c.relname = 'users_source_id_unique'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX users_source_id_unique ON public.users (source_id) WHERE source_id IS NOT NULL';
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS users_email_idx ON public.users (lower(email));
CREATE INDEX IF NOT EXISTS users_source_id_idx ON public.users (source_id);

-- COMPANIES: unique index on source_id (non-null) + name index
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND c.relname = 'companies_source_id_unique'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX companies_source_id_unique ON public.companies (source_id) WHERE source_id IS NOT NULL';
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS companies_name_idx ON public.companies (lower(name));
CREATE INDEX IF NOT EXISTS companies_source_id_idx ON public.companies (source_id);

-- HUBS: unique index on source_id (non-null) + name index
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND c.relname = 'hubs_source_id_unique'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX hubs_source_id_unique ON public.hubs (source_id) WHERE source_id IS NOT NULL';
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS hubs_name_idx ON public.hubs (lower(name));
CREATE INDEX IF NOT EXISTS hubs_source_id_idx ON public.hubs (source_id);

-- Quick verification queries you can run after this SQL finishes:
-- 1) Show the created unique indexes:
--    SELECT schemaname, tablename, indexname, indexdef FROM pg_indexes WHERE indexname IN ('users_source_id_unique','companies_source_id_unique','hubs_source_id_unique');

-- 2) Confirm no duplicate source_id values exist (should be true in empty tables):
--    SELECT source_id, count(*) FROM public.users WHERE source_id IS NOT NULL GROUP BY source_id HAVING count(*) > 1;
--    SELECT source_id, count(*) FROM public.companies WHERE source_id IS NOT NULL GROUP BY source_id HAVING count(*) > 1;
--    SELECT source_id, count(*) FROM public.hubs WHERE source_id IS NOT NULL GROUP BY source_id HAVING count(*) > 1;

-- Notes:
-- - PostgREST's on_conflict parameter requires a unique index/constraint on the given column(s).
-- - Partial unique indexes (WHERE source_id IS NOT NULL) are standard practice to allow multiple NULLs,
--   while ensuring uniqueness for supplied source ids.
