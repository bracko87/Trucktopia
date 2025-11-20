/**
 * initial_schema.sql
 *
 * Minimal schema for verifying Supabase connectivity from the frontend.
 *
 * - Creates a small public table `app_users` for a simple SELECT test.
 * - Inserts a single test row.
 *
 * Instructions:
 * 1. Open your Supabase project -> SQL Editor -> New Query
 * 2. Paste the contents of this file and Run.
 * 3. Confirm the table `app_users` exists in Table Editor.
 */

-- Create a small table used for a simple connectivity test
create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- Insert a single test row (idempotent)
insert into public.app_users (name)
select 'Test user from frontend' 
where not exists (select 1 from public.app_users where name = 'Test user from frontend');