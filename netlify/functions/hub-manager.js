
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * calculateBasePrice
 * Generates a unique price between 500k and 900k based on city name string.
 */
function calculateBasePrice(city, countryCode) {
  // Deterministic "randomness" based on string characters
  const seed = (city + countryCode).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  // Variance between 0 and 400,000
  const variance = (seed * 1337 % 401) * 1000; 
  return 500000 + variance;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { action, email, city, countryCode, duration, taskId } = JSON.parse(event.body);

    if (action === 'GET_PENDING') {
      const { data: tasks } = await supabase
        .from('infrastructure_tasks')
        .select('*')
        .eq('user_email', email)
        .eq('status', 'pending');
      
      const { data: timeData } = await supabase.from('game_time').select('current_ms').single();

      return {
        statusCode: 200,
        body: JSON.stringify({ tasks: tasks || [], currentGameMs: timeData?.current_ms || Date.now() })
      };
    }

    if (action === 'START_BUILD') {
      const basePrice = calculateBasePrice(city, countryCode);
      const daysSaved = 60 - duration;
      const speedPremium = basePrice * 0.01 * daysSaved; // 1% per day
      const totalPrice = basePrice + speedPremium;

      // Check Funds
      const { data: company } = await supabase.from('companies').select('capital').eq('owner_email', email).single();
      if (!company || company.capital < totalPrice) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Insufficient funds' }) };
      }

      // Deduct Capital
      await supabase.from('companies').update({ capital: company.capital - totalPrice }).eq('owner_email', email);

      // Create Task (duration is in in-game days)
      const { data: timeData } = await supabase.from('game_time').select('current_ms').single();
      const startMs = timeData?.current_ms || Date.now();
      const completionMs = startMs + (duration * 24 * 60 * 60 * 1000);

      const { data: task, error: taskErr } = await supabase.from('infrastructure_tasks').insert({
        user_email: email,
        task_type: 'build-hub',
        cost: totalPrice,
        completion_time: new Date(completionMs).toISOString(),
        payload: {
          city,
          countryCode,
          duration,
          startedAtGameMs: startMs,
          totalDays: duration
        },
        status: 'pending'
      });

      return { statusCode: 200, body: JSON.stringify({ message: 'Build started', task }) };
    }

    if (action === 'CANCEL_BUILD') {
        const { data: task } = await supabase.from('infrastructure_tasks').select('*').eq('id', taskId).single();
        if (!task) return { statusCode: 404, body: 'Task not found' };

        const refund = task.cost * 0.5;
        const { data: company } = await supabase.from('companies').select('capital').eq('owner_email', email).single();
        await supabase.from('companies').update({ capital: company.capital + refund }).eq('owner_email', email);
        await supabase.from('infrastructure_tasks').delete().eq('id', taskId);

        return { statusCode: 200, body: JSON.stringify({ message: 'Cancelled and refunded' }) };
    }

    return { statusCode: 400, body: 'Invalid Action' };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
