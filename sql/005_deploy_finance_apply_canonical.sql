/**
 * 005_deploy_finance_apply_canonical.sql
 *
 * Deploy a single canonical finance_apply RPC implementation that uses
 * fully-qualified table references and does not call any other finance_apply
 * symbol (avoids accidental recursion / stack-depth issues).
 *
 * Run this in your Supabase SQL editor (service role) or via psql as a DB admin.
 */

/* Drop any existing finance_apply function with the canonical signature first */
drop function if exists public.finance_apply(uuid,bigint,text,text,jsonb,text,uuid);

/* Create canonical finance_apply implementation (fully-qualified names) */
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
  v_ret_id uuid;
  v_ret_company_id uuid;
  v_ret_created_at timestamptz;
  v_ret_type text;
  v_ret_amount bigint;
  v_ret_balance_after bigint;
  v_ret_description text;
  v_ret_meta jsonb;
  v_ret_idempotency_key text;
  v_ret_actor_user_id uuid;
begin
  /*
   * Idempotency: if an idempotency key is supplied, attempt to return an
   * existing finances_transactions row for this company + key.
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
   * Lock and read the company row to avoid races, then compute new balance.
   */
  select c.capital_cents into v_current_balance
  from companies c
  where c.id = p_company_id
  for update;

  if not found then
    raise exception 'company_not_found';
  end if;

  v_new_balance := v_current_balance + p_delta;

  /* Persist new company balance */
  update companies set capital_cents = v_new_balance where id = p_company_id;

  /*
   * Insert the transaction row and capture returned columns into locals
   * (fully-qualified returning avoids ambiguity).
   */
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
  returning finances_transactions.id,
            finances_transactions.company_id,
            finances_transactions.created_at,
            finances_transactions.type,
            finances_transactions.amount,
            finances_transactions.balance_after,
            finances_transactions.description,
            finances_transactions.meta,
            finances_transactions.idempotency_key,
            finances_transactions.actor_user_id
  into v_ret_id, v_ret_company_id, v_ret_created_at, v_ret_type, v_ret_amount, v_ret_balance_after, v_ret_description, v_ret_meta, v_ret_idempotency_key, v_ret_actor_user_id;

  /* Return the inserted row using the captured local variables */
  return query select
    v_ret_id::uuid as id,
    v_ret_company_id::uuid as company_id,
    v_ret_created_at as created_at,
    v_ret_type as type,
    v_ret_amount as amount,
    v_ret_balance_after as balance_after,
    v_ret_description as description,
    v_ret_meta as meta,
    v_ret_idempotency_key as idempotency_key,
    v_ret_actor_user_id::uuid as actor_user_id;

end;
$$;