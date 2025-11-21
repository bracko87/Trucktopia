/**
 * netlify/functions/migrate.js
 *
 * Serverless migration endpoint for Netlify Functions.
 *
 * Responsibilities:
 * - Validate a short-lived admin token sent in Authorization header.
 * - Accept a migration payload { metadata, collections, options } via POST.
 * - For each collection, insert a single row into the configured Supabase table
 *   (defaults to "migrated_collections") using Supabase REST API and the
 *   SUPABASE_SERVICE_ROLE_KEY (must be set as an environment variable).
 *
 * Security:
 * - SUPABASE_SERVICE_ROLE_KEY: MUST be set in Netlify (Environment -> Site settings).
 * - Do NOT expose the service_role key to client code.
 *
 * Usage (Admin UI):
 * - POST to: https://<your-netlify-site>.netlify.app/.netlify/functions/migrate
 * - Headers:
 *    Authorization: Bearer <ADMIN_TOKEN>
 *    Content-Type: application/json
 * - Body:
 *   {
 *     "metadata": { "requestedBy": "admin@you.com", "origin": "https://yoursite" },
 *     "collections": { "tm_users": [...], "tm_job_market": [...] },
 *     "options": {}
 *   }
 */

const handler = async (event) => {
  try {
    // Only POST allowed
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ ok: false, message: 'Method Not Allowed' })
      };
    }

    // Validate Authorization header
    const authHeader = (event.headers && (event.headers.authorization || event.headers.Authorization)) || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

    if (!token || token !== ADMIN_TOKEN) {
      return {
        statusCode: 401,
        body: JSON.stringify({ ok: false, message: 'Unauthorized' })
      };
    }

    // Validate SUPABASE env
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const MIGRATION_TABLE = process.env.MIGRATION_TABLE || 'migrated_collections';

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ ok: false, message: 'Server misconfigured: missing Supabase URL or service role key' })
      };
    }

    // Parse body
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, message: 'Missing request body' })
      };
    }

    let payload;
    try {
      payload = JSON.parse(event.body);
    } catch (err) {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, message: 'Invalid JSON body' })
      };
    }

    const { metadata = {}, collections = {} } = payload;
    if (!collections || typeof collections !== 'object' || Object.keys(collections).length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, message: 'No collections provided' })
      };
    }

    // Helper: insert a single collection row into Supabase via REST API
    const insertCollection = async (collectionKey, value) => {
      const endpoint = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${MIGRATION_TABLE}`;
      const row = {
        collection_key: collectionKey,
        data: value,
        metadata: metadata || {},
        migrated_by: metadata.requestedBy || null,
        status: 'migrated'
      };

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Prefer: 'return=representation'
          },
          body: JSON.stringify(row)
        });

        const text = await res.text();
        let parsed;
        try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }

        if (!res.ok) {
          return { collection: collectionKey, success: false, status: res.status, message: `${res.status} ${res.statusText}`, details: parsed };
        }

        return { collection: collectionKey, success: true, status: res.status, message: 'Inserted', details: parsed };
      } catch (err) {
        return { collection: collectionKey, success: false, message: String(err && err.message ? err.message : err) };
      }
    };

    // Process collections sequentially for audit/safety. For large imports you can parallelize or batch.
    const results = [];
    for (const [key, value] of Object.entries(collections)) {
      // Safety: for very large collections you might want to skip or return early with a reason
      // Here we attempt to insert each collection as one row (JSONB)
      // If your payloads are huge, consider splitting into batches on the client before POSTing.
      const r = await insertCollection(key, value);
      results.push(r);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, results })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, message: 'Server error', error: String(err && err.message ? err.message : err) })
    };
  }
};

exports.handler = handler;