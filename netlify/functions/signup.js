
/**
 * signup.js
 * 
 * Enhanced Netlify function for full user initialization.
 * Bypasses RLS/Triggers using Service Role.
 * 
 * Flow:
 * 1. Create Auth User
 * 2. Create public.users row
 * 3. Create public.companies row (Startup)
 * 4. Update users.company_id
 * 5. Create public.hubs row (Main Hub)
 */

const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { email, password, username, metadata } = JSON.parse(event.body);

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  let authUser = null;

  try {
    // --- 1. Create Auth User ---
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username, ...metadata }
    });

    if (authError) throw authError;
    authUser = authData.user;

    // --- 2. Create User Profile (public.users) ---
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .insert([{
        id: authUser.id, // Linking to Auth ID
        auth_user_id: authUser.id,
        email: email.toLowerCase(),
        name: username || email.split('@')[0],
        email_normalized: email.toLowerCase(),
        data: {}
      }])
      .select()
      .single();

    if (profileError) throw profileError;

    // --- 3. Create Startup Company (public.companies) ---
    // Note: We create a generic company. The user can rename it later in the UI.
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .insert([{
        owner_id: profileData.id,
        name: `${username || 'New'}'s Logistics`,
        capital: 10000, // Starter capital
        email: email.toLowerCase(),
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (companyError) throw companyError;

    // --- 4. Link Company to User ---
    const { error: linkError } = await supabase
      .from('users')
      .update({ company_id: companyData.id })
      .eq('id', profileData.id);

    if (linkError) throw linkError;

    // --- 5. Create Main Hub (public.hubs) ---
    // Defaulting to a central hub location since this is "Single World"
    const { error: hubError } = await supabase
      .from('hubs')
      .insert([{
        company_id: companyData.id,
        name: 'Main Operations Center',
        country: 'Germany', // Default startup country
        region: 'global',
        level: 1,
        capacity: 5,
        is_main: true
      }]);

    if (hubError) throw hubError;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        user: authUser,
        company: companyData
      })
    };

  } catch (error) {
    console.error('Signup Process Failed:', error);

    // Rollback: If we created an auth user but the DB failed, delete the auth user
    if (authUser) {
      await supabase.auth.admin.deleteUser(authUser.id);
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
