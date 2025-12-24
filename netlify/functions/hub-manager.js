const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * hub-manager.js
 * 
 * Server-authoritative logic for hubs and construction using In-Game Time.
 */
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { action, email, city, countryCode, duration } = JSON.parse(event.body);

    const { data: user, error: userErr } = await supabase.from('users').select('id').eq('email', email).single();
    if (userErr || !user) return { statusCode: 404, body: JSON.stringify({ error: 'User not found' }) };
    const ownerId = user.id;

    const { data: timeData } = await supabase.from('game_clock').select('now_utc_ms').single();
    const currentGameMs = timeData ? timeData.now_utc_ms : Date.now();

    // --- ACTION: START_BUILD ---
    if (action === 'START_BUILD') {
      const chosenDuration = Math.max(40, Math.min(60, duration || 60));
      
      // Rule: Faster = More Expensive. Base (60 days) = 200k.
      const speedPremium = (60 - chosenDuration) * 10000;
      const totalCost = 200000 + speedPremium;

      // Duplicate Check (Existing Hub or Active Task)
      const { data: existingHub } = await supabase.from('hubs').select('id').eq('owner_id', ownerId).eq('city', city).single();
      if (existingHub) return { statusCode: 400, body: JSON.stringify({ error: 'Hub already exists in this city.' }) };
      
      const { data: existingTask } = await supabase.from('pending_tasks').select('id').eq('owner_id', ownerId).eq('payload->>city', city).eq('status', 'pending').single();
      if (existingTask) return { statusCode: 400, body: JSON.stringify({ error: 'Construction is already in progress for this city.' }) };

      const msPerDay = 24 * 60 * 60 * 1000;
      const completionGameMs = currentGameMs + (chosenDuration * msPerDay);

      const { error: taskErr } = await supabase.from('pending_tasks').insert({
        owner_id: ownerId,
        task_type: 'build_hub',
        completion_time: new Date(completionGameMs).toISOString(),
        cost: totalCost,
        payload: { city, countryCode, duration: chosenDuration },
        status: 'pending'
      });

      if (taskErr) throw taskErr;
      return { statusCode: 200, body: JSON.stringify({ message: 'Success', cost: totalCost, days: chosenDuration }) };
    }

    // --- ACTION: FINALIZE_TASKS ---
    if (action === 'FINALIZE_TASKS') {
      const { data: readyTasks } = await supabase
        .from('pending_tasks')
        .select('*')
        .eq('owner_id', ownerId)
        .eq('status', 'pending')
        .lte('completion_time', new Date(currentGameMs).toISOString());

      if (readyTasks && readyTasks.length > 0) {
        for (const task of readyTasks) {
          await supabase.from('hubs').insert({
            owner_id: ownerId,
            city: task.payload.city,
            country_code: task.payload.countryCode,
            hub_level: 1, // Rule: Always start at Level 1
            data: { capacity: 10, is_main: false }
          });
          await supabase.from('pending_tasks').update({ status: 'completed' }).eq('id', task.id);
        }
      }
      return { statusCode: 200, body: JSON.stringify({ message: 'Check complete' }) };
    }

    if (action === 'GET_HUBS') {
      const { data: hubs } = await supabase.from('hubs').select('*').eq('owner_id', ownerId);
      return { statusCode: 200, body: JSON.stringify({ hubs }) };
    }

    return { statusCode: 400, body: 'Invalid Action' };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};