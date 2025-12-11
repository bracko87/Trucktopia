/**
 * netlify/functions/create-user.js
 *
 * Serverless function to ensure a newly-signed-up auth user also has application rows.
 *
 * Responsibilities:
 * - Accept POST { email, userId?, username? } from client after signup.
 * - Use SUPABASE_SERVICE_ROLE_KEY to insert into application tables (users, companies).
 * - Return a JSON result summarizing inserted/updated rows.
 *
 * Environment variables required (set in Netlify):
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 *
 * Note: This function is best-effort and defensive: if your DB schema differs, it will attempt
 * simple inserts and return helpful error messages instead of throwing unhandled errors.
 */

/** @type {import('@netlify/functions').Handler} */
const handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ success: false, message: 'Method not allowed' }) };
    }

    const body = event.body ? JSON.parse(event.body) : {};
    const email = (body.email || '').toString().toLowerCase().trim();
    const userId = body.userId || null;
    const username = body.username || (email ? email.split('@')[0] : 'user');

    if (!email) {
      return { statusCode: 400, body: JSON.stringify({ success: false, message: 'Missing email' }) };
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ success: false, message: 'Server misconfigured: SUPABASE env vars missing' })
      };
    }

    // Helper to call Supabase REST endpoint (PostgREST)
    const restUrl = SUPABASE_URL.replace(/\/$/, '') + '/rest/v1';

    // Common headers for service-role calls
    const headers = {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    };

    const results = { users: null, companies: null, warnings: [] };

    // Insert into users table if it exists
    try {
      const userPayload = { email, username };
      if (userId) userPayload.id = userId;
      const r = await fetch(`${restUrl}/users`, {
        method: 'POST',
        headers,
        body: JSON.stringify(userPayload)
      });
      const text = await r.text();
      try {
        results.users = JSON.parse(text);
      } catch {
        results.users = text;
      }
      // if status not 201, include a warning but continue
      if (!r.ok && r.status !== 201 && r.status !== 200) {
        results.warnings.push({ table: 'users', status: r.status, body: results.users });
      }
    } catch (e) {
      results.warnings.push({ table: 'users', error: String(e) });
    }

    // Insert a minimal default company row for the user (if companies table exists)
    try {
      const companyPayload = {
        owner_email: email,
        name: `${username}'s Company`,
        capital: 10000,
        reputation: 0,
        created_at: new Date().toISOString()
      };
      const r2 = await fetch(`${restUrl}/companies`, {
        method: 'POST',
        headers,
        body: JSON.stringify(companyPayload)
      });
      const text2 = await r2.text();
      try {
        results.companies = JSON.parse(text2);
      } catch {
        results.companies = text2;
      }
      if (!r2.ok && r2.status !== 201 && r2.status !== 200) {
        results.warnings.push({ table: 'companies', status: r2.status, body: results.companies });
      }
    } catch (e) {
      results.warnings.push({ table: 'companies', error: String(e) });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, detail: results })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: String(err) })
    };
  }
};

module.exports = { handler };