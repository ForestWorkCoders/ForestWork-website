// server/api/activities/leaderboard.get.ts
import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const moduleId = Number(query.moduleId || 1)
  const rawDiscordId = query.discordId ? String(query.discordId).trim() : null

  if (!Number.isInteger(moduleId) || moduleId < 1 || moduleId > 10) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid moduleId: Must be between 1 and 10.' })
  }

  // ★ 1. 使用 ServiceRole 客户端执行提权查询，彻底消灭 RLS 阻断！
  const supabase = serverSupabaseServiceRole(event)

  // 1. 抓取该模块全球排名前 50 强
  const leaderboardPromise = supabase
    .schema('trpg')
    .from('v_skill_leaderboard')
    .select('global_rank, discord_id, operator_name, avatar_url, score, rating, metrics, created_at')
    .eq('module_id', moduleId)
    .order('global_rank', { ascending: true })
    .limit(50)

  // 2. 顺手捞出该选手在全部 10 个槽位的个人最佳分 (PB)
  let pbPromise: PromiseLike<any> = Promise.resolve({ data: [] })
  if (rawDiscordId && /^\d+$/.test(rawDiscordId)) {
    pbPromise = supabase
      .schema('trpg')
      .from('v_skill_personal_bests')
      .select('module_id, best_score')
      .eq('discord_id', rawDiscordId)
  }

  const [leaderboardRes, pbRes] = await Promise.all([leaderboardPromise, pbPromise])

  if (leaderboardRes.error) {
    console.error('[-] Leaderboard Query Failed:', leaderboardRes.error.message)
    throw createError({ statusCode: 500, statusMessage: `Leaderboard Query Failed: ${leaderboardRes.error.message}` })
  }

  // ★ 2. 核心好品味：把 PB 的潜在错误抓出来打印，拒绝装聋作哑！
  if (pbRes.error) {
    console.error('[-] Personal Bests Query Failed:', pbRes.error.message)
  }

  // 格式化输出 PB 字典: { 1: 12430, 2: 11915, ... }
  const personalBests: Record<number, number> = {}
  if (Array.isArray(pbRes.data)) {
    for (const row of pbRes.data) {
      personalBests[row.module_id] = Number(row.best_score)
    }
  }

  return {
    success: true,
    moduleId,
    leaderboard: leaderboardRes.data ?? [],
    personalBests
  }
})