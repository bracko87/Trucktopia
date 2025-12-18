/**
 * netlify/functions/total-jobs.js
 *
 * File-level:
 * Serverless endpoint that returns a stable "Total Jobs" number persisted to Supabase
 * (preferred) or generated on-demand. This function:
 *  - Attempts to read site_metrics.key = 'total_jobs' via Supabase REST API.
 *  - If a record exists and is fresh (<24h) returns it.
 *  - Otherwise generates a number between 9000 and 9999, tries to persist it (PATCH or POST),
 *    and returns the generated value (persisted flag indicates success).
 *
 * Notes:
 *  - Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Netlify env.
 *  - Table expected: public.site_metrics with columns (key text primary key, value integer, updated_at timestamptz).
 *  - If the table does not exist or the write fails, the function still returns a generated number.
 */

/* eslint-disable no-undef */
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * handler
 * @description Netlify lambda handler to return { totalJobs: number, persisted: boolean }
 */
module.exports.handler = async function () {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable' })
      };
    }

    // Build REST base (ensure no trailing slash)
    const restBase = SUPABASE_URL.replace(/\/$/, '') + '/rest/v1';
    const recordKey = 'total_jobs';

    // Helper: fetch existing metric
    const getExisting = async () => {
      const url = `${restBase}/site_metrics?select=key,value,updated_at&key=eq.${encodeURIComponent(recordKey)}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: SERVICE_KEY,
          Accept: 'application/json'
        }
      });
      if (!res.ok) return null;
      const json = await res.json().catch(() => null);
      if (!Array.isArray(json) || json.length === 0) return null;
      return json[0];
    };

    // Helper: try PATCH (update existing row)
    const tryPatch = async (value, iso) => {
      const url = `${restBase}/site_metrics?key=eq.${encodeURIComponent(recordKey)}`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: SERVICE_KEY,
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        },
        body: JSON.stringify({ value, updated_at: iso })
      });
      return res.ok;
    };

    // Helper: try POST (insert new row, merge duplicates if supported)
    const tryPost = async (value, iso) => {
      const url = `${restBase}/site_metrics`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: SERVICE_KEY,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates' // best-effort upsert
        },
        body: JSON.stringify([{ key: recordKey, value, updated_at: iso }])
      });
      return res.ok;
    };

    // Try read
    const existing = await getExisting();
    if (existing && typeof existing.value === 'number') {
      // If updated_at exists and is recent (<24h) return it
      if (existing.updated_at) {
        const updatedTime = new Date(existing.updated_at).getTime();
        if (!Number.isNaN(updatedTime) && Date.now() - updatedTime < DAY_MS) {
          return { statusCode: 200, body: JSON.stringify({ totalJobs: Number(existing.value), persisted: true }) };
        }
      } else {
        // No updated_at -> treat as fresh and return
        return { statusCode: 200, body: JSON.stringify({ totalJobs: Number(existing.value), persisted: true }) };
      }
    }

    // Need to generate and persist (best-effort)
    const generated = Math.floor(9000 + Math.random() * 1000); // 9000-9999
    const iso = new Date().toISOString();

    let persisted = false;
    try {
      // Try patch first (if row existed but stale)
      persisted = await tryPatch(generated, iso);
      if (!persisted) {
        // Fallback to POST insert/upsert
        persisted = await tryPost(generated, iso);
      }
    } catch (e) {
      persisted = false;
    }

    return { statusCode: 200, body: JSON.stringify({ totalJobs: generated, persisted }) };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: String(err) })
    };
  }
};
