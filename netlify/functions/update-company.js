
const { createClient } = require('@supabase/supabase-js');

/**
 * update-company
 * 
 * This function completes the company setup by:
 * 1. Updating the 'companies' table (name, hub info, capital).
 * 2. Creating an entry in the 'hubs' table.
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

    if (!email) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Email is required' }) };
    }

    console.log(`[update-company] Processing update for ${email}...`);

    // 1. Get the company record first to get the ID
    const { data: company, error: fetchError } = await supabase
      .from('companies')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (fetchError || !company) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Company not found for this email' }) };
    }

    // 2. Update the main company record
    // We explicitly map 'company_name' to the 'name' column
    const { error: updateError } = await supabase
      .from('companies')
      .update({
        name: company_name,
        hub_name: hub_name,
        hub_country: hub_country,
        capital: capital,
        balance: balance || capital,
        updated_at: new Date().toISOString()
      })
      .eq('id', company.id);

    if (updateError) throw updateError;

    // 3. Create the Hub in the 'hubs' table
    // We use an upsert or check to prevent duplicates
    const { error: hubError } = await supabase
      .from('hubs')
      .upsert({
        company_id: company.id,
        name: hub_name,
        city: hub_name,
        country: hub_country,
        level: 1,
        is_main: true
      }, { onConflict: 'company_id, name' });

    if (hubError) {
      console.warn('[update-company] Hub creation warning (might already exist):', hubError.message);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        message: 'Company and Hub updated successfully',
        companyId: company.id 
      }),
    };
  } catch (error) {
    console.error('[update-company] Error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
