/**
 * create_sandbox_tables.sql
 *
 * SQL DDL to create supabase sandbox tables for initial migration:
 * - users
 * - companies
 * - hubs
 *
 * Design choices:
 * - Each table has an UUID primary key (gen_random_uuid()).
 * - Preserve original source ids in `source_id` (unique index) to support idempotent upserts.
 * - Keep raw object in `data` (jsonb) for speed and flexibility.
 * - Add a few normalized columns (email, name) for queries/indexes.
 * - created_at/updated_at timestamps included.
 *
 * Run in Supabase SQL editor (requires pgcrypto extension for gen_random_uuid()):
 *   CREATE EXTENSION IF NOT EXISTS "pgcrypto";
 *   \i scripts/ddl/create_sandbox_tables.sql
 */

-- Ensure pgcrypto is enabled for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text UNIQUE, -- preserve original id from sider.ai
  email text,
  name text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb, -- original object for reference & fast inserts
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS users_email_idx ON public.users (lower(email));
CREATE INDEX IF NOT EXISTS users_source_id_idx ON public.users (source_id);

-- Companies table
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text UNIQUE,
  name text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS companies_name_idx ON public.companies (lower(name));
CREATE INDEX IF NOT EXISTS companies_source_id_idx ON public.companies (source_id);

-- Hubs (locations) table
CREATE TABLE IF NOT EXISTS public.hubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text UNIQUE,
  name text,
  location jsonb, -- { city, country, lat, lon, ... }
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS hubs_name_idx ON public.hubs (lower(name));
CREATE INDEX IF NOT EXISTS hubs_source_id_idx ON public.hubs (source_id);

-- Note:
-- We rely on `source_id` uniqueness to drive upsert behavior. If your source payloads have an `id` field,
-- the migration payload should map that to `source_id` in the rows we upsert below.