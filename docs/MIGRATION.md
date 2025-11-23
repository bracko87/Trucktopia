/**
 * docs/MIGRATION.md
 *
 * Instructions to deploy and call the hosted migration endpoint (Netlify).
 *
 * Goals:
 * - Keep Supabase service role key secret in hosting environment variables.
 * - Allow Sider.ai UI (or any frontend) to POST a migration payload to the endpoint using an admin token.
 *
 * Steps
 * 1) Deploy function
 *    - Commit & push the netlify/functions/migrate.js file to your repository.
 *    - On Netlify, ensure Functions are enabled and the repo is connected.
 *
 * 2) Configure environment variables (Netlify site settings)
 *    - SUPABASE_URL = https://xxx.supabase.co
 *    - SUPABASE_SERVICE_ROLE_KEY = (your Supabase service role key)
 *    - MIGRATE_ADMIN_TOKEN = (a long random token you generate)
 *    - MIGRATION_TABLE = migrated_collections (optional)
 *
 * 3) Test locally with curl
 *    - Save your migration payload as migration-payload.json
 *    - Run:
 *      curl -v -X POST https://<your-site>.netlify.app/.netlify/functions/migrate \
 *        -H "Authorization: Bearer <MIGRATE_ADMIN_TOKEN>" \
 *        -H "Content-Type: application/json" \
 *        --data-binary @migration-payload.json
 *
 *    - The response will contain a results array indicating success/failure per collection.
 *
 * 4) Integrate with Sider.ai UI (or any UI)
 *    - From the UI, POST the JSON payload to the function endpoint above.
 *    - Always include the Authorization header:
 *        Authorization: Bearer <MIGRATE_ADMIN_TOKEN>
 *
 * Security best practices
 * - Never embed SUPABASE_SERVICE_ROLE_KEY in client-side code or upload it with the payload.
 * - Rotate the Supabase service role key if it has been exposed.
 * - Limit access to the MIGRATE_ADMIN_TOKEN and rotate it periodically.
 *
 * Rollback / safety
 * - Test on a staging Supabase instance first.
 * - Always backup target table(s) before performing large migrations.
 *
 * Example migration payload structure (migration-payload.json)
 * {
 *   "metadata": { "requestedBy": "you@example.com", "note": "Full export run" },
 *   "collections": {
 *     "example_collection": [
 *       { "id": "sample-1", "name": "Sample item", "createdAt": "2025-11-23T00:00:00Z" }
 *     ],
 *     "another_collection": [ ... ]
 *   }
 * }
 */

