/**
 * reset-password.js
 *
 * Netlify serverless function that performs a Supabase password recovery (server-side).
 *
 * Responsibilities:
 * - Accept POST { email } from client.
 * - Use SUPABASE_URL and SUPABASE_ANON_KEY from environment to call Supabase /auth/v1/recover.
 * - Optionally include redirect_to if RESET_REDIRECT_URL (or SUPABASE_SITE_URL) is set to guarantee
 *   the link in the email points to the right host (prevents localhost links).
 * - Return a normalized { success, message } JSON response.
 *
 * Usage:
 * - Set environment variables in Netlify:
 *    SUPABASE_URL, SUPABASE_ANON_KEY
 *    Optionally: RESET_REDIRECT_URL (e.g. https://your-site.netlify.app) or SUPABASE_SITE_URL
 *
 * Note:
 * - If your Supabase project's "Site URL" is set to http://localhost, emails will include localhost.
 *   Fix that in the Supabase Dashboard (Authentication → Settings → Site URL) or set RESET_REDIRECT_URL.
 */

/* eslint-disable no-undef */
const fetch = globalThis.fetch || require('node-fetch');

/**
 * handler
 * @description Netlify function entrypoint. Handles POST for password recovery.
 */
exports.handler = async (event) => {
  const headersBase = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  // Preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: headersBase,
      body: JSON.stringify({ ok: true })
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: headersBase,
      body: JSON.stringify({ success: false, message: 'Method not allowed. Use POST.' })
    };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const email = (body.email || '').toString().trim().toLowerCase();
    if (!email) {
      return {
        statusCode: 400,
        headers: headersBase,
        body: JSON.stringify({ success: false, message: 'Please provide an email address in the request body.' })
      };
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON;
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return {
        statusCode: 500,
        headers: headersBase,
        body: JSON.stringify({ success: false, message: 'Supabase configuration is not present on the server. Please configure SUPABASE_URL and SUPABASE_ANON_KEY.' })
      };
    }

    // Determine redirect target for the reset email (avoid localhost links)
    // Priority: RESET_REDIRECT_URL env var -> SUPABASE_SITE_URL env var -> no redirect param
    const redirectTo = (process.env.RESET_REDIRECT_URL && process.env.RESET_REDIRECT_URL.trim()) ||
                       (process.env.SUPABASE_SITE_URL && process.env.SUPABASE_SITE_URL.trim()) ||
                       null;

    // Construct recover payload; include redirect_to only when present
    const recoverPayload = redirectTo ? { email, redirect_to: redirectTo } : { email };

    const recoverUrl = SUPABASE_URL.replace(/\/$/, '') + '/auth/v1/recover';
    const res = await fetch(recoverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify(recoverPayload)
    });

    let payload;
    try {
      payload = await res.json();
    } catch (e) {
      payload = await res.text().catch(() => null);
    }

    if (res.ok) {
      // Return a friendly message regardless of whether email exists (avoid leaking)
      return {
        statusCode: 200,
        headers: headersBase,
        body: JSON.stringify({ success: true, message: 'If the email exists, a password reset link has been sent.' })
      };
    }

    // Normalize error message
    const errMessage = payload && payload.error ? payload.error : (typeof payload === 'string' ? payload : `Supabase recover failed with status ${res.status}`);
    return {
      statusCode: res.status || 400,
      headers: headersBase,
      body: JSON.stringify({ success: false, message: `Password reset failed: ${String(errMessage)}` })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: headersBase,
      body: JSON.stringify({ success: false, message: 'Server error while requesting password reset' })
    };
  }
};