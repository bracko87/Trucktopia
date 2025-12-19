
const { createClient } = require('@supabase/supabase-js');

/**
 * signup.js
 * Backend function to handle secure user registration using Service Role.
 * This bypasses RLS and triggers, preventing Error 500 failures.
 */
exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { email, password, username, metadata } = JSON.parse(event.body);

  // Initialize Supabase with SERVICE_ROLE_KEY
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // 1. Create user in Auth (Admin mode)
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username, ...metadata }
    });

    if (authError) throw authError;

    // 2. Insert into public.users table
    // Note: We do NOT include world_id here to support the "Single World" move.
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .insert([
        {
          id: authUser.user.id,
          email: email,
          username: username || email.split('@')[0],
          created_at: new Date().toISOString(),
          // Ensure we don't send world_id/region data if it causes 500s
        }
      ])
      .select()
      .single();

    if (profileError) {
      // Rollback: Delete the auth user if the profile creation fails
      await supabase.auth.admin.deleteUser(authUser.user.id);
      throw profileError;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Registration successful',
        user: authUser.user,
        profile: profile
      })
    };

  } catch (error) {
    console.error('Registration Error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
