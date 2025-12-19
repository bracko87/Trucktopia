
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const { email, name, hub_name, hub_country, capital } = JSON.parse(event.body);

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { data, error } = await supabase
      .from('companies')
      .update({
        name,
        hub_name,
        hub_country,
        capital: capital,
        balance: capital, // Sync balance with the new capital
        level: 'seed'      // Explicitly set to seed as requested
      })
      .eq('email', email.toLowerCase());

    if (error) throw error;

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
