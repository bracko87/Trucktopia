-- 007_create_finance_apply_atomic.sql
--
-- Create an atomic, idempotent finance RPC that:
--  - honors idempotency_key (returns existing row when present)
--  - locks the company row FOR UPDATE to avoid races
--  - updates companies.capital_cents and inserts finances_transactions in a single DB transaction
--  - returns the inserted (or existing) finances_transactions row
--
-- Run this in Supabase SQL editor (service role) or via psql as a DB admin.

drop function if exists public.finance_apply_atomic(uuid, bigint, text, text, jsonb, text, uuid);

create or replace function public.finance_apply_atomic(
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
  v_company_row record;
  v_current_balance bigint;
  v_new_balance bigint;
  v_inserted finances_transactions%rowtype;
begin
  /*
   * Idempotency: if key provided, return existing transaction for this company+key
   */
  if p_idempotency_key is not null then
    select * into v_existing
    from public.finances_transactions
    where company_id = p_company_id and idempotency_key = p_idempotency_key
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
      from public.finances_transactions ft
      where ft.id = v_existing.id;
      return;
    end if;
  end if;

  /*
   * Lock the company row to avoid concurrent updates, compute new balance
   */
  select id, capital_cents, capital into v_company_row
  from public.companies c
  where c.id = p_company_id
  for update;

  if not found then
    raise exception 'company_not_found';
  end if;

  if v_company_row.capital_cents is not null then
    v_current_balance := v_company_row.capital_cents;
  else
    -- fallback: derive cents from capital numeric/string
    begin
      v_current_balance := round(coalesce((v_company_row.capital::numeric), 0) * 100);
    exception when others then
      v_current_balance := 0;
    end;
  end if;

  v_new_balance := v_current_balance + p_delta;

  /*
   * Persist new company balance and insert transaction inside same TX
   */
  update public.companies set capital_cents = v_new_balance where id = p_company_id;

  insert into public.finances_transactions(
    company_id,
    type,
    amount,
    balance_after,
    description,
    meta,
    idempotency_key,
    actor_user_id,
    created_at
  ) values (
    p_company_id,
    p_type,
    p_delta,
    v_new_balance,
    p_description,
    coalesce(p_meta, '{}'::jsonb),
    p_idempotency_key,
    p_actor_user_id,
    timezone('utc', now())
  )
  returning id, company_id, created_at, type, amount, balance_after, description, meta, idempotency_key, actor_user_id
  into v_inserted;

  return query select
    v_inserted.id,
    v_inserted.company_id,
    v_inserted.created_at,
    v_inserted.type,
    v_inserted.amount,
    v_inserted.balance_after,
    v_inserted.description,
    v_inserted.meta,
    v_inserted.idempotency_key,
    v_inserted.actor_user_id;
end;
$$;