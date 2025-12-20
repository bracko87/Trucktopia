/**
 * netlify/functions/cities-count.js
 *
 * File-level:
 * Serverless function that returns the total number of rows in the public.cities table.
 *
 * Responsibilities:
 * - Use SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from environment.
 * - Call Supabase REST endpoint for public.cities and return the count (best-effort).
 * - Never expose SERVICE_ROLE key to clients (this function runs server-side).
 */

const fetch = require('node-fetch');

/**
 * handler
 * @description Netlify lambda handler that returns { totalCities: number | null }
 */
module.exports.handler = async function () {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable', totalCities: null })
      };
    }

    const restBase = SUPABASE_URL.replace(/\/$/, '') + '/rest/v1';
    const url = `${restBase}/cities?select=id`; // fetch ids; we'll count array length

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
        Accept: 'application/json'
      }
    });

    if (!res.ok) {
      return {
        statusCode: 200,
        body: JSON.stringify({ totalCities: null })
      };
    }

    // Try to use header totals if available (Content-Range)
    const cr = res.headers.get('content-range') || res.headers.get('x-total-count');
    if (cr) {
      try {
        const raw = cr;
        const total = raw.includes('/') ? Number(raw.split('/')[1]) : Number(raw);
        if (!Number.isNaN(total)) {
          return { statusCode: 200, body: JSON.stringify({ totalCities: total }) };
        }
      } catch {
        // fall through to body parse
      }
    }

    // Fallback: parse body and count items
    const json = await res.json().catch(() => null);
    if (Array.isArray(json)) {
      return { statusCode: 200, body: JSON.stringify({ totalCities: json.length }) };
    }

    // Unknown
    return { statusCode: 200, body: JSON.stringify({ totalCities: null }) };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: String(err), totalCities: null })
    };
  }
};