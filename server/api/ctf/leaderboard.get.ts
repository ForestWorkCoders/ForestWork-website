// server/api/ctf/leaderboard.get.ts
import { serverSupabaseClient } from '#supabase/server'
// 改用纯物理相对路径！消除任何 Nuxt 别名解析歧义（从 server/api/ctf/ 往上跳三层到根目录）
import type { Database } from '../../../types/database.types'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient<Database>(event)

  // 查 ctf schema 下的 leaderboard 视图
  const { data, error } = await supabase
    .schema('ctf')
    .from('leaderboard')
    .select('account_id, total_score, solves_count, last_solve_time')
    .limit(20)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  // 格式化输出契约
  return (data || []).map((row, index) => ({
    rank: index + 1,
    user: `operator_${row.account_id}`, // 未来可跨表 JOIN participant_data 获取真实名称
    solved: Number(row.solves_count || 0),
    score: Number(row.total_score || 0),
    lastSolve: row.last_solve_time ? new Date(row.last_solve_time).toLocaleTimeString() : '--'
  }))
})