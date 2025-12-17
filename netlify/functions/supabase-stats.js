// netlify/functions/supabase-stats.js
const https = require('https');

module.exports.handler = async function () {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Missing SUPABASE env' }) };
    }

    const url = new URL('/admin/v1/users?per_page=1', SUPABASE_URL);

    const options = {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
      },
    };

    const totalUsers = await new Promise((resolve, reject) => {
      const req = https.request(url, options, (res) => {
        const cr = res.headers['x-total-count'] || res.headers['content-range'];
        if (cr) {
          const total = cr.includes('/') ? Number(cr.split('/')[1]) : Number(cr);
          resolve(total);
        } else {
          resolve(null);
        }
        res.on('data', () => {}); // consume data
        res.on('end', () => {});
      });

      req.on('error', reject);
      req.end();
    });

    return { statusCode: 200, body: JSON.stringify({ totalUsers }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
};
