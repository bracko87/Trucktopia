const fetch = require('node-fetch');

exports.handler = async function (event, context) {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Missing SUPABASE_URL or SERVICE_ROLE_KEY' }),
      };
    }

    const table = 'tm_users';
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=id`, {
      method: 'GET',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Range: '0-0', // small slice to get total from Content-Range
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch table: ${res.status} ${res.statusText}`);
    }

    const contentRange = res.headers.get('content-range') || res.headers.get('Content-Range');
    let total = null;
    if (contentRange) {
      total = Number(contentRange.split('/')[1]);
    } else {
      const body = await res.json();
      total = Array.isArray(body) ? body.length : 0;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ totalUsers: total }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
