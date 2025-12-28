/*
 * scripts/fix_finance_apply.sql
 *
 * Drop & recreate finance_apply RPC with fully-qualified column references to
 * avoid ambiguous column errors (e.g. "company_id is ambiguous").
 *
 * Usage:
 * - Run this in your Supabase SQL editor (service role) or via psql as a DB admin.
 * - After running, invoke the Netlify function again.
 */

/*
 * Ensure old function is removed first (signature must match the existing one).
 */
drop function if exists public.finance_apply(uuid,bigint,text,text,jsonb,text,uuid);

-- Create finance_apply RPC with explicit table qualification to prevent ambiguity
create or replace function public.finance_apply(
  p_company_id uuid,
  p_delta bigint,
  p_type text,
  p_description text default null,
  p_meta jsonb default '{}'::jsonb,
  p_idempotency_key text default null,
  p_actor_user_id uuid default null
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
) language plpgsql security definer as $$
declare
  v_existing finances_transactions%rowtype;
  v_current_balance bigint;
  v_new_balance bigint;
begin
  /*
   * If idempotency key provided, try returning existing row.
   * Use explicit table aliases when selecting to avoid ambiguous column names.
   */
  if p_idempotency_key is not null then
    select ft.* into v_existing
    from finances_transactions ft
    where ft.company_id = p_company_id and ft.idempotency_key = p_idempotency_key
    limit 1;

    if found then
      return query
      select
        ft.id,
        ft.company_id,
        ft.created_at,
        ft.type,
        ft.amount,
        ft.balance_after,
        ft.description,
        ft.meta,
        ft.idempotency_key,
        ft.actor_user_id
      from finances_transactions ft
      where ft.id = v_existing.id;
      return;
    end if;
  end if;

  /*
   * Lock the company row for update and read current capital.
   * Fully-qualify the companies table columns to prevent ambiguity.
   */
  select c.capital_cents into v_current_balance
  from companies c
  where c.id = p_company_id
  for update;

  if not found then
    raise exception 'company_not_found';
  end if;

  v_new_balance := v_current_balance + p_delta;

  /*
   * Persist new balance and insert transaction row.
   * Use explicit qualifiers in all queries/returns.
   */
  update companies set capital_cents = v_new_balance where id = p_company_id;

  insert into finances_transactions(
    company_id,
    type,
    amount,
    balance_after,
    description,
    meta,
    idempotency_key,
    actor_user_id
  ) values (
    p_company_id,
    p_type,
    p_delta,
    v_new_balance,
    p_description,
    coalesce(p_meta, '{}'::jsonb),
    p_idempotency_key,
    p_actor_user_id
  )
  returning id, company_id, created_at, type, amount, balance_after, description, meta, idempotency_key, actor_user_id
  into id, company_id, created_at, type, amount, balance_after, description, meta, idempotency_key, actor_user_id;

  return next;
end;
$$;