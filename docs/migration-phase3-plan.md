/**
 * migration-phase3-plan.md
 *
 * Phase 3 plan: Inventory, dry‑run and safe migration of client-side financial data
 * from browser localStorage -> Supabase (DB) via Netlify server-side functions/RPCs.
 *
 * Purpose:
 * - Provide a concrete, actionable checklist and mapping for Phase 3.
 * - Deliver dry-run steps, reconciliation rules, idempotency strategy, rollout and rollback plan.
 *
 * Assumptions:
 * - Phase 1 & 2 completed: code prepared and idempotent finance RPC deployed/verified.
 * - Server-side admin endpoints (Netlify function + Supabase service role) exist or will be created.
 * - We have at least one staging Supabase project for dry-runs.
 */

# Phase 3 — Inventory, Dry‑run & Migration Plan (Summary)

Goal
- Migrate authoritative financial state (company balances, transaction history, pending payments) from browser localStorage into Supabase atomically and idempotently, then flip the UI to server-backed finance flows.

Scope
- Keys / data to migrate:
  - tm_user_state_<email>  -> contains isAuthenticated, company (company.*)
  - tm_admin_state         -> admin company payload
  - tm_users               -> user list + company references
  - tm_company_<user?>     -> (if present) per-user canonical company key
  - tm_skill_progress_<owner>_<skill>  -> skill progress (non-financial but included in inventory)
  - tm_mechanic_skills_<user>_<staffId>
  - tm_admin_positions_<email>
  - tm_skill_progress_* (any keys starting with tm_skill_progress_)
  - Any app-specific tm_transactions or tm_finance_* keys (search localStorage for "tm_" prefix)
- Server targets (example tables):
  - users (id, email, username, meta)
  - companies (id, owner_email, capital, reputation, hub, meta)
  - transactions (id, company_id, amount, type, created_at, idempotency_key, migrated=true, meta)
  - migration_status (user_email, migrated_at, status, note)
  - skill_progress (owner_id, skill, pct, updated_at)
  - truck_components / other domain tables as needed

Idempotency strategy
- Every migrated transaction must include:
  - idempotency_key: deterministic stable key (e.g., "migrate:<user_email>:<local_tx_id>" or UUID generated and stored in migration_status).
  - original_tx_id: local key (if present) stored in transactions.meta for traceability.
- Use the finance RPC's idempotency header/field so repeated calls don't double-apply.
- Migration script must be resumable: store per-user progress in migration_status table and skip already-migrated items.

Reconciliation rules (pick one per environment; document chosen rule in runbook)
- Rule A (preferred conservative): Treat server balance as canonical if exists -> create a balancing migration transaction (delta) from local->server as a single idempotent transaction (credit/debit).
- Rule B (canonical local): If server has zero or no record, import local balance as the initial server balance via single idempotent transaction.
- Rule C (merged history): Recompute canonical balance from sum(server.history + local.history), import missing history entries with idempotency keys, then assert resulting balance equals expected canonical; if mismatch generate an audit delta transaction.
- Always persist reconciliation decision and diff to migration_status log.

Dry‑run checklist (single test user)
1. Snapshot server: export Supabase tables (companies, transactions, users) to S3/zip.
2. Snapshot client sample: collect localStorage dump for the test user (tm_user_state_..., tm_skill_progress_...).
3. Create staging user in staging Supabase and ensure finance RPC points to staging or uses staging service role.
4. Run migration script against staging: migrate user, transactions, balance.
5. Validate:
   - transactions count imported vs local count
   - idempotency_keys present and unique
   - final server balance equals locally computed balance (or expected after reconciliation rule)
   - no duplicate transactions after retry
6. Rollback simulation: revert staging to snapshot and re-run to confirm idempotency/resume semantics.

Migration script (high-level design)
- Language: TypeScript (Node) runnable in Netlify function / CLI with service role env vars.
- Steps per user:
  1. Read user local snapshot (input file or remote collection)
  2. Detect already-migrated via migration_status or transactions with migrated marker
  3. Build list of migration operations:
     - Insert missing user row (upsert)
     - Upsert company row
     - For each local transaction/history item -> call finance RPC with idempotency_key (or insert via admin insert into transactions with transaction and balance adjustments inside db transaction)
  4. Reconcile balances using chosen rule (e.g., create balancing transaction if delta)
  5. Mark migration_status = success and include audit log
  6. Return summary: imported_tx_count, delta, warnings
- Error handling: per-user retry, exponential backoff, log fatal errors to an alerting channel.

Operational rollout
- Pilot phases:
  1. Test user dry-run (1 user)
  2. Small pilot (10 users)
  3. Medium pilot (100 users)
  4. Full migration (all users, batched)
- Batching: process N users / minute (chosen based on RPC/DB capacity). Use a queue (simple cron or script loop) that marks progress per user.
- Feature flag: enable server-finance writes for migrated users only until full cutover. Prevent older clients from claiming authority by ignoring local-only writes for migrated users (or writing them as "local" non-authoritative events).

Post-migration validation & monitoring
- Automated smoke tests:
  - Apply finance (credit/debit) and verify idempotency
  - Accept job with payout -> balance update
  - Payroll run -> multiple transactions
  - Refund flow
- Reconciliation report:
  - For each migrated user, compare local pre-migration snapshot vs server final balance and record diff.
  - Tolerance: 0 unless business allows small rounding; any diff must be investigated.
- Monitoring:
  - Monitor Netlify function errors, Supabase insert errors, unusual transaction spikes.
  - Alerts on >X failed migrations or >Y unexpected balance diffs.

Rollback & Safety
- Always keep server snapshot before each migration batch.
- migration_status table with statuses: pending, in-progress, completed, failed, rolled_back.
- If rollback required: restore DB snapshot and mark migration_status entries as rolled_back; re-run pilot tests.
- Never delete localStorage snapshots until 30 days after successful full verification.

Minimal UI changes to support migration
- Show per-user banner or badge: "Finance: Server-backed" vs "Local-only (pending migration)".
- Add migration admin view (admin-only) listing migration_status rows with ability to re-run per-user migration and inspect audit diffs.

Deliverables I will produce next
1. Dry-run runbook (step-by-step commands) and checklist for the single-user staging test.
2. TypeScript migration script skeleton that:
   - Reads a provided local snapshot JSON file
   - Calls finance RPC with idempotency keys
   - Writes migration_status to Supabase (or local file if staging)
   - Supports resume and retry
3. A small test runner and verification script to assert balances and exported reports.

Immediate next action (once you confirm)
- I will create:
  - migration dry-run runbook (commands + prechecks)
  - TypeScript migration script scaffold + instructions to run in local env or Netlify CLI using SUPABASE_SERVICE_ROLE env var
  - Example local snapshot format (JSON) and a sample test-case

Estimated time for Phase 3 initial artifacts
- Dry-run doc + migration script scaffold: ~1–2 hours
- Execute dry-run & iterate (pilot): depends on your availability to provide snapshots and staging credentials (1–2 days including verification)

--- End of plan ---
