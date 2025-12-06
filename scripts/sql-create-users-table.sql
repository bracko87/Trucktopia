-- SQL: Create users table (safe schema for migrated imports)
-- Run in Supabase SQL editor (adjust column types to your needs)

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text UNIQUE,
  email text,
  name text,
  created_at timestamptz DEFAULT now(),
  user_metadata jsonb DEFAULT '{}'::jsonb
);

-- Helpful index for lookups
CREATE UNIQUE INDEX IF NOT EXISTS users_source_id_idx ON public.users (source_id);
