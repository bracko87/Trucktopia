/**
 * netlify/functions/hire-staff.js
 *
 * Authoritative server-side logic for hiring staff.
 * 1. Checks company balance.
 * 2. Deducts hiring fee + first month salary.
 * 3. Creates staff record in public.staff.
 *
 * Note: This function uses the global fetch available in modern Node runtimes.
 */

/**
 * handler
 * @description Netlify function handler for hiring staff. Expects POST with { email, staffData }.
 *              Returns { success, newBalance, staff } on success or proper HTTP error codes/messages.
 */
exports.handler = async function (event) {
  // Use global fetch provided by Node 18+ / Netlify runtime
  const fetch = globalThis.fetch;

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const { email, staffData } = payload;
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY;

    if (!email || !staffData) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing email or staff details' }) };
    }

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Supabase configuration missing on server' }) };
    }

    const safeEmail = String(email).toLowerCase().trim();
    const headers = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    };

    // 1. Fetch current balance
    const companyUrl = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/companies?email=eq.${encodeURIComponent(safeEmail)}&select=balance,id`;
    const companyRes = await fetch(companyUrl, { headers });
    if (!companyRes.ok) {
      const text = await companyRes.text().catch(() => null);
      return { statusCode: companyRes.status || 502, body: JSON.stringify({ error: `Failed to fetch company: ${text}` }) };
    }
    const companyData = await companyRes.json();

    if (!companyData || companyData.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Company not found' }) };
    }

    const currentBalance = Number(companyData[0].balance || 0);
    const hireCost = Number(staffData.hireCost || 0);
    const salary = Number(staffData.salary || 0);
    const totalCost = hireCost + salary;

    if (currentBalance < totalCost) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Insufficient funds' }) };
    }

    // 2. Deduct funds from company
    const newBalance = currentBalance - totalCost;
    const patchRes = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/companies?id=eq.${companyData[0].id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ balance: newBalance })
    });
    if (!patchRes.ok) {
      const text = await patchRes.text().catch(() => null);
      return { statusCode: patchRes.status || 502, body: JSON.stringify({ error: `Failed to update balance: ${text}` }) };
    }

    // 3. Insert staff record
    const staffPayload = {
      company_email: safeEmail,
      name: staffData.name,
      role: staffData.role,
      salary: staffData.salary,
      experience: staffData.experience,
      nationality: staffData.nationality,
      status: 'available'
    };

    const staffResponse = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/staff`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify(staffPayload)
    });

    if (!staffResponse.ok) {
      const text = await staffResponse.text().catch(() => null);
      return { statusCode: staffResponse.status || 502, body: JSON.stringify({ error: `Failed to create staff: ${text}` }) };
    }

    const newStaff = await staffResponse.json();

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        newBalance,
        staff: Array.isArray(newStaff) ? newStaff[0] : newStaff
      })
    };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err && err.message ? err.message : err) }) };
  }
};