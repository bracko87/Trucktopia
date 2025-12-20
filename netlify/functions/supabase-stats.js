/**
 * netlify/functions/supabase-stats.js
 *
 * File-level:
 * Netlify serverless function that returns a compact JSON payload:
 *   { totalUsers: number | null }
 *
 * Responsibilities:
 * - Call the Supabase Admin users endpoint (/admin/v1/users?per_page=1000).
 * - Prefer header-based totals (x-total-count or Content-Range).
 * - Fallback to counting the response body array when headers are not present.
 * - Use only server-side env: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 *
 * Security:
 * - This function must run server-side only. Do NOT expose SERVICE_ROLE key to clients.
 */

const https = require('https');

/**
 * handler
 *
 * @description Netlify lambda entrypoint. Returns { totalUsers } or error.
 * @returns {Promise<{ statusCode: number, body: string }>}
 */
module.exports.handler = async function () {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable', totalUsers: null })
      };
    }

    // Request admin users list with a reasonably large page size for small projects.
    const url = new URL('/admin/v1/users?per_page=1000', SUPABASE_URL);

    const options = {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY
      }
    };

    const totalUsers = await new Promise((resolve, reject) => {
      const req = https.request(url, options, (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            // Prefer header-based totals for efficiency
            const cr = res.headers['x-total-count'] || res.headers['content-range'];
            if (cr) {
              const raw = Array.isArray(cr) ? cr[0] : cr;
              // content-range may be "0-0/123"
              const parsed = raw.includes('/') ? Number(raw.split('/')[1]) : Number(raw);
              if (!Number.isNaN(parsed)) return resolve(parsed);
            }

            // Fallback: parse body length (when headers not present)
            if (data) {
              try {
                const parsedBody = JSON.parse(data);
                if (Array.isArray(parsedBody)) return resolve(parsedBody.length);
                // Some Supabase versions/overrides may return an object with total
                if (parsedBody && typeof parsedBody.total === 'number') return resolve(parsedBody.total);
              } catch {
                // ignore parse errors, continue to resolve null
              }
            }

            // Unknown total
            return resolve(null);
          } catch (err) {
            return resolve(null);
          }
        });
      });

      req.on('error', (err) => reject(err));
      req.end();
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ totalUsers: totalUsers === null ? null : totalUsers })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: String(err), totalUsers: null })
    };
  }
};