/**
 * api/migrate.ts
 *
 * Vercel serverless API endpoint for importing migration payloads into Supabase.
 *
 * Routes:
 * - GET  /api/migrate     -> { ok: true } health check
 * - POST /api/migrate     -> authenticated migration endpoint
 *
 * Behavior:
 * - Validates Authorization: Bearer &lt;ADMIN_TOKEN&gt;
 * - Reads JSON body with shape { metadata?: object, collections: Record&lt;string, any[]&gt; }
 * - Inserts one row per collection into SUPABASE via REST (table from MIGRATION_TABLE env)
 *
 * Security:
 * - Uses SUPABASE_SERVICE_ROLE_KEY from environment (never exposed to clients)
 *
 * Notes:
 * - Keep payloads small on Vercel (use the scripts/send-migration.ts uploader for large exports)
 */

/**
 * Handler for GET/POST.
 *
 * @param req - incoming request (Vercel runtime)
 * @param res - outgoing response (Vercel runtime)
 */
export default async function handler(req: any, res: any) {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
    const MIGRATION_TABLE = process.env.MIGRATION_TABLE || 'migrated_collections';

    // Basic validation of environment
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !ADMIN_TOKEN) {
      return res.status(500).json({
        ok: false,
        error: 'Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_TOKEN'
      });
    }

    // Health check
    if (req.method === 'GET') {
      return res.status(200).json({
        ok: true,
        service: 'migrate',
        version: 1
      });
    }

    // Only POST for migration
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST,GET');
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    // Authorization header check
    const authHeader = (req.headers && (req.headers.authorization || req.headers.Authorization)) || '';
    const expected = `Bearer ${ADMIN_TOKEN}`;
    if (authHeader !== expected) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    // Parse body (Vercel will usually parse JSON into req.body)
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ ok: false, error: 'Missing or invalid JSON body' });
    }

    const { metadata = {}, collections } = body;

    if (!collections || typeof collections !== 'object' || Array.isArray(collections)) {
      return res.status(400).json({ ok: false, error: 'collections must be an object map of arrays' });
    }

    // Build rows for Supabase insert: one row per collection
    const rows: any[] = [];
    for (const [collectionName, items] of Object.entries(collections)) {
      rows.push({
        collection_name: collectionName,
        payload: items,
        metadata
      });
    }

    if (rows.length === 0) {
      return res.status(400).json({ ok: false, error: 'No collections to migrate' });
    }

    // Perform REST insert into Supabase
    const insertUrl = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${encodeURIComponent(MIGRATION_TABLE)}`;
    const resp = await fetch(insertUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Supabase REST requires an Authorization header and apikey
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Prefer: 'return=representation'
      },
      body: JSON.stringify(rows)
    });

    const text = await resp.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      parsed = text;
    }

    if (!resp.ok) {
      return res.status(502).json({
        ok: false,
        error: 'Supabase REST insert failed',
        status: resp.status,
        body: parsed
      });
    }

    return res.status(200).json({
      ok: true,
      inserted: Array.isArray(parsed) ? parsed.length : rows.length,
      rows: parsed
    });
  } catch (err: any) {
    // Generic error handler
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
}
