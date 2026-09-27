import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '../../../types/database.types'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient<Database>(event)
  const query = getQuery(event)
  const operator = Number(query.operator || '')

  // 1. 查询所有激活关卡（包含 prerequisite_id）
  const { data: challenges, error } = await supabase
    .schema('ctf')
    .from('challenge_points')
    .select('id, title, category, prompt, current_points, solve_count, files, prerequisite_id')
    .eq('is_active', true)

  if (error || !challenges) {
    throw createError({ statusCode: 500, statusMessage: error?.message || 'Failed to fetch challenges' })
  }

  // 2. 如果没有提供操作员身份，只下发无前置依赖的基础关卡
  if (!operator) {
    return challenges.filter(c => !c.prerequisite_id)
  }

  // 3. 查询当前操作员已解出的题目 ID 集合
  const { data: userSolves } = await supabase
    .schema('ctf')
    .from('solves')
    .select('challenge_id')
    .eq('account_id', operator)

  const solvedSet = new Set((userSolves || []).map(s => s.challenge_id))

  // 4. ★ 核心好品味：无依赖 或 前置题目已在解题集合中，才下发数据！
  const accessibleChallenges = challenges.filter(c => {
    if (!c.prerequisite_id) return true
    return solvedSet.has(c.prerequisite_id)
  })

  return accessibleChallenges
})