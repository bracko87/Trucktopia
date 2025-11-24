/**
 * netlify/functions/supabase-config.js
 *
 * Netlify Function returning Supabase client config (SUPABASE_URL and SUPABASE_ANON_KEY)
 *
 * Purpose:
 * - Provide runtime-accessible Supabase configuration to the browser without embedding
 *   secrets into the client bundle at build-time.
 * - The values are read from process.env on the server (Netlify build/runtime) and returned
 *   to the client. The anon key is considered public for client usage.
 *
 * Notes:
 * - Keep this function simple and CORS-friendly so the SPA can call it from any origin.
 * - The function expects environment variables SUPABASE_URL and SUPABASE_ANON_KEY to be
 *   set in Netlify environment variables.
 */

/**
 * handler
 * @description Netlify serverless function entrypoint. Returns JSON with SUPABASE_URL and SUPABASE_ANON_KEY.
 */
exports.handler = async function handler() {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL || '';
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || '';

    const body = JSON.stringify({
      SUPABASE_URL,
      SUPABASE_ANON_KEY
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        // Allow client calls from the site; keep permissive for SPA usage
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Failed to read Supabase config' })
    };
  }
};
