// netlify/functions/supabase-stats.js
import { createClient } from '@supabase/supabase-js';

export const handler = async () => {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Missing Supabase env vars' }),
      };
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // ✅ Fetch all rows (IDs only)
    const { data, error } = await supabase
      .from('users')
      .select('id');

    if (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        totalUsers: Array.isArray(data) ? data.length : 0,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: String(err) }),
    };
  }
};
