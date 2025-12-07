/**
 * reset-password.js
 *
 * Netlify serverless function that performs a Supabase password recovery (server-side).
 *
 * Responsibilities:
 * - Accept POST { email } from client.
 * - Use SUPABASE_URL and SUPABASE_ANON_KEY from environment to call Supabase /auth/v1/recover.
 * - Return a normalized { success, message } JSON response.
 *
 * Advantages:
 * - Avoids client-side reliance on supabase-config + direct calls to Supabase.
 * - Avoids client-side CORS issues and centralizes error handling.
 */

const fetch = require('node-fetch'); // Node fetch available in Netlify runtime. If unavailable, native fetch may be used.

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

    const recoverUrl = SUPABASE_URL.replace(/\/$/, '') + '/auth/v1/recover';
    const res = await fetch(recoverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ email })
    });

    let payload;
    try {
      payload = await res.json();
    } catch (e) {
      payload = await res.text().catch(() => null);
    }

    if (res.ok) {
      return {
        statusCode: 200,
        headers: headersBase,
        body: JSON.stringify({ success: true, message: 'If the email exists, a password reset link has been sent.' })
      };
    }

    // Normalize error message
    const errMessage = payload && payload.error ? payload.error : (typeof payload === 'string' ? payload : `Supabase recover failed with status ${res.status}`);
    return {
      statusCode: 400,
      headers: headersBase,
      body: JSON.stringify({ success: false, message: `Password reset failed: ${errMessage}` })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: headersBase,
      body: JSON.stringify({ success: false, message: 'Server error while requesting password reset' })
    };
  }
};