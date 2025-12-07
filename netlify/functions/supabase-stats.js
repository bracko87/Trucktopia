/**
 * netlify/functions/supabase-stats.js
 *
 * Serverless endpoint returning admin statistics from Supabase.
 *
 * Responsibilities:
 * - Use SUPABASE_URL and SUPABASE_SERVICE_ROLE (server-only env vars) to query Supabase Admin endpoints.
 * - Always return JSON. Never return raw HTML from upstream services.
 * - Provide useful error messages to help debugging (do NOT leak secrets).
 *
 * Notes:
 * - Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE are set in your Netlify site settings.
 */

const fetch = global.fetch || require('node-fetch');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

const jsonResponse = (status, body) => {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify(body)
  };
};

exports.handler = async function handler() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    return jsonResponse(500, {
      error: 'Configuration error',
      message: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE environment variables on the server.'
    });
  }

  try {
    // 1) Try to get a user count via the Admin Users endpoint (paged).
    //    We request a small page and read any count header, otherwise leave null.
    let totalUsers = null;
    try {
      const usersRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
          Accept: 'application/json'
        }
      });

      // If upstream produced an HTML error (403, etc.), don't forward HTML; throw instead.
      if (!usersRes.ok) {
        throw new Error(`Supabase admin users request failed: ${usersRes.status} ${usersRes.statusText}`);
      }

      // Try to read count from possible headers
      const contentRange = usersRes.headers.get('content-range') || usersRes.headers.get('x-total-count') || usersRes.headers.get('x-total');
      if (contentRange) {
        // content-range format can be '0-0/123' or an integer in x-total-count
        const parts = contentRange.split('/');
        const lastPart = parts[parts.length - 1];
        const parsed = parseInt(lastPart, 10);
        if (!Number.isNaN(parsed)) totalUsers = parsed;
      } else {
        // As fallback attempt to parse JSON length (small cost)
        const usersJson = await usersRes.json().catch(() => null);
        if (Array.isArray(usersJson)) {
          // we only requested 1, but if admin endpoint doesn't return counts, leave null
          totalUsers = usersJson.length === 1 ? null : usersJson.length;
        }
      }
    } catch (e) {
      // If admin users call fails, we capture the problem but continue to attempt other metrics.
      // Do not leak internals; include safe message for debug.
      totalUsers = null;
      console.warn('supabase-stats: users fetch error', e.message);
    }

    // 2) Companies count using PostgREST with Prefer: count=exact
    let usersWithCompanies = null;
    try {
      const companiesRes = await fetch(`${SUPABASE_URL}/rest/v1/companies?select=id`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
          apikey: SUPABASE_SERVICE_ROLE,
          Accept: 'application/json',
          Prefer: 'count=exact'
        }
      });

      if (!companiesRes.ok) {
        throw new Error(`Supabase companies request failed: ${companiesRes.status} ${companiesRes.statusText}`);
      }

      const contentRange = companiesRes.headers.get('content-range') || companiesRes.headers.get('x-total-count');
      if (contentRange) {
        const parts = contentRange.split('/');
        const lastPart = parts[parts.length - 1];
        const parsed = parseInt(lastPart, 10);
        if (!Number.isNaN(parsed)) usersWithCompanies = parsed;
      } else {
        // fallback: parse body length if small
        const companiesJson = await companiesRes.json().catch(() => null);
        if (Array.isArray(companiesJson)) {
          usersWithCompanies = companiesJson.length;
        }
      }
    } catch (e) {
      usersWithCompanies = null;
      console.warn('supabase-stats: companies fetch error', e.message);
    }

    // 3) Active today: best-effort (we attempt to use auth.users created_at or last_sign_in if available).
    //    If we cannot get it reliably, return null and explain in the client.
    let activeToday = null;
    try {
      // We'll attempt to query auth.users with a created_at filter for today (ISO date).
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const activeRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?created_at=gte.${today}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
          Accept: 'application/json'
        }
      });

      if (activeRes.ok) {
        const contentRange = activeRes.headers.get('content-range') || activeRes.headers.get('x-total-count');
        if (contentRange) {
          const parts = contentRange.split('/');
          const lastPart = parts[parts.length - 1];
          const parsed = parseInt(lastPart, 10);
          if (!Number.isNaN(parsed)) activeToday = parsed;
        } else {
          const body = await activeRes.json().catch(() => null);
          if (Array.isArray(body)) activeToday = body.length;
        }
      } else {
        activeToday = null;
      }
    } catch (e) {
      activeToday = null;
      console.warn('supabase-stats: activeToday fetch error', e.message);
    }

    // 4) Storage used: we don't compute real storage here; leave as null or supplied if you want.
    const storageUsed = null;

    return jsonResponse(200, {
      totalUsers,
      usersWithCompanies,
      activeToday,
      storageUsed,
      error: null
    });
  } catch (err) {
    // Unexpected error
    console.error('supabase-stats unexpected error', err);
    return jsonResponse(500, {
      error: 'Unexpected server error',
      message: 'An unexpected error occurred while gathering statistics. Check server logs for details.'
    });
  }
};