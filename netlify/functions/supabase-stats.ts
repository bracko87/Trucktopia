import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function handler() {
  try {
    const { count, error } = await supabase
      .from('auth.users')
      .select('*', { count: 'exact', head: true })

    if (error) throw error

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        totalUsers: count ?? 0,
        source: 'service-role'
      })
    }
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    }
  }
}
