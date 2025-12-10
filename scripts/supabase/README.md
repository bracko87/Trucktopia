/**
 * README.md
 *
 * Instructions for the "Add world_id and enable RLS" migration.
 *
 * This file explains:
 *  - Purpose and effects of the SQL migration
 *  - How to run the migration locally / in Supabase (staging first)
 *  - How to call the helper RPC to set the session world before queries
 *  - How to test and rollback (recommendations)
 */

/*
Purpose
- Add a 'world_id' column to the main game tables (default 'euroasia').
- Backfill existing rows as 'euroasia'.
- Enable Row-Level Security (RLS) and create policies that require
  the session variable 'request.world_id' to match the row world_id.
- Create RPC public.set_request_world(text) to set the session variable.

Why run this now?
- Prevents accidental cross-world data access while we prepare the American world.
- Ensures future seeds/imports include a world_id explicitly.
*/

Steps to run (recommended order)
1) Backup your database
   - Use Supabase backup/export or pg_dump from your DB admin tools.
   - DO NOT SKIP backups.

2) Apply on staging first
   - Create a staging copy of your database or use the Supabase "SQL Editor".
   - Run scripts/supabase/001_add_world_id_and_enable_rls.sql in the staging DB.
   - Verify the column additions, function and RLS policies exist.

3) Test coverage on staging
   - From a client app (or using the Supabase SQL editor with different sessions), simulate:
     a) Call RPC: SELECT public.set_request_world('euroasia');
     b) Then run SELECT * FROM public.staff; -> you should see only rows where world_id='euroasia'.
     c) Try to INSERT a row with world_id = 'american' after calling set_request_world('euroasia') -> should fail (policy).
     d) Call SELECT public.set_request_world('american'); then try selecting -> you'll see none (unless american rows exist).

4) Production rollout
   - After testing in staging, schedule a maintenance window (if desired), take a production backup.
   - Run the same SQL in the production Supabase SQL editor.
   - Verify the function and policies are created.

How clients should set the world before queries
- Recommended server-side approach (most secure):
  - Have your Netlify site call a small server-side endpoint /api/session that runs as the Supabase service role
    or a serverless function which:
      1) Authenticates the user (via the front-end token).
      2) Calls the DB RPC public.set_request_world('euroasia') for that session.
      3) Proxies subsequent DB requests through that session (or returns a short-lived token with a claim).
  - This guarantees the server enforces the world context.

- Simpler client approach (common with Supabase):
  - Immediately after user login, call the RPC:
      await supabase.rpc('set_request_world', { w: 'euroasia' })
    This sets the session-local GUC for the active session (works in the browser client).
  - Note: Ensure users cannot set arbitrary worlds — the app frontend should only set the world appropriate to the site (WORLD env). Because the rpc is callable by authenticated users, do not allow client-side switching between worlds unless your app logic enforces it.

Testing notes
- Use separate sessions (open an incognito window) to verify world isolation.
- Check that admin/service_role usage still functions (service_role bypasses RLS).
- Verify that any existing application queries that assumed worldwide data still work once world_id filter applies.

Rollback
- If something goes wrong, restore the DB backup.
- You can also DROP the policies and COLUMNs manually, but a full restore is safer.

Next migration steps you'll likely need
- Add world_id to any additional tables not covered above.
- Update all API and seeder scripts to write world_id explicitly when creating rows (seeders for new world).
- When seeding American world data, use world_id = 'american'.

If you want, I can:
- Produce a ready-to-run small Node.js/TS migration helper that duplicates selected staff rows into the 'american' world (safe duplication).
- Create example client code showing how to call public.set_request_world after login using your Supabase client.

Reply with "Migrate staff next" to generate the staff migration script, or "Client helper" to add the TypeScript helper that calls the RPC and documents usage.
