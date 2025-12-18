import { createClient } from '@supabase/supabase-js';

export async function handler() {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Missing SUPABASE env vars' }),
      };
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // 1️⃣ Count total users
    const { count: totalUsers, error: usersError } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true });

    if (usersError) throw usersError;

    // 2️⃣ Count total active trucks
    const { count: totalTrucks, error: trucksError } = await supabase
      .from('trucks')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true); // only active trucks

    if (trucksError) throw trucksError;

    return {
      statusCode: 200,
      body: JSON.stringify({ totalUsers, totalTrucks }),
    };
  } catch (err) {
    console.error('Stats function error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: String(err), totalUsers: null, totalTrucks: null }),
    };
  }
}
