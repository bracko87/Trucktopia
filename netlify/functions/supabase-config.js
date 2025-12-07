/**
 * supabase-config.js
 *
 * Netlify serverless function that returns runtime Supabase configuration to the client.
 *
 * Responsibilities:
 * - Expose SUPABASE_URL and SUPABASE_ANON_KEY (from environment) to client code that needs them.
 * - Return 404 with a helpful message when vars are not set.
 *
 * Security note:
 * - The Supabase anon key is intended for public client use for typical auth operations.
 * - If you prefer not to expose keys, use the reset-password.js function (also provided) and
 *   call it from the client instead of fetching the config.
 */

exports.handler = async (event) => {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL || null;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON || null;

    const headers = {
      'Content-Type': 'application/json',
      // Allow any origin to call; adjust for stricter security if needed
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };

    // Handle OPTIONS preflight
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: true })
      };
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Supabase configuration is not present on the server. Please set SUPABASE_URL and SUPABASE_ANON_KEY in Netlify environment variables.'
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        SUPABASE_URL,
        SUPABASE_ANON_KEY
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: false, message: 'Internal error retrieving Supabase config' })
    };
  }
};