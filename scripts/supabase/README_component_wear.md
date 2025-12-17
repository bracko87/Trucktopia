Component Wear Supabase Migration - README
===============================================

Purpose
-------
This README describes how to deploy the SQL migration (truck components + snapshot + RPC)
and recommended next steps for production-safe operation (policies, RPC improvements and testing).

Files
-----
- 001_create_truck_components_and_rpc.sql
  - Creates:
    - public.truck_components
    - public.truck_component_snapshot
    - public.rpc_apply_component_wear(...) PL/pgSQL function

Quick deploy
------------
1. Open your Supabase SQL editor (or psql against the DB) and run:
   - scripts/supabase/001_create_truck_components_and_rpc.sql

2. Verify tables exist:
   - SELECT * FROM public.truck_components LIMIT 1;
   - SELECT * FROM public.truck_component_snapshot LIMIT 1;

3. Test RPC (example):
   SELECT public.rpc_apply_component_wear(
     '00000000-0000-0000-0000-000000000000'::uuid,
     '[{"component":"engine","delta":0.12},{"component":"tires","value":90}]'::jsonb,
     'client', 'test-req-1'
   );

Security & Policies
-------------------
- The migration intentionally leaves RLS / GRANT lines commented because your
  project schema (trucks table, companies table) determines exact policies.

- Recommended policy approach:
  1. Enable RLS on truck_components and truck_component_snapshot.
  2. Create a SQL function that resolves truck_id -> company_id (if not already present).
  3. Use RLS policies that check:
     - current_setting('request.jwt.claim.sub', true)::uuid is owner or member of company
     - OR allow server-service-key (for workers) using a separate role/service user
  4. Keep rpc_apply_component_wear as SECURITY DEFINER but ensure the definer role has
     minimal privileges necessary.

RPC improvements (next iterations)
-------------------------------
- Add validation of p_updates for sizes and numeric bounds (reject malicious payloads).
- Return offers (repair/replace proposals) from RPC once server-side business logic is in place.
- Add an idempotency key (p_request_id) stored in a small requests table to prevent double-applying.

Client integration pattern (hybrid)
----------------------------------
1. Client applies wear locally for immediate UX (same algorithm as server).
2. Client calls RPC (non-blocking) with aggregated deltas (batch multiple km updates).
3. RPC returns authoritative components and snapshot; client reconciles if values differ.
4. On conflicts, prefer server values and re-emit local events (truckComponentsUpdated).

Testing & rollout
-----------------
- Stage deployment: create the tables in staging first, wire a dev component wear client to call the RPC.
- Run integration tests for:
  - simultaneous RPC calls for same truck (simulate race)
  - offline -> reconnect flows (queued requests)
  - validation of overall_condition calculation
- Monitor table growth (components rows ~ number of trucks * components). If you need history, create a separate audit table instead of adding rows per tick.

Notes
-----
- The importance weight mapping in the RPC must be kept in sync with the client engine.
- Consider pushing more authoritative wear logic to a background worker in the future
  (this RPC can be used by the worker as well).

If you'd like, I can:
- Draft the minimal RLS policy SQL using your trucks -> companies schema (send me the trucks table model).
- Add a server-side offers-generation SQL snippet to include basic offers in the RPC response.
- Wire the client ComponentWearEngine to call the RPC and reconcile localStorage (I can implement this next).