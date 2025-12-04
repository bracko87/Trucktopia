/**
 * migrate.ts
 *
 * Netlify Function: migrate
 *
 * Purpose:
 * - Accepts a POST containing a migration payload and inserts rows into a Supabase table
 *   (default: migrated_collections) via the Supabase REST API using the service role key.
 *
 * Improvements in this version:
 * - Accepts multiple accepted shapes for the "collections" payload:
 *   1) Object map: { collections: { nameA: [...], nameB: [...] } }
 *   2) Array form: { collections: [ { name: 'nameA', items: [...] }, { name: 'nameB', items: [...] } ] }
 *   3) Array REST-like form: { collections: [ { collection_name: 'nameA', payload: [...] } ] }
 * - Keeps the same security checks (ADMIN_TOKEN header).
 * - Clear error messages and consistent response shapes.
 *
 * Notes:
 * - Environment variables required:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_TOKEN
 * - Optionally set MIGRATION_TABLE (defaults to "migrated_collections")
 */

import fetch from "node-fetch";

/**
 * normalizeCollections
 * @description Normalize multiple incoming collection formats into a rows[] array
 *              acceptable for insertion into the migration table.
 *
 * Supported incoming shapes:
 * - object-map: { collections: { collectionName: [ ...items ] } }
 * - array      : { collections: [ { name: 'collectionName', items: [...] }, ... ] }
 * - rest-like  : { collections: [ { collection_name: 'collectionName', payload: [...] }, ... ] }
 *
 * @param collections any incoming collections data
 * @param metadata any metadata to attach to rows
 * @returns Array of { collection_name, payload, metadata }
 */
const normalizeCollections = (collections: any, metadata: any) => {
  const rows: Array<Record<string, any>> = [];

  // Case: object map (preferred)
  if (collections && typeof collections === "object" && !Array.isArray(collections)) {
    for (const [collectionName, items] of Object.entries(collections)) {
      rows.push({
        collection_name: collectionName,
        payload: items,
        metadata,
      });
    }
    return rows;
  }

  // Case: array variants
  if (Array.isArray(collections)) {
    for (const entry of collections) {
      if (!entry || typeof entry !== "object") continue;

      // Rest-like: { collection_name, payload }
      if (entry.collection_name && entry.payload) {
        rows.push({
          collection_name: entry.collection_name,
          payload: entry.payload,
          metadata,
        });
        continue;
      }

      // Array style: { name, items }
      if (entry.name && ("items" in entry)) {
        rows.push({
          collection_name: entry.name,
          payload: entry.items,
          metadata,
        });
        continue;
      }

      // Fallback: if entry has a single key where value is an array:
      const keys = Object.keys(entry);
      if (keys.length === 1 && Array.isArray((entry as any)[keys[0]])) {
        rows.push({
          collection_name: keys[0],
          payload: (entry as any)[keys[0]],
          metadata,
        });
        continue;
      }

      // Last-resort: if entry itself looks like a collection array (unnamed)
      if (Array.isArray(entry)) {
        rows.push({
          collection_name: "unnamed_collection",
          payload: entry,
          metadata,
        });
        continue;
      }

      // If none matched, skip entry (keeps behaviour conservative)
    }

    return rows;
  }

  // Unknown shape
  return rows;
};

/**
 * handler
 * @description Netlify Function entry point. Validates env, auth, input and inserts
 *              normalized rows into Supabase via REST.
 * @param event Netlify event object
 * @param context Netlify context object
 */
export const handler = async (event: any, context: any) => {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
    const MIGRATION_TABLE = process.env.MIGRATION_TABLE || "migrated_collections";

    // --- Validate ENV vars ---
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !ADMIN_TOKEN) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          ok: false,
          error:
            "Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_TOKEN",
        }),
      };
    }

    // --- Health check (GET or POST with header) ---
    // Note: Netlify routing may block GET for this endpoint depending on your site
    // settings. A separate /health function is recommended. We still keep a
    // permissive check for convenience.
    if (event.httpMethod === "GET") {
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true, service: "migrate", version: 1 }),
      };
    }

    if (event.httpMethod === "POST" && event.headers && (event.headers["x-health-check"] === "true" || event.headers["X-Health-Check"] === "true")) {
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true, service: "migrate", version: 1 }),
      };
    }

    // --- Only allow POST for actual migrations ---
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers: { Allow: "POST,GET,OPTIONS" },
        body: JSON.stringify({ ok: false, error: "Method not allowed" }),
      };
    }

    // --- Authentication check ---
    const authHeader =
      (event.headers && (event.headers.authorization || event.headers.Authorization)) || "";
    const expected = `Bearer ${ADMIN_TOKEN}`;

    if (authHeader !== expected) {
      return {
        statusCode: 401,
        body: JSON.stringify({ ok: false, error: "Unauthorized" }),
      };
    }

    // --- Parse the JSON body ---
    let bodyJson: any;
    try {
      bodyJson = JSON.parse(event.body || "{}");
    } catch (e: any) {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, error: "Invalid JSON body" }),
      };
    }

    const { metadata = {}, collections } = bodyJson;

    // Accept multiple incoming shapes for collections (see normalizeCollections)
    const rows = normalizeCollections(collections, metadata);

    if (!rows || rows.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          ok: false,
          error:
            "No collections to migrate or unrecognized collections shape. Accepted shapes: object map or array of {name,items} or {collection_name,payload}.",
        }),
      };
    }

    // --- Insert into Supabase REST ---
    const insertUrl = `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${encodeURIComponent(
      MIGRATION_TABLE
    )}`;

    const resp = await fetch(insertUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Prefer: "return=representation",
      },
      body: JSON.stringify(rows),
    });

    const text = await resp.text();
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }

    if (!resp.ok) {
      return {
        statusCode: 502,
        body: JSON.stringify({
          ok: false,
          error: "Supabase REST insert failed",
          status: resp.status,
          body: parsed,
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        inserted: Array.isArray(parsed) ? parsed.length : rows.length,
        rows: parsed,
      }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: err?.message || String(err),
      }),
    };
  }
};