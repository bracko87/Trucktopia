
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const { email, name, hub_name, hub_country, capital } = JSON.parse(event.body);

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Update the company record for this user
    const { data, error } = await supabase
      .from('companies')
      .update({ 
        name: name,
        hub_name: hub_name,
        hub_country: hub_country,
        balance: capital,
        capital: capital,
        updated_at: new Date().toISOString()
      })
      .eq('email', email.toLowerCase())
      .select();

    if (error) throw error;

    // Also update/create the main hub record
    if (data && data[0]) {
      await supabase.from('hubs').upsert({
        company_id: data[0].id,
        name: hub_name,
        country: hub_country,
        is_main: true
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, company: data[0] })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
