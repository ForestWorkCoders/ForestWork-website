// server/api/ctf/whois.get.ts
import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '../../../types/database.types'

/**
 * 斯巴达式身份解析器：将任意外部标识符统一归一化为内部 account_id
 */
async function resolveTargetAccountId(
  supabase: any,
  rawInput: string
): Promise<number | null> {
  const trimmed = rawInput.trim()
  if (!trimmed) return null

  // 1. 快速路径：如果是纯数字或 operator_123 格式，直接纯内存正则提取，零 DB 开销
  const numericMatch = trimmed.match(/^(?:operator_)?(\d+)$/i)
  if (numericMatch && numericMatch[1]) {
    const id = Number(numericMatch[1])
    return !isNaN(id) && id > 0 ? id : null
  }

  // 2. 文本路径：作为 Discord 用户名去公共用户表检索
  // 利用 ilike 确保用户名输入大小写不敏感
  const { data: userProfile, error } = await supabase
    .schema('public')
    .from('participant_data')
    .select('id, discord_username')
    .ilike('discord_username', trimmed)
    .maybeSingle()

  if (error || !userProfile) {
    return null
  }

  // 返回对应的内部账户 ID (对应 participant_data.id)
  return userProfile.id
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const rawOperator = String(query.operator || '').trim()

  if (!rawOperator) {
    return { found: false, identifier: '' }
  }

  const supabase = await serverSupabaseClient<Database>(event)

  // ★ 核心好品味：单向归一化，消灭所有后续分支
  const accountId = await resolveTargetAccountId(supabase, rawOperator)

  if (!accountId) {
    return { found: false, identifier: rawOperator }
  }

  // ----------------------------------------------------
  // 以下查询流水线完全保持不变，纯粹基于确定性的 accountId 执行
  // ----------------------------------------------------

  // 1. 从积分榜获取排名
  const { data: leaders, error: leaderError } = await supabase
    .schema('ctf')
    .from('leaderboard')
    .select('account_id, total_score, solves_count')
    .order('total_score', { ascending: false })
    .order('last_solve_time', { ascending: true })

  if (leaderError) {
    throw createError({ statusCode: 500, statusMessage: leaderError.message })
  }

  const rankIndex = (leaders || []).findIndex(l => l.account_id === accountId)
  if (rankIndex === -1) {
    return { found: false, identifier: rawOperator }
  }

  const targetLeader = leaders[rankIndex]!

  // 2. 查询解题流水
  const { data: solves, error: solveError } = await supabase
    .schema('ctf')
    .from('solves')
    .select('challenge_id, solved_at')
    .eq('account_id', accountId)
    .order('solved_at', { ascending: true })

  if (solveError) {
    throw createError({ statusCode: 500, statusMessage: solveError.message })
  }

  // 3. 关联题目分值
  const challengeIds = (solves || []).map(s => s.challenge_id)
  const { data: pointsData } = await supabase
    .schema('ctf')
    .from('challenge_points')
    .select('id, title, category, current_points')
    .in('id', challengeIds)

  const pointsMap = new Map((pointsData || []).map(p => [p.id, p]))

  const detailedSolves = (solves || []).map(s => {
    const meta = pointsMap.get(s.challenge_id)
    return {
      challengeId: s.challenge_id,
      title: meta?.title || s.challenge_id,
      category: meta?.category || 'unknown',
      points: meta?.current_points || 100,
      solvedAt: s.solved_at
    }
  })

  return {
    found: true,
    identifier: rawOperator,
    accountId,
    rank: rankIndex + 1,
    totalScore: targetLeader.total_score || 0,
    solvesCount: targetLeader.solves_count || 0,
    solves: detailedSolves
  }
})