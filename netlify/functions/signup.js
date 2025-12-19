
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { email, password, username, metadata } = JSON.parse(event.body);

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  let authUser = null;
  let log = [];

  try {
    // --- 1. Create Auth User ---
    log.push("Step 1: Creating Auth User");
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username, ...metadata }
    });

    if (authError) throw new Error(`Auth Creation Failed: ${authError.message}`);
    authUser = authData.user;
    log.push(`Auth User Created: ${authUser.id}`);

    // --- 2. Create User Profile ---
    log.push("Step 2: Creating Public User Profile");
    const { error: profileError } = await supabase
      .from('users')
      .upsert({
        id: authUser.id,
        auth_user_id: authUser.id,
        email: email.toLowerCase(),
        name: username || email.split('@')[0],
        email_normalized: email.toLowerCase(),
        data: {}
      }, { onConflict: 'id' });

    if (profileError) throw new Error(`Profile Creation Failed: ${profileError.message}`);

    // --- 3. Create Company (Initial State: "Seed") ---
    log.push("Step 3: Creating Company");
    
    const companyPayload = {
      owner_id: authUser.id,
      name: `${username || 'New'}'s Logistics`, // Placeholder until CreateCompany.tsx updates it
      email: email.toLowerCase(),
      capital: 10000,
      balance: 10000,
      level: 'seed',           // As requested
      reputation: 0,           // As requested
      hub_name: 'Pending',
      hub_country: 'Pending',
      hub_region: 'Global',
      trucks: 0,
      trailers: 0,
      employees: 0,
      jobs_done: 0,
      data: {}
    };

    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .insert([companyPayload])
      .select().single();

    if (companyError) throw new Error(`Company Creation Failed: ${companyError.message}`);

    const companyId = companyData.id;
    log.push(`Company Created: ${companyId}`);

    // --- 4. Link Company to User ---
    log.push("Step 4: Linking Company to User");
    await supabase.from('users').update({ company_id: companyId }).eq('id', authUser.id);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, user: authUser, company: companyData, log: log })
    };

  } catch (error) {
    console.error('Signup Process Failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message, log: log })
    };
  }
};
