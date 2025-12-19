
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

    if (authError) {
      console.error("Auth Error:", authError);
      throw new Error(`Auth Creation Failed: ${authError.message}`);
    }
    authUser = authData.user;
    log.push(`Auth User Created: ${authUser.id}`);

    // --- 2. Create User Profile ---
    log.push("Step 2: Creating Public User Profile");
    // We use upsert here in case a trigger already created a row, to avoid "duplicate key" errors
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .upsert({
        id: authUser.id,
        auth_user_id: authUser.id,
        email: email.toLowerCase(),
        name: username || email.split('@')[0],
        email_normalized: email.toLowerCase(),
        data: {}
      }, { onConflict: 'id' })
      .select()
      .single();

    if (profileError) {
      console.error("Profile Error:", profileError);
      throw new Error(`Profile Creation Failed: ${profileError.message}`);
    }
    log.push("Profile Created/Verified");

    // --- 3. Create Startup Company ---
    log.push("Step 3: Creating Company");
    // Note: If this fails, it's likely a column name issue (e.g. owner_id vs user_id)
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .insert([{
        owner_id: authUser.id, // Trying owner_id first
        name: `${username || 'New'}'s Logistics`,
        capital: 10000,
        email: email.toLowerCase()
      }])
      .select()
      .single();

    if (companyError) {
      console.error("Company Error:", companyError);
      // Try fallback column name if owner_id failed
      log.push("Retrying company creation with 'user_id' column...");
      const { data: companyDataRetry, error: companyErrorRetry } = await supabase
        .from('companies')
        .insert([{
          user_id: authUser.id, 
          name: `${username || 'New'}'s Logistics`,
          capital: 10000
        }])
        .select()
        .single();
      
      if (companyErrorRetry) {
        throw new Error(`Company Creation Failed: ${companyErrorRetry.message}`);
      }
      var finalCompany = companyDataRetry;
    } else {
      var finalCompany = companyData;
    }
    log.push(`Company Created: ${finalCompany.id}`);

    // --- 4. Link Company back to User ---
    log.push("Step 4: Linking Company to User");
    const { error: linkError } = await supabase
      .from('users')
      .update({ company_id: finalCompany.id })
      .eq('id', authUser.id);

    if (linkError) {
      console.error("Link Error:", linkError);
      throw new Error(`Linking Failed: ${linkError.message}`);
    }
    log.push("Company Linked");

    // --- 5. Create Main Hub ---
    log.push("Step 5: Creating Main Hub");
    const { error: hubError } = await supabase
      .from('hubs')
      .insert([{
        company_id: finalCompany.id,
        name: 'Main Operations Center',
        country: 'Germany',
        region: 'global',
        level: 1,
        capacity: 5,
        is_main: true
      }]);

    if (hubError) {
      console.error("Hub Error:", hubError);
      // We don't throw here to at least let the user log in if only the hub failed
      log.push(`Hub Warning: ${hubError.message}`);
    } else {
      log.push("Hub Created");
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        user: authUser,
        company: finalCompany,
        log: log
      })
    };

  } catch (error) {
    console.error('Signup Process Failed:', error);
    
    // Rollback only if it was an auth-only account with no data
    // (If the profile was created, we might want to keep it for debugging)

    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error.message,
        log: log 
      })
    };
  }
};
