/**
 * netlify/functions/supabase-stats.js
 *
 * File-level:
 * High-performance row counter for public.users and public.trucks.
 * Uses PostgREST count headers to avoid fetching actual data.
 */

/**
 * handler
 * @description Fetches exact row counts for users and trucks.
 */
module.exports.handler = async function () {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Missing environment variables' })
      };
    }

    const restBase = SUPABASE_URL.replace(/\/$/, '') + '/rest/v1';

    /**
     * fetchCount
     * @description Helper to get exact count from a table using PostgREST headers.
     */
    const fetchCount = async (table) => {
      try {
        const response = await fetch(`${restBase}/${table}?select=id`, {
          method: 'GET',
          headers: {
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'Prefer': 'count=exact',
            'Range': '0-0' // Fetch 0 rows, we only want the count header
          }
        });

        const contentRange = response.headers.get('content-range');
        if (contentRange) {
          // Format: "0-0/123" -> we want "123"
          const total = contentRange.split('/')[1];
          return parseInt(total, 10) || 0;
        }

        // Fallback to array length if header is missing
        const data = await response.json();
        return Array.isArray(data) ? data.length : 0;
      } catch (e) {
        console.error(`Error counting ${table}:`, e);
        return 0;
      }
    };

    const [totalUsers, totalTrucks] = await Promise.all([
      fetchCount('users'),
      fetchCount('trucks')
    ]);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ totalUsers, totalTrucks })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: String(err) })
    };
  }
};