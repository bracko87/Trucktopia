/**
 * supabase-config.js
 *
 * Netlify serverless function that returns runtime Supabase configuration to the client.
 *
 * Responsibilities:
 * - Expose SUPABASE_URL and SUPABASE_ANON_KEY (read from process.env) to client code that needs them.
 * - Return a helpful 404-like message (500) when vars are not present so client can fallback gracefully.
 *
 * Security note:
 * - The Supabase anon key is intended for public client use for typical auth operations.
 * - If you prefer not to expose keys, use the reset-password function which calls Supabase server-side.
 */

/* eslint-disable no-undef */
exports.handler = async (event) => {
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

  try {
    const SUPABASE_URL = process.env.SUPABASE_URL || null;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON || null;

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
      headers,
      body: JSON.stringify({ success: false, message: 'Internal error retrieving Supabase config' })
    };
  }
};
