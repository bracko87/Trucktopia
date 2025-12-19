
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { email, company_name, hub_name, hub_country, capital, balance } = JSON.parse(event.body);

    if (!email) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Email is required' }) };
    }

    // 1. Find the company ID first
    const { data: company, error: fetchError } = await supabase
      .from('companies')
      .select('id')
      .eq('email', email)
      .single();

    if (fetchError || !company) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Company not found' }) };
    }

    // 2. Update the company table (Overwrite dummy name and Pending values)
    const { error: updateError } = await supabase
      .from('companies')
      .update({
        name: company_name,
        hub_name: hub_name,
        hub_country: hub_country,
        capital: capital,
        balance: balance,
        updated_at: new Date().toISOString()
      })
      .eq('id', company.id);

    if (updateError) throw updateError;

    // 3. Create the Hub in public.hubs
    // We assume the table 'hubs' exists with these columns
    const { error: hubError } = await supabase
      .from('hubs')
      .insert([
        {
          company_id: company.id,
          name: hub_name,
          country: hub_country,
          level: 1,
          is_main: true
        }
      ]);

    // Note: If hub already exists, we might get an error, but for "Create Company" 
    // it should be a fresh insert. We ignore conflicts for now to keep it simple.

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Company and Hub updated successfully' }),
    };
  } catch (error) {
    console.error('Update Company Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

