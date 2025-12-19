
const { createClient } = require('@supabase/supabase-js');

/**
 * update-company
 * 
 * Aggressive update function to overwrite signup defaults.
 */
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const { email, company_name, hub_name, hub_country, capital, balance } = JSON.parse(event.body);
    const cleanEmail = String(email || '').toLowerCase().trim();

    if (!cleanEmail) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Email is required' }) };
    }

    console.log(`[update-company] Updating ${cleanEmail} to Name: ${company_name}, Hub: ${hub_name}`);

    // 1. Update the 'companies' table directly by email
    // This overwrites the dummy name and 'Pending' statuses
    const { data: updatedCompanies, error: updateError } = await supabase
      .from('companies')
      .update({
        name: company_name,
        hub_name: hub_name,
        hub_country: hub_country,
        capital: capital,
        balance: balance || capital,
        updated_at: new Date().toISOString()
      })
      .eq('email', cleanEmail)
      .select();

    if (updateError) throw updateError;
    if (!updatedCompanies || updatedCompanies.length === 0) {
      console.error(`[update-company] No company found with email: ${cleanEmail}`);
      return { statusCode: 404, body: JSON.stringify({ error: 'Company record not found' }) };
    }

    const companyId = updatedCompanies[0].id;

    // 2. Create/Update Hub record
    const { error: hubError } = await supabase
      .from('hubs')
      .upsert({
        company_id: companyId,
        name: hub_name,
        city: hub_name,
        country: hub_country,
        level: 1,
        is_main: true
      });

    if (hubError) {
      console.warn('[update-company] Hub creation error:', hubError.message);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        message: 'Database sync complete',
        id: companyId
      }),
    };
  } catch (error) {
    console.error('[update-company] Fatal Error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
