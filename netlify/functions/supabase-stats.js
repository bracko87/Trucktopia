// netlify/functions/supabase-stats.js
export const handler = async () => {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Missing SUPABASE env' }) };
    }

    // Call Supabase Admin API for users
    const res = await fetch(`${SUPABASE_URL}/admin/v1/users?per_page=1`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
      },
    });

    if (!res.ok) throw new Error(`Admin API error: ${res.status}`);

    const cr = res.headers.get('x-total-count') || res.headers.get('content-range');
    let total = null;

    if (cr) {
      total = cr.includes('/') ? Number(cr.split('/')[1]) : Number(cr);
    }

    return { statusCode: 200, body: JSON.stringify({ totalUsers: total }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
};
