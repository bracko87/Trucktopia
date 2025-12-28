/**
 * 006_drop_conflicting_finance_apply_wrapper.sql
 *
 * Drop the overloaded finance_apply wrapper that causes PostgREST to be unable
 * to choose the correct candidate. Run this as a DB admin (service role) to
 * remove the conflicting signature so only the canonical finance_apply remains.
 */

-- DROP the wrapper overload with signature:
-- (p_actor_user_id uuid, p_company_id uuid, p_delta bigint, p_description text,
--  p_idempotency_key text, p_meta jsonb, p_type text)
DROP FUNCTION IF EXISTS public.finance_apply(uuid, uuid, bigint, text, text, jsonb, text);

-- NOTE:
-- After running this, refresh the PostgREST / Supabase schema cache if required
-- (e.g. redeploy or use the dashboard "refresh" function). Then re-run your POST
-- to /.netlify/functions/finance-apply to verify the error is resolved.
