/**
 * migrate.ts
 *
 * Netlify Function: migrate
 *
 * Purpose:
 * - Accept migration payloads in a tolerant manner and insert rows into a Supabase table.
 * - Normalize a variety of incoming payload shapes into canonical rows suitable for insertion:
 *   { collection_name: string, payload: object, metadata: object }
 * - Provide a dry-run mode so clients can preview normalized rows without inserting them.
 *
 * Notes:
 * - Required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_TOKEN
 * - Optional env var: MIGRATION_TABLE (defaults to "migrated_collections")
 *
 * The normalization strives to:
 * - Wrap arrays into payload.items when necessary
 * - Accept top-level `items`, `payload`, `collections`, or raw array bodies
 * - Return informative errors and the normalized rows to help client debugging
 */

import fetch from "node-fetch";

/**
 * normalizeCollections
 * @description Convert object-map or array entries into normalized rows for insertion.
 * Ensures payload is an object (wrap arrays into { items: [...] } when necessary).
 * @param collections any incoming collections data
 * @param metadata metadata object to attach to rows
 * @returns Array of rows: { collection_name, payload, metadata }
 */
const normalizeCollections = (collections: any, metadata: any) => {
  const rows: Array<Record<string, any>> = [];

  // object map: { name: [items] } or { name: { items: [...] } }
  if (collections && typeof collections === "object" && !Array.isArray(collections)) {
    for (const [collectionName, items] of Object.entries(collections)) {
      const payload = ensurePayloadIsObjectWithItems(items);
      rows.push({
        collection_name: collectionName,
        payload,
        metadata,
      });
    }
    return rows;
  }

  // array style: collections is an array of collection entries
  if (Array.isArray(collections)) {
    for (const entry of collections) {
      if (!entry || typeof entry !== "object") {
        // primitive or array entry -> unnamed collection (wrap array into payload.items)
        if (Array.isArray(entry)) {
          rows.push({
            collection_name: "unnamed_collection",
            payload: { items: entry },
            metadata,
          });
        }
        continue;
      }

      // shape: { collection_name | collection_key , payload | items }
      const name = entry.collection_name ?? entry.collection_key ?? entry.name ?? null;
      const rawPayload = "payload" in entry ? entry.payload : ("items" in entry ? entry.items : null);

      // If we have explicit name + payload/items -> use them
      if (name && rawPayload !== null) {
        rows.push({
          collection_name: name,
          payload: ensurePayloadIsObjectWithItems(rawPayload),
          metadata,
        });
        continue;
      }

      // fallback: if entry has single key with array value -> treat as collection
      const keys = Object.keys(entry);
      if (keys.length === 1 && Array.isArray((entry as any)[keys[0]])) {
        rows.push({
          collection_name: keys[0],
          payload: { items: (entry as any)[keys[0]] },
          metadata,
        });
        continue;
      }

      // Otherwise treat entry as unnamed collection; ensure payload is object
      rows.push({
        collection_name: name ?? "unnamed_collection",
        payload: ensurePayloadIsObjectWithItems(entry),
        metadata,
      });
    }
    return rows;
  }

  return rows;
};

/**
 * ensurePayloadIsObjectWithItems
 * @description Normalize a value so that payload is always an object.
 * If value is an array -> return { items: value }
 * If value is an object -> if it already looks like a payload (has keys) return as-is,
 *                       but if it is an object-of-items shaped like { id1: {...}, id2: {...} } convert to array -> { items: [ ... ] }
 * For primitives, wrap into { items: [value] }
 * @param value any incoming payload shape
 */
const ensurePayloadIsObjectWithItems = (value: any): any => {
  if (Array.isArray(value)) {
    // Already an array of items -> wrap into object so DB payload is an object
    return { items: value };
  }

  if (value && typeof value === "object") {
    // If object appears to be map-of-items (all values are objects) -> convert to array
    const vals = Object.values(value);
    if (vals.length > 0 && vals.every((v) => typeof v === "object" && !Array.isArray(v))) {
      return { items: vals };
    }
    // If object already has an "items" key that is an array, keep it
    if ("items" in value && Array.isArray(value.items)) {
      return value;
    }
    // Otherwise return the object as payload (keeps arbitrary metadata inside payload)
    return value;
  }

  // Primitive -> wrap
  return { items: [value] };
};

