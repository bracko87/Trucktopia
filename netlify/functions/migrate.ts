/**
 * netlify/functions/migrate.ts
 *
 * Netlify Function: migrate
 *
 * Purpose:
 * - Accepts a migration payload and inserts rows into a Supabase table via the Supabase REST API.
 * - Be tolerant of multiple incoming payload shapes:
 *   1) object-map: { collections: { collectionName: [ ...items ] } }
 *   2) array form: { collections: [ { name: 'collectionName', items: [...] }, ... ] }
 *   3) rest-like: { collections: [ { collection_name: 'collectionName', payload: [...] } ] }
 *   4) single flat object: { collection_name: 'name', payload: [...] } or { collection_key: 'key', payload: [...] }
 *   5) unnamed array payloads: { collections: [ ... ] } or body is an array
 *
 * - Provides a POST-based health check using the header `x-health-check: true`.
 *
 * Notes:
 * - Required environment variables:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   ADMIN_TOKEN
 *   MIGRATION_TABLE (optional, defaults to "migrated_collections")
 *
 * - This file logs normalized rows to Netlify logs to ease debugging during sandbox use.
 */

/**
 * Imports
 * Use node-fetch which is commonly available in Node environments used by Netlify functions.
 */
import fetch from "node-fetch";

/**
 * normalizeCollections
 * @description Convert various "collections" shapes into an array of rows acceptable for insertion.
 * @param collections any incoming collections data
 * @param metadata any metadata to attach to rows
 * @returns Array of rows in shape: { collection_name, payload, metadata }
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
      if (!entry || typeof entry !== "object") {
        // If entry itself is a primitive or array, treat as unnamed collection
        if (Array.isArray(entry)) {
          rows.push({
            collection_name: "unnamed_collection",
            payload: entry,
            metadata,
          });
        }
        continue;
      }

      // Rest-like: { collection_name, payload }
      if (entry.collection_name && ("payload" in entry || "items" in entry)) {
        rows.push({
          collection_name: entry.collection_name,
          payload: entry.payload ?? entry.items,
          metadata,
        });
        continue;
      }

      // Array style: { name, items }
      if (entry.name && ("items" in entry || "payload" in entry)) {
        rows.push({
          collection_name: entry.name,
          payload: entry.items ?? entry.payload,
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

      // If entry looks like a collection item object but not wrapped, treat the whole entry as payload
      // and try to derive a name
      if (!entry.collection_name && !entry.name) {
        rows.push({
          collection_name: "unnamed_collection",
          payload: entry,
          metadata,
        });
        continue;
      }
    }

    return rows;
  }

  // Unknown shape -> empty rows
  return rows;
};

/**
 * normalizeAnyPayload
 * @description Accepts the parsed request body and attempts to normalize it into the rows[] format.
 * Handles:
 * - top-level body.collection_name / collection_key as single collection
 * - body.collections as object map or array (delegates to normalizeCollections)
 * - body as an array -> single unnamed collection
 * - fallback conservative behaviour (returns [] if nothing recognized)
 * @param body parsed request body
 * @returns Array of { collection_name, payload, metadata }
 */
const normalizeAnyPayload = (body: any) => {
  const metadata = body?.metadata ?? {};

  // 1) If body contains a top-level collection_name or collection_key -> single flat object expected by older code
  if (body && typeof body === "object" && (body.collection_name || body.collection_key)) {
    const collectionName = (body.collection_name || body.collection_key) as string;
    // payload may be under payload, items, collections, or the body itself (conservative)
    const payload =
      body.payload ??
      body.items ??
      body.collections ??
      (() => {
        // If there are other keys, try to remove collection_name/collection_key and metadata, use the rest as payload
        const copy = { ...body };
        delete copy.collection_name;
        delete copy.collection_key;
        delete copy.metadata;
        delete copy.payload;
        delete copy.items;
        delete copy.collections;
        // If copy has a single key that is an array, use that array
        const keys = Object.keys(copy);
        if (keys.length === 1 && Array.isArray((copy as any)[keys[0]])) {
          return (copy as any)[keys[0]];
        }
        return copy;
      })();

    return [
      {
        collection_name: collectionName,
        payload,
        metadata,
      },
    ];
  }

  // 2) If body.collections exists: pass to normalizeCollections
  if ("collections" in (body || {})) {
    return normalizeCollections(body.collections, metadata);
  }

  // 3) If body is an array itself, treat as unnamed collection payload
  if (Array.isArray(body)) {
    return [
      {
        collection_name: "unnamed_collection",
        payload: body,
        metadata,
      },
    ];
  }

  // 4) If body has a top-level single key whose value is array, map to collection
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
          error:
            "Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_TOKEN",
        }),
      };
    }

    // Handle CORS preflight
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

    // Provide a POST-based health-check to avoid GET restriction by Netlify method policy
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
      // Provide small hint to use the admin token (do not leak token)
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

    // Log the normalized rows for debugging (Netlify function logs)
    console.log("Normalized rows:", JSON.stringify(rows, null, 2));

    if (!rows || rows.length === 0) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          ok: false,
          error:
            "No collections to migrate or unrecognized collections shape. Supported shapes: object map, array of {name,items|payload}, single flat object with collection_name or collection_key, or bare array payload.",
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

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        ok: true,
        inserted: Array.isArray(parsed) ? parsed.length : rows.length,
        rows: parsed,
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