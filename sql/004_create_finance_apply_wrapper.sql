/**
 * 004_create_finance_apply_wrapper.sql
 *
 * Wrapper overload for public.finance_apply
 *
 * @description
 * Some clients / PostgREST builds may call the RPC with a different parameter ordering.
 * This wrapper accepts the alternate ordering (p_actor_user_id first) and forwards
 * to the canonical finance_apply implementation using named parameters to avoid
 * ambiguity and recursion.
 *
 * Usage: execute in your Postgres / Supabase SQL editor as a DB admin/service role.
 */
create or replace function public.finance_apply(
  p_actor_user_id uuid,
  p_company_id uuid,
  p_delta bigint,
  p_description text default null,
  p_idempotency_key text default null,
  p_meta jsonb default '{}'::jsonb,
  p_type text default null
)
returns table(
  id uuid,
  company_id uuid,
  created_at timestamptz,
  type text,
  amount bigint,
  balance_after bigint,
  description text,
  meta jsonb,
  idempotency_key text,
  actor_user_id uuid
) language sql security definer as $$
  -- Forward to the canonical implementation using named parameters to ensure
  -- the DB resolves to the original function regardless of positional order.
  select *
  from public.finance_apply(
    p_company_id := p_company_id,
    p_delta := p_delta,
    p_type := p_type,
    p_description := p_description,
    p_meta := p_meta,
    p_idempotency_key := p_idempotency_key,
    p_actor_user_id := p_actor_user_id
  );
$$;