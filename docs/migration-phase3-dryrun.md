Phase 3 — Dry‑Run Runbook (Finance Migration)
==============================================

Purpose
-------
This runbook describes a single‑user dry‑run for migrating client-side financial data (localStorage) into the server (Supabase via Netlify functions). The dry‑run validates mapping, idempotency, reconciliation rules and the migration script behavior before any mass migration.

Preconditions
-------------
- Server migration endpoint available (Netlify function or API) and reachable, e.g. MIGRATE_ENDPOINT=https://your-app/.netlify/functions/finance-migrate
- Endpoint supports idempotent application of transactions and returns stable transaction ids & resulting balance.
- A safe staging Supabase environment is available for test runs (preferred).
- Node 18+ present for running the migration script (global fetch available).
- You have an exported localStorage sample for the test user (see Export localStorage).

Export localStorage (one user)
------------------------------
1. Open browser where user is logged in.
2. Run in Console:
   const dump = {}; for (let i=0;i<localStorage.length;i++){ const k = localStorage.key(i); dump[k]=localStorage.getItem(k); } console.log(JSON.stringify(dump));
3. Copy the printed JSON to a file named test-user-localstorage.json (or use browser extension to export).
4. Ensure sensitive API keys are NOT present in the dump you share.

Dry‑Run Steps
-------------
1. Prepare environment
   - Set MIGRATE_ENDPOINT env var to the migration endpoint.
   - Place test-user-localstorage.json in working directory.

2. Run script (scaffold: scripts/migrate-local-to-supabase.ts)
   - Example:
     NODE_ENV=staging MIGRATE_ENDPOINT=https://staging/.netlify/functions/finance-migrate node --loader ts-node/esm scripts/migrate-local-to-supabase.ts test-user-localstorage.json --out dryrun-status.json
   - (The scaffold supports Node18+ with native fetch; adapt to your runner.)

3. Observe logs
   - Script will:
     - Parse export and locate finance keys (company balance, pending txs, history).
     - Transform into canonical payload.
     - POST to endpoint with idempotency keys.
     - Save per-user status to dryrun-status.json.

4. Validate server state
   - Use Supabase console / queries to inspect inserted transactions and resulting balance.
   - Verify:
     - No duplicate transactions (idempotency).
     - Resulting balance equals expected reconciled balance.
     - Transaction metadata preserved (timestamps, origin keys).

5. Test idempotency
   - Re-run the same migration for the same user; server should not create duplicates and should return same final balance / tx ids.

Reconciliation & Acceptance Criteria
-----------------------------------
- Balance reconciliation rule used in dry-run: (choose one)
  - A: Server final balance := server existing balance + sum(migrated unapplied transactions) + delta adjustment tx created if client balance != computed server balance.
  - B: Server final balance := client balance (apply deltas as adjustment txs) — recommended when clients are source-of-truth for that user.
- Acceptance:
  - Final server balance matches reconciliation rule result.
  - No duplicate transactions after repeated dry-runs.
  - All migrated rows include a migration idempotency key for audit.

What to capture in logs
-----------------------
- Input sample filename + top-level keys discovered.
- Number of transactions discovered & types (applied, pending).
- Per-request server response (tx ids, new balance, warnings).
- Any skipped/invalid items.

Rollback plan (dry-run)
-----------------------
- For staging dry-run: drop staging migrated rows via SQL and restore from pre-run snapshot.
- For production pilot: mark migrated users as "migrated=false" until after final validation; do not delete server rows — instead use audit + reverse transactions if necessary.

Next checks before mass migration
-------------------------------
- Confirm migration endpoint logs sufficient metadata (source_user, idempotency_key).
- Confirm per-user migration status persistence (so script can resume).
- Confirm monitoring/alerts exist for finance RPC failures.
- Create a pilot group (1 → 10 → 100 users) and validate metrics.

Notes & Limitations
-------------------
- This runbook assumes admin migration endpoint is implemented and idempotent.
- The migration script scaffold expects a localStorage JSON export (browser → file). If you prefer in‑browser migration agent, adapt the scaffold accordingly.
- Always run first in staging with a supabase snapshot backup.

If you want, I will now generate:
- The TypeScript migration script scaffold (scripts/migrate-local-to-supabase.ts) that reads a localStorage export, transforms finance keys into payloads and calls the configured endpoint with idempotency keys.
- A small helper to produce compact export (browser snippet) for non-technical operators.

Reply "Generate script" to create the script now.