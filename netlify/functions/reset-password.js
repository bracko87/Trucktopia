/**
 * reset-password.js
 *
 * Serverless Netlify function that requests Supabase to send a password recovery email.
 *
 * Responsibilities:
 * - Accept POST { email } from client
 * - Build a redirect_to from env (RESET_REDIRECT_URL || SUPABASE_SITE_URL || SUPABASE_URL)
 * - Call Supabase /auth/v1/recover with { email, redirect_to }
 * - Return JSON including diagnostics: success, message, usedRedirect, and optionally debug info
 *
 * Security notes:
 * - This function uses the public SUPABASE_ANON_KEY only (no service_role).
 * - Do NOT enable debug output in production for long (it will echo Supabase response).
 */

const fetch = require('node-fetch');

exports.handler = async function (event, context) {
  /**
   * Handler
   * Accepts POST with JSON body { email } and attempts to call Supabase recover endpoint.
   * Reads env:
   *   - SUPABASE_URL
   *   - SUPABASE_ANON_KEY
   *   - RESET_REDIRECT_URL (preferred)
   *   - SUPABASE_SITE_URL (fallback)
   *   - DEBUG_RESET_LINK = '1' will include Supabase response in function output (temporary debug)
   */
  try {
    // Allow only POST
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, message: 'Method Not Allowed. Use POST.' })
      };
    }

    // Parse incoming JSON
    let body;
    try {
      body = event.body ? JSON.parse(event.body) : {};
    } catch (err) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, message: 'Invalid JSON body' })
      };
    }

    const email = (body.email || '').toString().trim().toLowerCase();
    if (!email) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, message: 'Email is required' })
      };
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
    const RESET_REDIRECT_URL = process.env.RESET_REDIRECT_URL || process.env.SUPABASE_SITE_URL || process.env.SUPABASE_URL || null;
    const DEBUG = String(process.env.DEBUG_RESET_LINK || '').trim() === '1';

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          success: false,
          message: 'Supabase configuration not found on server. Set SUPABASE_URL and SUPABASE_ANON_KEY in Netlify env.'
        })
      };
    }

    // Normalize redirect
    let redirect_to = null;
    if (RESET_REDIRECT_URL) {
      // If user set RESET_REDIRECT_URL that points to root (example: https://your-site.netlify.app),
      // ensure we target the reset-password route explicitly for reliability.
      try {
        const urlObj = new URL(RESET_REDIRECT_URL);
        // if path is root, append /reset-password for recommended flow
        if (urlObj.pathname === '/' || urlObj.pathname === '') {
          urlObj.pathname = '/reset-password';
        }
        redirect_to = urlObj.toString();
      } catch (err) {
        // fallback: use raw RESET_REDIRECT_URL string
        redirect_to = RESET_REDIRECT_URL;
      }
    }

    // Build request payload for Supabase
    const payload = redirect_to ? { email, redirect_to } : { email };

    // Call Supabase recover endpoint
    const endpoint = SUPABASE_URL.replace(/\/+$/, '') + '/auth/v1/recover';

    let supRes;
    try {
      supRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.error('Network error calling Supabase recover:', err);
      return {
        statusCode: 502,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, message: 'Network error when contacting Supabase', error: String(err) })
      };
    }

    // Try to parse response body
    let supBody = null;
    try {
      supBody = await supRes.json();
    } catch (err) {
      try {
        supBody = await supRes.text();
      } catch {
        supBody = null;
      }
    }

    // Build diagnostic response for client
    const baseResponse = {
      success: supRes.ok,
      message: supRes.ok
        ? 'If the email exists, a password reset link will be sent.'
        : (supBody && supBody.error ? supBody.error : `Supabase returned status ${supRes.status}`),
      usedRedirect: redirect_to || null,
      supabaseStatus: supRes.status
    };

    // Include debug info only when DEBUG=1 (temporary); remove when finished debugging
    if (DEBUG) {
      baseResponse.debug = {
        payloadSent: payload,
        supabaseBody: supBody
      };
    }

    return {
      statusCode: supRes.ok ? 200 : 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: JSON.stringify(baseResponse)
    };
  } catch (err) {
    console.error('Unexpected error in reset-password function:', err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, message: 'Internal server error', error: String(err) })
    };
  }
};