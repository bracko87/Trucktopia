/**
 * Netlify function: get-game-time
 *
 * Provides a small HTTP endpoint that returns the authoritative game time
 * stored in the Supabase Postgres table `game_time` (row id = 1).
 *
 * Responsibilities:
 * - Read SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from environment
 * - Query Supabase REST (/rest/v1/game_time?id=eq.1) using fetch
 * - Return JSON: { current_time: string, nowUtcMs: number }
 *
 * Notes:
 * - This function intentionally uses a service role / server-side key and MUST
 *   only run in server-side environments (Netlify function). Do NOT expose the
 *   service role key to clients.
 * - If the table/row is missing the function returns 404 with a helpful message.
 */

/**
 * Handler
 * @param event Netlify event
 */
import type { Handler } from '@netlify/functions';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

const handler: Handler = async (event, context) => {
  // Basic environment validation
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables'
      })
    };
  }

  try {
    // Supabase REST: select current_time from game_time where id=1
    const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/game_time?id=eq.1`;
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Accept: 'application/json'
      }
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      return {
        statusCode: resp.status,
        body: JSON.stringify({
          error: 'Failed fetching game_time from Supabase',
          status: resp.status,
          body: text
        })
      };
    }

    const data = (await resp.json()) as any[];

    if (!Array.isArray(data) || data.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'game_time row not found (id=1)' })
      };
    }

    const row = data[0];
    const currentTime = row.current_time ?? row.current_time_at ?? row.now ?? null;

    if (!currentTime) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'game_time row exists but no current_time column found' })
      };
    }

    const nowUtcMs = new Date(currentTime).getTime();

    return {
      statusCode: 200,
      body: JSON.stringify({
        current_time: new Date(currentTime).toISOString(),
        nowUtcMs
      })
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Unexpected error while fetching game time',
        message: String(err?.message ?? err)
      })
    };
  }
};

export { handler };