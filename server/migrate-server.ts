/**
 * server/migrate-server.ts
 *
 * Minimal TypeScript migration endpoint that accepts a POST payload from your Admin UI
 * and writes collections into a Supabase Postgres table via the Supabase REST API.
 *
 * Security:
 * - The Supabase service_role key must be set in the environment variable SUPABASE_SERVICE_ROLE_KEY.
 * - The admin client must send Authorization: Bearer &lt;ADMIN_TOKEN&gt; which is validated against
 *   the ADMIN_TOKEN environment variable. This token should be kept short-lived and stored as an
 *   environment variable on the server host. Do NOT store the service_role key in the client.
 *
 * Usage:
 *  - Build & deploy this file to your hosting (Render, Railway, DigitalOcean App, etc.)
 *  - Ensure environment variables are set: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_TOKEN
 *  - Make a POST to POST /migrate with JSON: { metadata: {...}, collections: { key: value, ... } }
 *
 * Response:
 *  - JSON with per-collection results: { results: [ { collection, success, message, details } ] }
 *
 * Notes:
 *  - This server writes each collection as a single row into MIGRATION_TABLE (column 'collection_key', 'data', 'metadata', 'migrated_at', 'migrated_by', 'status'). This is intentionally conservative and auditable.
 *  - Later we can add "expand" mode to insert array entries into individual tables if you want per-item mapping.
 */

import http from 'http';
import { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';

/**
 * Parse incoming JSON body into object
 * @param req IncomingMessage
 * @returns parsed JSON or null on error
 */
async function parseJsonBody(req: IncomingMessage): Promise<any | null> {
  return new Promise((resolve) => {
    const chunks: Uint8Array[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        if (!raw) return resolve(null);
        const parsed = JSON.parse(raw);
        resolve(parsed);
      } catch (err) {
        resolve(null);
      }
    });
  });
}

/**
 * Insert one migrated collection row into Supabase via REST API
 * @param supabaseUrl Base URL for Supabase (e.g. https://xyz.supabase.co)
 * @param serviceRoleKey Supabase service_role key (must remain secret)
 * @param tableName Target table name (default: migrated_collections)
 * @param collectionKey Name of collection from client
 * @param data The collection data (object or array)
 * @param metadata Additional metadata
 * @returns object with success boolean and details
 */
async function insertCollectionToSupabase(
  supabaseUrl: string,
  serviceRoleKey: string,
  tableName: string,
  collectionKey: string,
  data: any,
  metadata: any
): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    const url = new URL(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/${tableName}`);
    // Build payload row — we store collection as JSONB.
    const row = {
      collection_key: collectionKey,
      data,
      metadata,
      migrated_by: metadata?.requestedBy || 'admin',
      status: 'migrated'
    };

    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Supabase REST requires Authorization and apikey headers when using service_role
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        Prefer: 'return=representation'
      },
      body: JSON.stringify(row)
    });

    const text = await res.text();
    let parsed;
    try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }

    if (!res.ok) {
      return { success: false, message: `Supabase returned ${res.status} ${res.statusText}`, details: parsed };
    }

    return { success: true, message: 'Inserted', details: parsed };
  } catch (err: any) {
    return { success: false, message: String(err?.message || err), details: null };
  }
}

/**
 * Validate Bearer token from Authorization header
 * @param req Incoming request
 * @returns token string or null
 */
function getBearerToken(req: IncomingMessage): string | null {
  const auth = (req.headers['authorization'] as string) || (req.headers['Authorization'] as unknown as string);
  if (!auth) return null;
  const parts = auth.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') return parts[1];
  return null;
}

/**
 * Simple JSON response helper
 * @param res ServerResponse
 * @param status HTTP status
 * @param body any JSON-able body
 */
function json(res: ServerResponse, status: number, body: any) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body, null, 2));
}

/**
 * Entry point - create and start HTTP server
 */
const PORT = Number(process.env.PORT || 8787);
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const MIGRATION_TABLE = process.env.MIGRATION_TABLE || 'migrated_collections';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !ADMIN_TOKEN) {
  console.error('Missing required environment variables. Please set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and ADMIN_TOKEN.');
  console.error('Server will still start but /migrate endpoint will return configuration errors.');
}

const server = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  // Health check
  if (req.method === 'GET' && url.pathname === '/health') {
    return json(res, 200, { ok: true, now: new Date().toISOString() });
  }

  // Migrate endpoint
  if (req.method === 'POST' && url.pathname === '/migrate') {
    // Validate config
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return json(res, 500, { ok: false, message: 'Server misconfigured: missing Supabase URL or service role key.' });
    }

    // Validate admin token
    const bearer = getBearerToken(req);
    if (!bearer || bearer !== ADMIN_TOKEN) {
      return json(res, 401, { ok: false, message: 'Unauthorized. Provide valid Authorization: Bearer <token>' });
    }

    // Parse body
    const body = await parseJsonBody(req);
    if (!body || typeof body !== 'object') {
      return json(res, 400, { ok: false, message: 'Invalid JSON body' });
    }

    const { metadata = {}, collections = {}, options = {} } = body;

    if (!collections || typeof collections !== 'object' || Object.keys(collections).length === 0) {
      return json(res, 400, { ok: false, message: 'No collections provided to migrate' });
    }

    const results: Array<{ collection: string; success: boolean; message: string; details?: any }> = [];

    // Process each collection sequentially (safe & auditable). For large imports you can change to batch/parallel.
    for (const [collectionKey, value] of Object.entries(collections)) {
      // Insert into Supabase table
      const insertResult = await insertCollectionToSupabase(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY,
        MIGRATION_TABLE,
        collectionKey,
        value,
        { ...metadata, migratedAt: new Date().toISOString() }
      );

      results.push({
        collection: collectionKey,
        success: insertResult.success,
        message: insertResult.message,
        details: insertResult.details
      });
    }

    return json(res, 200, { ok: true, results });
  }

  // Not found
  json(res, 404, { ok: false, message: 'Not Found' });
});

server.listen(PORT, () => {
  console.log(`Migration server listening on port ${PORT}`);
  console.log(`/health -> health check`);
  console.log(`/migrate -> POST migration payload (Authorization: Bearer <ADMIN_TOKEN>)`);
  console.log(`MIGRATION_TABLE=${MIGRATION_TABLE}`);
});