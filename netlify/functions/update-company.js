
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { email, company_name, hub_name, hub_country, capital, balance } = JSON.parse(event.body);
    const cleanEmail = String(email || '').toLowerCase().trim();

    console.log(`[Diagnostic] Searching for company with email: ${cleanEmail}`);

    // 1. Check if record exists first
    const { data: existing } = await supabase.from('companies').select('id, name').eq('email', cleanEmail);
    console.log(`[Diagnostic] Found ${existing?.length || 0} records.`);

    // 2. Perform the update
    const { data: updated, error: updateError } = await supabase
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

    // 3. Force Hub Creation
    if (updated && updated.length > 0) {
      const companyId = updated[0].id;
      const { error: hubError } = await supabase.from('hubs').upsert({
        company_id: companyId,
        name: hub_name,
        city: hub_name,
        country: hub_country,
        is_main: true,
        level: 1
      }, { onConflict: 'company_id, name' });
      
      if (hubError) console.error('[Diagnostic] Hub Error:', hubError.message);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        found: existing?.length || 0,
        updated: updated?.length || 0 
      }),
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