/**
 * normalizeAnyPayload
 * @description Normalize various payload shapes into canonical rows[] suitable for insertion.
 * Supported shapes:
 *  - { collection_name|collection_key, payload|items }
 *  - { collections: { name: [ ...items ] } }
 *  - array -> treated as unnamed collection -> payload: { items: [...] }
 *  - single object where a single key maps to an array -> treated as collection
 *  - top-level items: -> wrapped into payload { items: [...] }
 * @param body parsed request body
 * @returns Array of { collection_name, payload, metadata }
 */
const normalizeAnyPayload = (body: any): Array<Record<string, any>> => {
  const metadata = body?.metadata ?? {};

  // 1) If body contains top-level collection_name or collection_key -> single flat object expected
  if (body && typeof body === "object" && (body.collection_name || body.collection_key)) {
    const collectionName = (body.collection_name || body.collection_key) as string;

    // Accept many payload containers: payload, items, collections, or top-level arrays
    let payloadCandidate =
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

        return copy;
      })();

    // If payloadCandidate is object with items -> unwrap if necessary
    if (payloadCandidate && typeof payloadCandidate === "object" && "items" in payloadCandidate && Array.isArray(payloadCandidate.items)) {
      return [
        {
          collection_name: collectionName,
          payload: ensurePayloadIsObjectWithItems(payloadCandidate),
          metadata,
        },
      ];
    }

    // Else ensure payload is object (wrap arrays)
    return [
      {
        collection_name: collectionName,
        payload: ensurePayloadIsObjectWithItems(payloadCandidate),
        metadata,
      },
    ];
  }

  // 2) If body.collections exists -> delegate
  if ("collections" in (body || {})) {
    return normalizeCollections(body.collections, metadata);
  }

  // 3) If body has top-level 'items' -> treat as unnamed or named collection if name present
  if (body && typeof body === "object" && Array.isArray(body.items)) {
    const collectionName = body.name ?? body.collection_name ?? body.collection_key ?? "unnamed_collection";
    return [
      {
        collection_name: collectionName,
        payload: { items: body.items },
        metadata,
      },
    ];
  }

  // 4) If body itself is an array -> unnamed collection, wrap into payload.items
  if (Array.isArray(body)) {
    return [
      {
        collection_name: "unnamed_collection",
        payload: { items: body },
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
          payload: { items: (body as any)[keys[0]] },
          metadata,
        },
      ];
    }
  }

  // 6) If body is top-level with a single key that looks like a payload (object), treat it as unnamed_collection
  if (body && typeof body === "object") {
    // fallback: treat the entire body as payload object
    return [
      {
        collection_name: "unnamed_collection",
        payload: ensurePayloadIsObjectWithItems(body),
        metadata,
      },
    ];
  }

  // Nothing recognized
  return [];
};

/**
 * handler
 * @description Netlify Function entrypoint: validates env, auth, input and inserts
 * normalized rows into Supabase via REST. Supports POST health-check header x-health-check
 * and a dry-run mode (x-dry-run: true or query param dryRun=true).
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
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, X-Health-Check, X-Dry-Run",
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

    // Determine dry-run header or query param
    const queryParams = (event.queryStringParameters || {}) as Record<string, string>;
    const xDryRunHeader = (event.headers && (event.headers["x-dry-run"] || event.headers["X-Dry-Run"])) || "";
    const dryRun = String(xDryRunHeader).toLowerCase() === "true" || String(queryParams.dryRun || queryParams.dry_run || "").toLowerCase() === "true";

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
            "No collections to migrate or unrecognized collections shape. Supported shapes: single object with collection_name|collection_key and payload|items, { collections: { name: [...] } }, array payload, or top-level items. See normalizedRows for attempted normalization.",
          normalizedRows: rows,
        }),
      };
    }

    // If dry-run requested: return normalized rows without inserting
    if (dryRun) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          ok: true,
          dryRun: true,
          message: "Normalized rows (dry-run) — no insert performed",
          normalizedRows: rows,
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
          normalizedRows: rows,
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