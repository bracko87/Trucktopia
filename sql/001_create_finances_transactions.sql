-- 001_create_finances_transactions.sql
-- 
-- Migration: create canonical finances transactions table.
-- Purpose: every money change must be recorded immutably and show the canonical
--          balance_after value. Amounts are stored as integer cents (bigint).
-- Notes:
--  - If you prefer a dedicated schema (e.g. 'finances') change "public." accordingly.
--  - Ensure your application and finance functions use integer cents.
--  - If using uuid_generate_v4() ensure pgcrypto/uuid-ossp is available; gen_random_uuid() is used below.
--  - This migration adds a uniqueness constraint for idempotency_key per company.
--  - Indexes added for efficient range queries by company and date.
-- ------------------------------------------------------------------------------

-- Enable pgcrypto extension if needed (uncomment if not available)
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.finances_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- type: semantic transaction type for filtering / reporting
  type text NOT NULL CHECK (type IN ('income','expense','tax','loan','repayment','adjustment','fee','refund')),
  -- amount in integer cents. Use positive/negative consistently (e.g. income positive, expense negative).
  amount bigint NOT NULL,
  -- canonical balance after this transaction (in cents)
  balance_after bigint NOT NULL,
  description text,
  meta jsonb DEFAULT '{}'::jsonb NOT NULL,
  idempotency_key text,
  actor_user_id uuid,
  -- optional external reference (e.g. job id, purchase id)
  reference_id text
);

-- Unique idempotency key per company (makes retries safe)
CREATE UNIQUE INDEX IF NOT EXISTS idx_finances_tx_company_idempotency
  ON public.finances_transactions (company_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Index for retrieving company transactions in chronological order
CREATE INDEX IF NOT EXISTS idx_finances_tx_company_created_at
  ON public.finances_transactions (company_id, created_at DESC);

-- Index on created_at for global reporting
CREATE INDEX IF NOT EXISTS idx_finances_tx_created_at
  ON public.finances_transactions (created_at DESC);

-- Optional: example view to show human-readable amounts (cents -> decimals)
-- CREATE VIEW public.finances_transactions_view AS
-- SELECT id, company_id, created_at, type, amount/100.0 AS amount_eur, balance_after/100.0 AS balance_after_eur, description, meta, idempotency_key, actor_user_id, reference_id
-- FROM public.finances_transactions;
