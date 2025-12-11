/**
 * create-user.js
 *
 * Netlify serverless function to ensure application rows exist for a newly-signed-up auth user.
 *
 * Responsibilities:
 * - Accept POST { email, userId?, name? } from client after signup.
 * - Insert a row into the application "users" table linking the auth user id via auth_user_id.
 * - Insert a starter "companies" row using the inserted user's id as owner_id.
 * - Be defensive: if the users insert conflicts, attempt to find the existing user row by auth_user_id or email.
 * - Use the Supabase service role key (server-side) to avoid RLS/permission issues.
 *
 * Notes:
 * - This function is best-effort and idempotent: re-running for the same email/auth id will attempt to reuse existing rows.
 * - Requires the environment variables SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to be set in Netlify.
 */

/**
 * @typedef {Object} Event
 * @property {string} httpMethod
 * @property {string} body
 */

/**
 * @typedef {Object} HandlerResponse
 * @property {number} statusCode
 * @property {string} body
 */

/**
 * Helper to normalize JSON responses.
 * @param {Response} resp
 * @returns {Promise<any>}
 */
async function parseResponse(resp) {
  const text = await resp.text().catch(() => null);
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

/**
 * Handler
 * @description Netlify function handler that inserts app-level user and company rows.
 * @param {Event} event
 * @returns {Promise<HandlerResponse>}
 */
const handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ success: false, message: 'Method not allowed' }) };
    }

    const body = event.body ? JSON.parse(event.body) : {};
    const emailRaw = (body.email || '').toString().trim();
    const authUserId = body.userId || null; // this is the Supabase Auth user id (uuid)
    const providedName = body.name || null;

    if (!emailRaw) {
      return { statusCode: 400, body: JSON.stringify({ success: false, message: 'Missing email' }) };
    }

    const email = emailRaw.toLowerCase();

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ success: false, message: 'Server misconfigured: SUPABASE env vars missing' })
      };
    }

    const restUrl = SUPABASE_URL.replace(/\/$/, '') + '/rest/v1';
    const headers = {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    };

    const results = { users: null, companies: null, warnings: [] };

    // Prepare user payload aligned with your schema:
    // users: { email, name, auth_user_id, data, created_at, email_normalized }
    const userPayload = {
      email,
      name: providedName || email.split('@')[0],
      auth_user_id: authUserId,
      data: {},
      created_at: new Date().toISOString(),
      email_normalized: email
    };

    // Try to insert the user. If conflict (duplicate), attempt to find existing row.
    let userId = null;
    try {
      const uRes = await fetch(`${restUrl}/users`, {
        method: 'POST',
        headers,
        body: JSON.stringify(userPayload)
      });

      const uBody = await parseResponse(uRes);
      results.users = uBody;

      if (uRes.ok) {
        // PostgREST returns an array of inserted rows when Prefer=return=representation
        if (Array.isArray(uBody) && uBody.length > 0 && uBody[0].id) {
          userId = uBody[0].id;
        } else if (uBody && uBody.id) {
          userId = uBody.id;
        }
      } else {
        // Insert failed: attempt to find existing user by auth_user_id or email
        results.warnings.push({ table: 'users', status: uRes.status, body: uBody });
        // Try by auth_user_id first (if provided)
        if (authUserId) {
          const findByAuth = await fetch(`${restUrl}/users?auth_user_id=eq.${encodeURIComponent(authUserId)}&select=id`, {
            method: 'GET',
            headers
          });
          const findAuthBody = await parseResponse(findByAuth);
          if (Array.isArray(findAuthBody) && findAuthBody.length > 0 && findAuthBody[0].id) {
            userId = findAuthBody[0].id;
          }
        }
        // If not found and email is available, try by email
        if (!userId) {
          const findByEmail = await fetch(`${restUrl}/users?email=eq.${encodeURIComponent(email)}&select=id`, {
            method: 'GET',
            headers
          });
          const findEmailBody = await parseResponse(findByEmail);
          if (Array.isArray(findEmailBody) && findEmailBody.length > 0 && findEmailBody[0].id) {
            userId = findEmailBody[0].id;
          }
        }
      }
    } catch (e) {
      results.warnings.push({ table: 'users', error: String(e) });
    }

    // If we still don't have a userId, return success=false but include diagnostics
    if (!userId) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: false,
          message: 'Could not create or locate users row. Check function logs and Supabase permissions.',
          detail: results
        })
      };
    }

    // Prepare company payload aligned with your schema:
    // companies: { name, owner_id, data, created_at, capital, hub_name, hub_country, hub_region, email, world_id }
    const companyPayload = {
      name: `${email.split('@')[0]}'s Company`,
      owner_id: userId,
      data: {},
      created_at: new Date().toISOString(),
      capital: 10000, // starter capital (adjust as desired)
      hub_name: null,
      hub_country: null,
      hub_region: null,
      email,
      world_id: body.world_id || null
    };

    try {
      const cRes = await fetch(`${restUrl}/companies`, {
        method: 'POST',
        headers,
        body: JSON.stringify(companyPayload)
      });
      const cBody = await parseResponse(cRes);
      results.companies = cBody;
      if (!cRes.ok) {
        results.warnings.push({ table: 'companies', status: cRes.status, body: cBody });
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