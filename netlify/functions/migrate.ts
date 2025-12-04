/**
 * migrate.ts
 *
 * Netlify Function: migrate
 *
 * Purpose:
 * - Accepts a migration payload and inserts rows into a Supabase table via the Supabase REST API.
 * - Be tolerant of multiple incoming payload shapes:
 *   1) single flat object: { collection_name|collection_key, payload|items|collections, metadata? }
 *   2) object-map: { collections: { collectionName: [ ...items ] } }
 *   3) array form: { collections: [ { name, items|payload }, ... ] }
 *   4) bare array body -> treated as unnamed_collection
 *   5) top-level items (items: [ ... ]) combined with collection_name/collection_key
 *
 * - Provides a POST-based health check using header `x-health-check: true`.
 * - Logs the normalized rows to Netlify logs for debugging.
 * - Returns the Supabase response and the normalized rows (for easier client-side inspection).
 *
 * Notes:
 * - Required environment variables:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   ADMIN_TOKEN
 *   MIGRATION_TABLE (optional, defaults to "migrated_collections")
 *
 * - This file attempts to be defensive & forgiving about payload shapes to reduce 400 errors.
 */

/**
 * Imports
 * node-fetch is used for environments where global fetch is not available.
 */
import fetch from "node-fetch";

/**
 * normalizeCollections
 * @description Convert object-map or array entries into rows for insertion.
 * @param collections any incoming collections data
 * @param metadata metadata object to attach to rows
 * @returns Array of rows in shape: { collection_name, payload, metadata }
 */
const normalizeCollections = (collections: any, metadata: any) => {
  const rows: Array<Record<string, any>> = [];

  // object map: { name: [items] }
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

  // array style
  if (Array.isArray(collections)) {
    for (const entry of collections) {
      if (!entry || typeof entry !== "object") {
        // primitive or array entry -> unnamed collection
        if (Array.isArray(entry)) {
          rows.push({
            collection_name: "unnamed_collection",
            payload: entry,
            metadata,
          });
        }
        continue;
      }

      // rest-like: { collection_name, payload/items }
      if ((entry.collection_name || entry.collection_key) && ("payload" in entry || "items" in entry)) {
        rows.push({
          collection_name: entry.collection_name ?? entry.collection_key,
          payload: entry.payload ?? entry.items,
          metadata,
        });
        continue;
      }

      // array style: { name, items|payload }
      if ((entry.name || entry.collection_name) && ("items" in entry || "payload" in entry)) {
        rows.push({
          collection_name: entry.name ?? entry.collection_name,
          payload: entry.items ?? entry.payload,
          metadata,
        });
        continue;
      }

      // fallback: if entry has a single key whose value is array
      const keys = Object.keys(entry);
      if (keys.length === 1 && Array.isArray((entry as any)[keys[0]])) {
        rows.push({
          collection_name: keys[0],
          payload: (entry as any)[keys[0]],
          metadata,
        });
        continue;
      }

      // otherwise treat entry as payload for unnamed collection
      rows.push({
        collection_name: "unnamed_collection",
        payload: entry,
        metadata,
      });
    }
    return rows;
  }

  return rows;
};

/**
 * normalizeAnyPayload
 * @description Normalize various payload shapes into rows[] suitable for insertion.
 * Supports top-level items (items: []) as well as payload wrapper shapes.
 * @param body parsed request body
 * @returns Array of { collection_name, payload, metadata }
 */
