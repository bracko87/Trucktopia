/**
 * netlify/functions/supabase-config.js
 *
 * Serverless function to expose public Supabase runtime config to the client.
 *
 * Responsibilities:
 * - Return SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_ANON) for client use.
 * - Never expose SUPABASE_SERVICE_ROLE (service role must remain secret).
 * - Handle CORS and OPTIONS preflight.
 *
 * Security:
 * - Ensure service role is NOT returned.
 *
 * Expected env vars on Netlify:
 * - SUPABASE_URL
 * - SUPABASE_ANON_KEY (or SUPABASE_ANON)
 *
 * Request:
 * - Method: GET
 *
 * Response (200):
 * { SUPABASE_URL: "...", SUPABASE_ANON_KEY: "..." }
 */

exports.handler = async function (event) {
  /**
   * buildResponse
   * @description Helper to build HTTP response with CORS headers.
   * @param {number} status
   * @param {object|string} body
   */
  const buildResponse = (status, body) => {
    return {
      statusCode: status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: typeof body === 'string' ? body : JSON.stringify(body)
    };
  };

  try {
    // Support preflight
    if (event.httpMethod === 'OPTIONS') {
      return buildResponse(200, { ok: true });
    }

    if (event.httpMethod !== 'GET') {
      return buildResponse(405, { success: false, message: 'Method Not Allowed' });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL || null;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON || null;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return buildResponse(500, { success: false, message: 'Supabase configuration missing on server' });
    }

    // Only expose public (anon) keys. Never return service role.
    return buildResponse(200, {
      success: true,
      SUPABASE_URL,
      SUPABASE_ANON_KEY
    });
  } catch (err) {
    return buildResponse(500, { success: false, message: 'Unexpected server error' });
  }
};