
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { email, vehicleData } = JSON.parse(event.body);
    const userEmail = email.toLowerCase().trim();

    // 1. Get current company balance
    const { data: company, error: fetchError } = await supabase
      .from('companies')
      .select('balance, capital')
      .eq('email', userEmail)
      .single();

    if (fetchError || !company) throw new Error('Company not found');

    const balance = company.balance || company.capital;
    if (balance < vehicleData.price) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'Insufficient funds' }) 
      };
    }

    // 2. Perform Transaction: Deduct money AND Add truck
    const newBalance = balance - vehicleData.price;

    // Update Company
    await supabase
      .from('companies')
      .update({ balance: newBalance, capital: newBalance })
      .eq('email', userEmail);

    // Add Truck
    const { data: newTruck, error: truckError } = await supabase
      .from('trucks')
      .insert([{
        owner_email: userEmail,
        brand: vehicleData.brand,
        model: vehicleData.model,
        category: vehicleData.category || 'Small',
        price_paid: vehicleData.price,
        condition: 100,
        kilometers: 0,
        location: vehicleData.location || 'HQ',
        status: 'available'
      }])
      .select()
      .single();

    if (truckError) throw truckError;

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Vehicle purchased successfully',
        newBalance,
        truck: newTruck
      })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
