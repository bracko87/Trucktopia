/**
 * netlify/functions/hire-staff.js
 *
 * Authoritative server-side Netlify function for hiring staff.
 *
 * Responsibilities:
 * - Validate request payload
 * - Compute total hire cost in cents (hire fee + first month salary)
 * - Apply canonical finance change by calling the Supabase RPC `finance_apply`
 *   (updates companies.capital_cents atomically)
 * - Insert the staff row in `public.staff`
 * - Return a canonical response containing newBalanceCents and the created staff
 *
 * Notes:
 * - This function expects environment variables: SUPABASE_URL and SUPABASE_KEY
 * - Finance operations are cents-first (integer). Inputs may provide cents or decimal values.
 */

const fetch = globalThis.fetch || require('node-fetch');

/**
 * parseMoneyToCents
 * @description Normalize money fields from incoming payload. Accepts either
 *              an explicit cents field (e.g. hireCostCents) or a decimal number (hireCost).
 * @param {any} obj payload object
 * @param {string} centsKey name of cents key
 * @param {string} floatKey name of float key
 * @returns {number} integer cents
 */
function parseMoneyToCents(obj, centsKey, floatKey) {
  try {
    if (obj && Number.isFinite(Number(obj[centsKey]))) {
      return Math.round(Number(obj[centsKey]));
    }
    const f = obj && Number(obj[floatKey]);
    if (Number.isFinite(f)) return Math.round(f * 100);
  } catch {
    // fallthrough
  }
  return 0;
}

/**
 * handler
 * @description Netlify function entry point
 */
exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const parsed = event.body ? JSON.parse(event.body) : {};
    const email = String(parsed.email || '').toLowerCase().trim();
    const staffData = parsed.staffData || null;

    if (!email || !staffData) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing email or staffData' }) };
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Supabase configuration missing on server' }) };
    }

    // Fetch company by email and prefer cents fields
    const companyRes = await fetch(
      `${SUPABASE_URL.replace(/\\/+$/, '')}/rest/v1/companies?email=eq.${encodeURIComponent(email)}&select=id,capital_cents,capital`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!companyRes.ok) {
      const txt = await companyRes.text().catch(() => '');
      return { statusCode: 502, body: JSON.stringify({ error: `Failed to fetch company: ${txt}` }) };
    }

    const companyJson = await companyRes.json().catch(() => null);
    if (!companyJson || !Array.isArray(companyJson) || companyJson.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Company not found' }) };
    }

    const companyRow = companyJson[0];
    const companyId = companyRow.id;
    // Determine current balance in cents: prefer capital_cents, fallback to capital * 100
    const currentBalanceCents = Number.isFinite(Number(companyRow.capital_cents))
      ? Math.round(Number(companyRow.capital_cents))
      : (Number.isFinite(Number(companyRow.capital)) ? Math.round(Number(companyRow.capital) * 100) : 0);

    // Compute costs (support either cents fields or decimal fields)
    const hireCostCents = parseMoneyToCents(staffData, 'hireCostCents', 'hireCost');
    const salaryCents = parseMoneyToCents(staffData, 'salaryCents', 'salary');
    const totalCostCents = Math.max(0, hireCostCents + salaryCents);

    if (currentBalanceCents < totalCostCents) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Insufficient funds', currentBalanceCents }) };
    }

    // Apply finance change via Supabase RPC finance_apply (cents-first)
    const rpcUrl = `${SUPABASE_URL.replace(/\\/+$/, '')}/rest/v1/rpc/finance_apply`;

    const rpcBody = {
      p_company_id: companyId,
      p_delta: -Math.round(totalCostCents),
      p_type: 'expense',
      p_description: `Hire: ${String(staffData.name || staffData.id || 'staff')}`,
      p_meta: { staffPayload: { name: staffData.name ?? null, role: staffData.role ?? null } },
      p_idempotency_key: staffData.idempotencyKey || null
    };

    const rpcResp = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'return=representation'
      },
      body: JSON.stringify(rpcBody)
    });

    const rpcText = await rpcResp.text().catch(() => null);
    let rpcJson = null;
    try { rpcJson = rpcText ? JSON.parse(rpcText) : null; } catch { rpcJson = rpcText; }

    if (!rpcResp.ok) {
      const errMsg = (rpcJson && (rpcJson.error || rpcJson.message)) || `RPC failed (${rpcResp.status})`;
      return { statusCode: rpcResp.status, body: JSON.stringify({ error: String(errMsg) }) };
    }

    // Normalize returned row (rpc typically returns array)
    const rpcRow = Array.isArray(rpcJson) ? rpcJson[0] ?? null : rpcJson;
    const newBalanceCents = rpcRow && (typeof rpcRow.balance_after === 'number' ? Math.round(rpcRow.balance_after) : (typeof rpcRow.balance_after === 'string' && !isNaN(Number(rpcRow.balance_after)) ? Math.round(Number(rpcRow.balance_after)) : null));

    // Create staff record in `staff` table (return representation)
    const staffInsertRes = await fetch(`${SUPABASE_URL.replace(/\\/+$/, '')}/rest/v1/staff`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify({
        company_email: email,
        name: staffData.name,
        role: staffData.role,
        salary: typeof staffData.salary === 'number' ? staffData.salary : (staffData.salaryCents ? Math.round(staffData.salaryCents / 100) : 0),
        experience: staffData.experience ?? 0,
        nationality: staffData.nationality ?? null,
        status: 'available'
      })
    });

    if (!staffInsertRes.ok) {
      const txt = await staffInsertRes.text().catch(() => '');
      // NOTE: At this point finance change has already been applied. We return error but include newBalanceCents for reconciliation.
      return { statusCode: 502, body: JSON.stringify({ error: `Failed to insert staff: ${txt}`, newBalanceCents }) };
    }

    const inserted = await staffInsertRes.json().catch(() => null);
    const createdStaff = Array.isArray(inserted) ? inserted[0] ?? null : inserted;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        newBalanceCents: newBalanceCents ?? null,
        staff: createdStaff
      })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err && err.message ? err.message : err) }) };
  }
};