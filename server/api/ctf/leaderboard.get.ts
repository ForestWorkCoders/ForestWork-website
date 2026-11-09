// server/api/ctf/leaderboard.get.ts
import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '../../../types/database.types'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient<Database>(event)

  const { data, error } = await supabase
    .schema('ctf')
    .from('leaderboard')
    .select('*')
    .order('rank', { ascending: true })
    .limit(50)

  if (error) {
    console.error('[-] Leaderboard API Error:', error.message)
    throw createError({ statusCode: 500, statusMessage: `Leaderboard query failed: ${error.message}` })
  }

  return (data || []).map((row: any) => ({
    rank: row.rank,
    username: row.username || row.user || 'anonymous',
    user: row.username || row.user || 'anonymous',
    solved: row.solved ?? row.solves_count ?? 0,
    score: row.score ?? row.total_points ?? 0,
    lastSolve: row.last_solve || row.last_solve_at || null
  }))
})