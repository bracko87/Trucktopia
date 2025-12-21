/**
 * Netlify function: get-game-time
 * 
 * Synchronizes client time with Supabase game_time table.
 * Uses extrapolation: Projected Time = DB.current_time + (Now - DB.updated_at)
 */

import type { Handler } from '@netlify/functions';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

export const handler: Handler = async (event, context) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing Supabase credentials' })
    };
  }

  try {
    const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/game_time?id=eq.1&select=current_time,updated_at`;
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Accept: 'application/json'
      }
    });

    const data = await resp.json();
    if (!Array.isArray(data) || data.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'game_time row not found' }) };
    }

    const row = data[0];
    
    // Parse times from DB
    const dbGameTime = new Date(row.current_time).getTime();
    const dbRealTime = new Date(row.updated_at).getTime();
    const realNow = Date.now();

    // Calculate elapsed real-world time since the DB was last updated
    const elapsedMs = realNow - dbRealTime;
    
    // Projected Game Time
    const projectedTimeMs = dbGameTime + elapsedMs;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
      body: JSON.stringify({
        nowUtcMs: projectedTimeMs,
        debug: {
          db_game_time: new Date(dbGameTime).toISOString(),
          db_updated_at: new Date(dbRealTime).toISOString(),
          elapsed_since_update_ms: elapsedMs
        }
      })
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Unexpected error', message: err.message })
    };
  }
};