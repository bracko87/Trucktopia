/**
 * getGameTime.ts (server helper)
 *
 * Server-side helper to fetch authoritative game time from Supabase using
 * the REST interface. Designed to be used by Netlify/Edge/Serverless handlers
 * so backend logic always reads the same clock.
 *
 * Usage:
 * import { getGameTime } from '../utils/server/getGameTime';
 * const { currentTime, nowUtcMs } = await getGameTime();
 *
 * Environment variables required:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY    (server-only key)
 */

import fetch from 'node-fetch';

/**
 * GetGameTimeResult
 * @description Returned payload from getGameTime()
 */
export interface GetGameTimeResult {
  currentTime: string;
  nowUtcMs: number;
}

/**
 * getGameTime
 * @description Fetch the authoritative game time row from Supabase (id=1).
 *              Returns ISO timestamp and epoch ms.
 * @throws Error when env variables are missing or Supabase returns an error.
 */
export async function getGameTime(): Promise<GetGameTimeResult> {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  }

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
    throw new Error(`Supabase REST error fetching game_time: ${resp.status} ${text}`);
  }

  const data = (await resp.json()) as any[];

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('game_time row not found (id=1)');
  }

  const row = data[0];
  const current_time_raw = row.current_time ?? row.current_time_at ?? row.now ?? null;

  if (!current_time_raw) {
    throw new Error('game_time row found but no recognized time column (expected current_time)');
  }

  const iso = new Date(current_time_raw).toISOString();
  const nowUtcMs = new Date(current_time_raw).getTime();

  return { currentTime: iso, nowUtcMs };
}