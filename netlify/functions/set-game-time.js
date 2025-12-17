/**
 * set-game-time.js
 *
 * Netlify function to update the authoritative game_time (row id = 1) in Supabase.
 *
 * Responsibilities:
 * - Accept a POST with JSON body { current_time: string | number } or { now: true }
 * - Authenticate requests using a server-side admin key (GAME_TIME_ADMIN_KEY)
 * - PATCH the existing row id=1; if missing, INSERT a new seeded row with id=1
 * - Return the updated ISO current_time and epoch ms
 *
 * Security:
 * - Requires header `x-admin-key` matching process.env.GAME_TIME_ADMIN_KEY
 *
 * Notes:
 * - This function uses the Supabase REST API and therefore requires a service role key
 *   (SUPABASE_SERVICE_ROLE_KEY) available only on the server.
 */

/**
 * Handler
 * @param event Netlify event
 */
const fetch = globalThis.fetch || require('node-fetch');

exports.handler = async function (event, context) {
  try {
    // Only allow POST (OPTIONS for CORS preflight)
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, x-admin-key',
        },
        body: '',
      };
    }

    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Method not allowed; use POST' }),
      };
    }

    // Environment validation
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    const ADMIN_KEY = process.env.GAME_TIME_ADMIN_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !ADMIN_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Server misconfiguration: missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or GAME_TIME_ADMIN_KEY' }),
      };
    }

    // Simple admin auth
    const provided = (event.headers && (event.headers['x-admin-key'] || event.headers['X-Admin-Key'])) || '';
    if (!provided || provided !== ADMIN_KEY) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized: invalid admin key' }),
      };
    }

    // Parse body
    let body;
    try {
      body = event.body ? JSON.parse(event.body) : {};
    } catch (err) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid JSON body' }),
      };
    }

    // Determine desired time
    let currentTimeIso;
    if (body.now === true) {
      currentTimeIso = new Date().toISOString();
    } else if (body.current_time) {
      const asNum = Number(body.current_time);
      if (!Number.isNaN(asNum) && Number.isFinite(asNum)) {
        currentTimeIso = new Date(asNum).toISOString();
      } else {
        // try parse as string date
        const parsed = Date.parse(String(body.current_time));
        if (Number.isNaN(parsed)) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'current_time not parseable as date' }),
          };
        }
        currentTimeIso = new Date(parsed).toISOString();
      }
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing body parameter: current_time or now:true' }),
      };
    }

    const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/game_time?id=eq.1`;

    // Try PATCH first (update existing)
    const patchResp = await fetch(url, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ current_time: currentTimeIso }),
    });

    if (patchResp.ok) {
      const data = await patchResp.json().catch(() => null);
      const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
      const nowUtcMs = new Date(currentTimeIso).getTime();
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_time: currentTimeIso,
          nowUtcMs,
          row: row ?? null,
        }),
      };
    }

    // If PATCH failed due to missing row, attempt to INSERT a seeded row with id=1
    // Some Supabase setups may reject PATCH on non-existing rows with 404/204; attempt create
    const insertUrl = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/game_time`;
    const insertResp = await fetch(insertUrl, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ id: 1, current_time: currentTimeIso }),
    });

    if (insertResp.ok) {
      const data = await insertResp.json().catch(() => null);
      const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
      const nowUtcMs = new Date(currentTimeIso).getTime();
      return {
        statusCode: 201,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_time: currentTimeIso,
          nowUtcMs,
          row: row ?? null,
        }),
      };
    }

    // If we get here both attempts failed: surface Supabase error
    const text = await patchResp.text().catch(() => '') || await insertResp.text().catch(() => '');
    return {
      statusCode: Math.max(patchResp.status || 500, insertResp.status || 500),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to update game_time', details: text }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Unexpected error', message: String(err?.message ?? err) }),
    };
  }
};