/**
 * supabase/companies_schema.sql
 *
 * File-level: SQL schema for a simple companies table and recommended RLS policies.
 *
 * Usage:
 * 1. Open your Supabase project -> SQL Editor -> New Query.
 * 2. Paste the contents of this file and run it.
 *
 * Notes:
 * - This schema stores the full company object in a JSONB column named "data".
 * - Row-Level Security (RLS) is enabled and policies ensure authenticated users may
 *   insert/select/update/delete only their own company rows (owner_email matched against JWT claims).
 * - The policies use current_setting('jwt.claims.email') to compare the email from the auth JWT.
 *   Make sure your Supabase project's JWT includes the user's email claim (default behaviour).
 *
 * After running this you can let the client (src/contexts/GameContext.tsx) insert rows via the anon key
 * for authenticated users. For bulk migration of existing local users, use the service_role key on a
 * secure machine and a server-side script (I can prepare that if you choose option A).
 */

-- Create companies table
create table if not exists public.companies (
  id text primary key,
  owner_email text not null,
  data jsonb,
  created_at timestamptz default now()
);

-- Enable Row-Level Security
alter table public.companies enable row level security;

-- Allow authenticated users to insert rows but require that owner_email matches the email claim
create policy "Allow authenticated insert with owner_email check" on public.companies
  for insert
  with check ( current_setting('jwt.claims.email') = owner_email and auth.role() = 'authenticated' );

-- Allow owners to select their rows
create policy "Owners can select their companies" on public.companies
  for select
  using ( current_setting('jwt.claims.email') = owner_email and auth.role() = 'authenticated' );

-- Allow owners to update their rows (and enforce that owner_email remains the same)
create policy "Owners can update their companies" on public.companies
  for update
  using ( current_setting('jwt.claims.email') = owner_email and auth.role() = 'authenticated' )
  with check ( current_setting('jwt.claims.email') = owner_email );

-- Allow owners to delete their rows
create policy "Owners can delete their companies" on public.companies
  for delete
  using ( current_setting('jwt.claims.email') = owner_email and auth.role() = 'authenticated' );

-- Optional index on owner_email for fast lookups
create index if not exists idx_companies_owner_email on public.companies(owner_email);