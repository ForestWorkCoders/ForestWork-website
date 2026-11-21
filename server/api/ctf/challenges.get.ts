import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { getSessionUser } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const supabase = serverSupabaseServiceRole<Database>(event)
  const session = getSessionUser(event)

  // 1. 查询所有激活关卡（包含 prerequisite_id）
  const { data: challenges, error } = await supabase
    .schema('ctf')
    .from('challenge_points')
    .select('id, title, category, prompt, current_points, solve_count, files, prerequisite_id')
    .eq('is_active', true)

  if (error || !challenges) {
    throw createError({ statusCode: 500, statusMessage: error?.message || 'Failed to fetch challenges' })
  }

  // 2. 没有登录会话时，只下发无前置依赖的基础关卡
  if (!session) {
    return challenges.filter(c => !c.prerequisite_id)
  }

  // 以无损字符串查询 BIGINT，避免浮点数截断
  const { data: userSolves, error: solvesError } = await supabase
    .schema('ctf')
    .from('solves')
    .select('challenge_id')
    .eq('account_id', session.id as unknown as number)

  if (solvesError) {
    throw createError({ statusCode: 500, statusMessage: solvesError.message })
  }

  const solvedSet = new Set((userSolves || []).map(s => s.challenge_id))

  // 3. 过滤放行：无依赖 或 前置题目已在解题集合中
  return challenges.filter(c => {
    if (!c.prerequisite_id) return true
    return solvedSet.has(c.prerequisite_id)
  })
})
