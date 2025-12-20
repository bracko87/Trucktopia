/**
 * fire-staff.js
 * 
 * Securely handles firing staff members from the relational database.
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { email, staffId } = JSON.parse(event.body);

    if (!email || !staffId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing email or staffId' }) };
    }

    // 1. Delete the staff member from the relational table
    // We filter by both ID and company_email to ensure users can only fire their own staff
    const { error: deleteError } = await supabase
      .from('staff')
      .delete()
      .match({ id: staffId, company_email: email.toLowerCase().trim() });

    if (deleteError) throw deleteError;

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Staff member fired successfully' })
    };
  } catch (err) {
    console.error('Fire staff error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
