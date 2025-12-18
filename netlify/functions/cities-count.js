module.exports.handler = async function () {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Missing SUPABASE env vars', totalCities: null })
      };
    }

    const restBase = SUPABASE_URL.replace(/\/$/, '') + '/rest/v1';
    const url = `${restBase}/cities?select=id`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
        Accept: 'application/json'
      }
    });

    if (!res.ok) {
      throw new Error(`Supabase returned status ${res.status}`);
    }

    const totalHeader = res.headers.get('content-range') || res.headers.get('x-total-count');
    if (totalHeader) {
      const total = totalHeader.includes('/') ? Number(totalHeader.split('/')[1]) : Number(totalHeader);
      if (!Number.isNaN(total)) {
        return { statusCode: 200, body: JSON.stringify({ totalCities: total }) };
      }
    }

    const data = await res.json();
    if (Array.isArray(data)) {
      return { statusCode: 200, body: JSON.stringify({ totalCities: data.length }) };
    }

    return { statusCode: 200, body: JSON.stringify({ totalCities: null }) };
  } catch (err) {
    console.error('cities-count error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: String(err), totalCities: null }) };
  }
};
