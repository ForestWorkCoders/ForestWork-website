import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '../../../types/database.types'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient<Database>(event)
  const query = getQuery(event)

  // 1. 查询所有激活关卡（包含 prerequisite_id）
  const { data: challenges, error } = await supabase
    .schema('ctf')
    .from('challenge_points')
    .select('id, title, category, prompt, current_points, solve_count, files, prerequisite_id')
    .eq('is_active', true)

  // 2. 如果没有提供操作员身份，只下发无前置依赖的基础关卡
  if (error || !challenges) {
    throw createError({ statusCode: 500, statusMessage: error?.message || 'Failed to fetch challenges' })
  }

  // 3. 获取 operator 参数并斯巴达式提纯数字 ID
  const rawOperator = String(query.operator || '').trim()
  if (!rawOperator) {
    // 未提供任何身份，仅下发无前置依赖的基础题目
    return challenges.filter(c => !c.prerequisite_id)
  }

  // ★ 核心好品味：剥离所有非数字字符，还原底层整数本质 (如 'operator_10001' -> 10001)
  const numericOperator = parseInt(rawOperator.replace(/\D/g, ''), 10)
  if (Number.isNaN(numericOperator)) {
    // 无法解析出合法整数，视为非法/未注册操作员
    return challenges.filter(c => !c.prerequisite_id)
  }

  // 4. ★ 纯正强类型查询：直接使用 number 匹配，类型 100% 契合且走索引快速查找
  const { data: userSolves, error: solvesError } = await supabase
    .schema('ctf')
    .from('solves')
    .select('challenge_id')
    .eq('account_id', numericOperator)

  if (solvesError) {
    throw createError({ statusCode: 500, statusMessage: solvesError.message })
  }

  const solvedSet = new Set((userSolves || []).map(s => s.challenge_id))

  // 5. 过滤放行：无依赖 或 前置题目已在解题集合中
  return challenges.filter(c => {
    if (!c.prerequisite_id) return true
    return solvedSet.has(c.prerequisite_id)
  })
})