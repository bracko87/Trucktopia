/**
 * netlify/functions/supabase-stats.js
 *
 * Serverless endpoint that returns system statistics sourced from Supabase.
 *
 * Responsibilities:
 * - Query Supabase Admin API for total user count (requires SUPABASE_SERVICE_ROLE).
 * - Query Supabase Postgres REST API for companies count (uses service role).
 * - Compute users created today as "activeToday" (approximation).
 *
 * Security:
 * - This function MUST run server-side. The service role key is read from
 *   process.env.SUPABASE_SERVICE_ROLE and MUST NOT be exposed to the client.
 *
 * Environment variables required:
 * - SUPABASE_URL (e.g. https://xxx.supabase.co)
 * - SUPABASE_SERVICE_ROLE (service_role key)
 *
 * Notes:
 * - Admin API pagination is used for robust user counting.
 * - If your schema uses a different table for companies adjust the COMPANIES_TABLE constant.
 */

const fetch = global.fetch || require('node-fetch');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

/**
 * tryRespond
 * @description helper to return JSON error
 */
const tryRespond = (status, body) => {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };
};

exports.handler = async function (event, context) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    return tryRespond(500, { error: 'Server misconfiguration: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE' });
  }

  try {
    // 1) Total users via Admin API (paginated)
    let totalUsers = 0;
    const perPage = 1000;
    let page = 1;
    while (true) {
      const usersRes = await fetch(`${SUPABASE_URL.replace(/\\/$/, '')}/auth/v1/admin/users?per_page=${perPage}&page=${page}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
          apikey: SUPABASE_SERVICE_ROLE
        }
      });

      if (!usersRes.ok) {
        // If unauthorized or admin endpoint blocked, abort and return partial data
        const text = await usersRes.text().catch(() => null);
        return tryRespond(502, { error: 'Failed to fetch users from Supabase Admin API', detail: text, status: usersRes.status });
      }

      const usersBatch = await usersRes.json();
      if (!Array.isArray(usersBatch)) break;
      totalUsers += usersBatch.length;

      if (usersBatch.length < perPage) break;
      page += 1;

      // Safety: avoid infinite loops (very large userbases should be handled differently)
      if (page > 1000) break;
    }

    // 2) With Companies: try to query public.companies via Postgres REST with count=exact.
    //    Adjust COMPANIES_TABLE if your project's companies table is named differently.
    const COMPANIES_TABLE = 'companies';
    let usersWithCompanies = 0;
    try {
      const companiesUrl = `${SUPABASE_URL.replace(/\\/$/, '')}/rest/v1/${COMPANIES_TABLE}?select=id`;
      const companiesRes = await fetch(companiesUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
          apikey: SUPABASE_SERVICE_ROLE,
          Prefer: 'count=exact'
        }
      });

      if (companiesRes.ok) {
        // Prefer: count=exact causes a Content-Range header with total if supported
        const contentRange = companiesRes.headers.get('content-range') || companiesRes.headers.get('Content-Range');
        if (contentRange) {
          // content-range format: 0-9/42
          const parts = contentRange.split('/');
          const parsed = Number(parts[1]);
          if (!Number.isNaN(parsed)) usersWithCompanies = parsed;
          else {
            const body = await companiesRes.json().catch(() => []);
            usersWithCompanies = Array.isArray(body) ? body.length : 0;
          }
        } else {
          const body = await companiesRes.json().catch(() => []);
          usersWithCompanies = Array.isArray(body) ? body.length : 0;
        }
      } else {
        // fallback: 0 and do not fail entire response
        usersWithCompanies = 0;
      }
    } catch (err) {
      usersWithCompanies = 0;
    }

    // 3) activeToday: approximate by counting users with created_at === today (UTC)
    let activeToday = 0;
    try {
      // For efficiency we re-run a paginated pass but check created_at
      const perPage2 = 1000;
      let page2 = 1;
      const todayDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      while (true) {
        const res = await fetch(`${SUPABASE_URL.replace(/\\/$/, '')}/auth/v1/admin/users?per_page=${perPage2}&page=${page2}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
            apikey: SUPABASE_SERVICE_ROLE
          }
        });
        if (!res.ok) break;
        const batch = await res.json();
        if (!Array.isArray(batch)) break;
        for (const u of batch) {
          // created_at may be present in admin user objects
          const created = u?.created_at || u?.createdAt || u?.created;
          if (!created) continue;
          const d = String(created).split('T')[0];
          if (d === todayDate) activeToday += 1;
        }
        if (batch.length < perPage2) break;
        page2 += 1;
        if (page2 > 1000) break;
      }
    } catch (err) {
      activeToday = 0;
    }

    // 4) storageUsed: Not available server-side for browser localStorage;
    //    return null and let client compute if desired.
    const storageUsed = null;

    return tryRespond(200, {
      totalUsers,
      usersWithCompanies,
      activeToday,
      storageUsed
    });
  } catch (err) {
    return tryRespond(500, { error: 'Unexpected server error', detail: String(err) });
  }
};