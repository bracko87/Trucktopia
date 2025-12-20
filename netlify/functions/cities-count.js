/**
 * netlify/functions/cities-count.js
 *
 * File-level:
 * Fetches the total number of rows from the public.cities table using 
 * high-performance PostgREST count headers.
 */

const fetch = require('node-fetch');

/**
 * handler
 * @description Netlify lambda handler that returns { totalCities: number }
 */
module.exports.handler = async function () {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Missing environment variables', totalCities: 0 })
      };
    }

    const restBase = SUPABASE_URL.replace(/\/$/, '') + '/rest/v1';

    // Query 'cities' table with count=exact preference
    // We use Range: 0-0 to only get the headers and avoid downloading row data
    const response = await fetch(`${restBase}/cities?select=id`, {
      method: 'GET',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Prefer': 'count=exact',
        'Range': '0-0'
      }
    });

    const contentRange = response.headers.get('content-range');
    let total = 0;
    
    if (contentRange) {
      // PostgREST content-range looks like: "0-0/452" -> 452 is the total
      const parts = contentRange.split('/');
      if (parts.length > 1) {
        total = parseInt(parts[1], 10) || 0;
      }
    } else {
      // Fallback: if header is missing, attempt a simple count select
      const data = await response.json().catch(() => []);
      total = Array.isArray(data) ? data.length : 0;
    }

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60'
      },
      body: JSON.stringify({ totalCities: total })
    };
  } catch (err) {
    console.error('Cities count error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: String(err), totalCities: 0 })
    };
  }
};