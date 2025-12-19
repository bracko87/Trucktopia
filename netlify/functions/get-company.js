
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  const email = event.queryStringParameters.email;
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error) throw error;
    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