const normalizeAnyPayload = (body: any) => {
  const metadata = body?.metadata ?? {};

  // 1) If body contains top-level collection_name or collection_key -> single flat object expected by older code
  if (body && typeof body === "object" && (body.collection_name || body.collection_key)) {
    const collectionName = (body.collection_name || body.collection_key) as string;

    // Accept many payload containers: payload, items, collections, or even top-level arrays
    let payload =
      body.payload ??
      body.items ??
      body.collections ??
      (() => {
        // Remove known keys and if remaining single key contains array, return it
        const copy = { ...body };
        delete copy.collection_name;
        delete copy.collection_key;
        delete copy.metadata;
        delete copy.payload;
        delete copy.items;
        delete copy.collections;

        const keys = Object.keys(copy);
        if (keys.length === 1 && Array.isArray((copy as any)[keys[0]])) {
          return (copy as any)[keys[0]];
        }

        // If there are no other keys and body is itself an array-like (rare), fallback
        return copy;
      })();

    // If payload is an object with items property (e.g. payload: { items: [...] }) unwrap it
    if (payload && typeof payload === "object" && "items" in payload && Array.isArray(payload.items)) {
      payload = payload.items;
    }

    return [
      {
        collection_name: collectionName,
        payload,
        metadata,
      },
    ];
  }

  // 2) If body.collections exists -> delegate
  if ("collections" in (body || {})) {
    return normalizeCollections(body.collections, metadata);
  }

  // 3) If body has top-level 'items' and also 'name' or 'collection_name' -> map directly
  if (body && typeof body === "object" && Array.isArray(body.items) && (body.name || body.collection_name || body.collection_key)) {
    const collectionName = body.name ?? body.collection_name ?? body.collection_key ?? "unnamed_collection";
    return [
      {
        collection_name: collectionName,
        payload: body.items,
        metadata,
      },
    ];
  }

  // 4) If body itself is an array -> unnamed collection
  if (Array.isArray(body)) {
    return [
      {
        collection_name: "unnamed_collection",
        payload: body,
        metadata,
      },
    ];
  }

  // 5) If body is object with a single array-valued key -> treat as collection
  if (body && typeof body === "object") {
    const keys = Object.keys(body || {});
    if (keys.length === 1 && Array.isArray((body as any)[keys[0]])) {
      return [
        {
          collection_name: keys[0],
          payload: (body as any)[keys[0]],
          metadata,
        },
      ];
    }
  }

  // Nothing recognized
  return [];
};

/**
 * handler
 * @description Netlify function entry point. Validates env, auth, input and inserts
 * normalized rows into Supabase via REST. Supports POST health-check header x-health-check.
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
          error: "Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_TOKEN",
        }),
      };
    }

    // CORS headers
    const corsHeaders = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, X-Health-Check",
    };

    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 204,
        headers: corsHeaders,
        body: "",
      };
    }

    // POST health-check via header
    const xHealth = (event.headers && (event.headers["x-health-check"] || event.headers["X-Health-Check"])) || "";
    if (event.httpMethod === "POST" && String(xHealth).toLowerCase() === "true") {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ ok: true, service: "migrate", version: 1 }),
      };
    }

    // Only allow POST for actual migrations
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers: { ...corsHeaders, Allow: "POST,OPTIONS" },
        body: JSON.stringify({ ok: false, error: "Method not allowed" }),
      };
    }

    // Authentication check — require Bearer ADMIN_TOKEN
    const authHeader = (event.headers && (event.headers.authorization || event.headers.Authorization)) || "";
    const expected = `Bearer ${ADMIN_TOKEN}`;
    if (authHeader !== expected) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ ok: false, error: "Unauthorized — provide Bearer <ADMIN_TOKEN>" }),
      };
    }

    // Parse the JSON body
    let bodyJson: any;
    try {
      bodyJson = event.body ? JSON.parse(event.body) : {};
    } catch (e: any) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ ok: false, error: "Invalid JSON body" }),
      };
    }

    // Normalize incoming payload into rows[]
    const rows = normalizeAnyPayload(bodyJson);

    // Log the incoming raw and normalized rows for debugging
    console.log("Incoming raw body:", typeof event.body === "string" ? event.body : JSON.stringify(event.body));
    console.log("Normalized rows:", JSON.stringify(rows, null, 2));

    if (!rows || rows.length === 0) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          ok: false,
          error:
            "No collections to migrate or unrecognized collections shape. Supported shapes: single flat object with collection_name/collection_key and payload|items, object map { collections: { name: [...] } }, array of collections [ { name, items } ], or bare array payload.",
        }),
      };
    }

    // Insert into Supabase REST
    const insertUrl = `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${encodeURIComponent(MIGRATION_TABLE)}`;

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
      console.error("Supabase insert failed:", resp.status, parsed);
      return {
        statusCode: 502,
        headers: corsHeaders,
        body: JSON.stringify({
          ok: false,
          error: "Supabase REST insert failed",
          status: resp.status,
          body: parsed,
        }),
      };
    }

    // Return inserted rows and also echo the normalized rows used for insertion to help clients debug
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        ok: true,
        inserted: Array.isArray(parsed) ? parsed.length : rows.length,
        rows: parsed,
        normalizedRows: rows,
      }),
    };
  } catch (err: any) {
    console.error("Unhandled error in migrate handler:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: err?.message || String(err),
      }),
    };
  }
};