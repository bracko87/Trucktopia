/**
 * netlify/functions/migrate.ts
 *
 * Serverless migration endpoint for Netlify.
 *
 * Purpose:
 * - Accepts a POST request with a migration payload { metadata, collections }.
 * - Validates an ADMIN token header.
 * - Inserts rows into a Supabase table (default: migrated_collections) via Supabase REST.
 *
 * Security:
 * - Requires environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_TOKEN.
 * - Do NOT put service role keys in client-side code.
 *
 * Notes:
 * - This file is intended for Netlify Functions (place under netlify/functions).
 * - Keep the ADMIN_TOKEN secret in Netlify site environment variables.
 */

import fetch from "node-fetch";

/**
 * handler
 * @description Netlify function entry point. Validates method and auth, parses payload,
 *              and inserts migration rows into Supabase via REST.
 * @param {any} event Netlify event object
 * @param {any} context Netlify context object
 * @returns {Promise<any>} Netlify function response
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

    // --- Health check ---
    if (event.httpMethod === "GET") {
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true, service: "migrate", version: 1 }),
      };
    }

    // --- Only allow POST ---
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers: { Allow: "POST,GET" },
        body: JSON.stringify({ ok: false, error: "Method not allowed" }),
      };
    }

    // --- Authentication check ---
    const authHeader =
      event.headers.authorization || event.headers.Authorization || "";
    const expected = `Bearer ${ADMIN_TOKEN}`;

    if (authHeader !== expected) {
      return {
        statusCode: 401,
        body: JSON.stringify({ ok: false, error: "Unauthorized" }),
      };
    }

    // --- Parse the JSON body ---
    let bodyJson;
    try {
      bodyJson = JSON.parse(event.body || "{}");
    } catch (e) {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, error: "Invalid JSON body" }),
      };
    }

    const { metadata = {}, collections } = bodyJson;

    if (
      !collections ||
      typeof collections !== "object" ||
      Array.isArray(collections)
    ) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          ok: false,
          error: "collections must be an object map of arrays",
        }),
      };
    }

    // --- Build rows for Supabase insert ---
    const rows: Array<Record<string, any>> = [];
    for (const [collectionName, items] of Object.entries(collections)) {
      rows.push({
        collection_name: collectionName,
        payload: items,
        metadata,
      });
    }

    if (rows.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, error: "No collections to migrate" }),
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