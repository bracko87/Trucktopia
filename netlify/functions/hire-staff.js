
/**
 * netlify/functions/hire-staff.js
 * 
 * Authoritative server-side logic for hiring staff.
 * 1. Checks company balance.
 * 2. Deducts hiring fee + first month salary.
 * 3. Creates staff record in public.staff.
 */

const fetch = globalThis.fetch || require('node-fetch');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { email, staffData } = JSON.parse(event.body);
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY;

    if (!email || !staffData) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing email or staff details' }) };
    }

    const safeEmail = email.toLowerCase().trim();
    const headers = {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };

    // 1. Fetch current balance
    const companyUrl = `${SUPABASE_URL}/rest/v1/companies?email=eq.${encodeURIComponent(safeEmail)}&select=balance,id`;
    const companyRes = await fetch(companyUrl, { headers });
    const companyData = await companyRes.json();

    if (!companyData || companyData.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Company not found' }) };
    }

    const currentBalance = companyData[0].balance;
    const totalCost = staffData.hireCost + staffData.salary;

    if (currentBalance < totalCost) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Insufficient funds' }) };
    }

    // 2. Deduct funds from company
    const newBalance = currentBalance - totalCost;
    await fetch(`${SUPABASE_URL}/rest/v1/companies?id=eq.${companyData[0].id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ balance: newBalance })
    });

    // 3. Insert staff record
    const staffResponse = await fetch(`${SUPABASE_URL}/rest/v1/staff`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify({
        company_email: safeEmail,
        name: staffData.name,
        role: staffData.role,
        salary: staffData.salary,
        experience: staffData.experience,
        nationality: staffData.nationality,
        status: 'available'
      })
    });

    const newStaff = await staffResponse.json();

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        newBalance,
        staff: newStaff[0]
      })
    };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
