/**
 * 003_create_finance_apply_function.sql
 *
 * Create a PostgreSQL stored procedure (finance_apply) that performs an atomic
 * money update for a company and inserts a corresponding finances_transactions
 * row. The function enforces idempotency when an idempotency key is provided.
 *
 * Usage (from server code via Supabase RPC endpoint):
 *  POST /rest/v1/rpc/finance_apply
 *  Body JSON:
 *  {
 *    "p_company_id": "<uuid>",
 *    "p_delta": -3150000,
 *    "p_type": "expense",
 *    "p_description": "Purchase Heno XZU720",
 *    "p_meta": { "vehicleId": "truck-123" },
 *    "p_idempotency_key": "uuid-...",
 *    "p_actor_user_id": "user-uuid"
 *  }
 *
 * The function returns the inserted finances_transactions row (or the existing
 * row when an idempotency key matched).
 */
-- Create or replace finance_apply function that runs atomically and returns the transaction row.
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
  -- If idempotency key provided, try returning existing row
  if p_idempotency_key is not null then
    select * into v_existing
    from finances_transactions
    where company_id = p_company_id and idempotency_key = p_idempotency_key
    limit 1;
    if found then
      -- Return the previously created row (idempotent)
      return query select
        id, company_id, created_at, type, amount, balance_after, description, meta, idempotency_key, actor_user_id
      from finances_transactions
      where id = v_existing.id;
      return;
    end if;
  end if;

  -- Lock company row for update to avoid race conditions
  select capital_cents into v_current_balance
  from companies
  where id = p_company_id
  for update;

  if not found then
    raise exception 'company_not_found';
  end if;

  v_new_balance := v_current_balance + p_delta;

  -- Optionally enforce business rules (uncomment to disallow negative balances)
  -- if v_new_balance < 0 then
  --   raise exception 'insufficient_funds';
  -- end if;

  -- Persist new company balance
  update companies set capital_cents = v_new_balance where id = p_company_id;

  -- Insert transaction row
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