// netlify/functions/supabase-stats.js
exports.handler = async (event) => {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Missing SUPABASE env' }) };
    }

    // Admin endpoint for all auth users
    const res = await fetch(`${SUPABASE_URL}/admin/v1/users?per_page=1`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY
      }
    });

    if (!res.ok) throw new Error(`Admin users fetch failed: ${res.statusText}`);

    // The total count is returned in the x-total-count header
    const totalUsersHeader = res.headers.get('x-total-count') || res.headers.get('content-range');
    let totalUsers = null;
    if (totalUsersHeader) {
      if (totalUsersHeader.includes('/')) {
        totalUsers = Number(totalUsersHeader.split('/')[1]);
      } else {
        totalUsers = Number(totalUsersHeader);
      }
    }

    return { statusCode: 200, body: JSON.stringify({ totalUsers }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
};
