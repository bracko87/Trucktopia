/**
 * netlify/functions/supabase-stats.js
 *
 * File-level:
 * Serverless endpoint that returns a small JSON payload with totalUsers.
 * - Designed to run on Netlify (Node 18+), using the global fetch API (no node-fetch).
 * - Tries multiple fallbacks for counting users:
 *   1) Query REST endpoint for private/public table "tm_users" using Range to read Content-Range.
 *   2) Fallback to "users" table.
 *   3) Fallback to Supabase Admin users endpoint (admin/v1/users) and read headers.
 *
 * Env requirements (set in Netlify / hosting provider):
 * - SUPABASE_URL (e.g. https://xyz.supabase.co)
 * - SUPABASE_SERVICE_ROLE_KEY (service_role key; server-side only)
 *
 * Security:
 * - This function must run server-side only and never expose the service role key to clients.
 */

/**
 * parseTotalFromContentRange
 *
 * @description Parse total count from `Content-Range` header like "0-0/123".
 * @param {string | null} header
 * @returns {number | null}
 */
function parseTotalFromContentRange(header) {
  if (!header) return null;
  try {
    const parts = header.split('/');
    if (parts.length === 2) {
      const n = Number(parts[1]);
      if (!Number.isNaN(n)) return n;
    }
    // Some servers may return just a number header (x-total-count)
    const n = Number(header);
    if (!Number.isNaN(n)) return n;
  } catch {
    // ignore
  }
  return null;
}

/**
 * tryTableCount
 *
 * @description Try to query a PostgREST table using Range:0-0 and read Content-Range header.
 * @param {string} baseUrl
 * @param {string} serviceKey
 * @param {string} table
 * @returns {Promise<number|null>}
 */
async function tryTableCount(baseUrl, serviceKey, table) {
  try {
    const url = `${baseUrl.replace(/\/$/, '')}/rest/v1/${encodeURIComponent(table)}?select=id`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        Range: '0-0'
      }
    });
    if (!res.ok) return null;
    const cr = res.headers.get('content-range') || res.headers.get('Content-Range') || res.headers.get('x-total-count');
    const parsed = parseTotalFromContentRange(cr);
    if (parsed !== null) return parsed;
    // Last-resort: parse body (may be small if table tiny)
    const body = await res.json().catch(() => null);
    if (Array.isArray(body)) return body.length;
    return null;
  } catch {
    return null;
  }
}

/**
 * handler
 *
 * @description Netlify lambda entrypoint. Returns JSON: { totalUsers: number | null }
 */
exports.handler = async function (event) {
  // Ensure env present
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable', totalUsers: null })
    };
  }

  try {
    // 1) Try tm_users table
    let total = await tryTableCount(SUPABASE_URL, SERVICE_KEY, 'tm_users');
    // 2) Try users table
    if (total === null) total = await tryTableCount(SUPABASE_URL, SERVICE_KEY, 'users');

    // 3) Fallback: Supabase admin users endpoint (may require exact admin path and service role)
    if (total === null) {
      try {
        const adminUrl = `${SUPABASE_URL.replace(/\/$/, '')}/admin/v1/users?per_page=1`;
        const adminRes = await fetch(adminUrl, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${SERVICE_KEY}`,
            apikey: SERVICE_KEY
          }
        });
        if (adminRes.ok) {
          const cr = adminRes.headers.get('content-range') || adminRes.headers.get('x-total-count') || adminRes.headers.get('Content-Range');
          const parsed = parseTotalFromContentRange(cr);
          if (parsed !== null) total = parsed;
        }
      } catch {
        // ignore admin fallback errors
      }
    }

    // Return result (null signals unknown)
    return {
      statusCode: 200,
      body: JSON.stringify({ totalUsers: total })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: String(err), totalUsers: null })
    };
  }
};