// server/api/activities/leaderboard.get.ts
// ★ 1. 改为使用 serverSupabaseServiceRole[cite: 27]
import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const moduleId = Number(query.moduleId || 1)
  const rawDiscordId = query.discordId ? String(query.discordId).trim() : null

  if (!Number.isInteger(moduleId) || moduleId < 1 || moduleId > 10) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid moduleId' })
  }

  // ★ 2. 使用服务角色客户端，彻底免疫跨 Schema 查询时的权限拦截！[cite: 27]
  const supabase = serverSupabaseServiceRole(event)

  // 1. 抓取该模块全球排名前 50 强 (由 trpg.v_skill_leaderboard 提供)
  const leaderboardPromise = supabase
    .schema('trpg')
    .from('v_skill_leaderboard')
    .select('global_rank, discord_id, operator_name, avatar_url, score, rating, metrics, created_at')
    .eq('module_id', moduleId)
    .order('global_rank', { ascending: true })
    .limit(50)

  // 2. 顺手捞出该选手在全部 10 个槽位的个人最佳分 (PB)
  let pbPromise: PromiseLike<any> = Promise.resolve({ data: [] })
  if (rawDiscordId && /^\d+\$/.test(rawDiscordId)) {
    pbPromise = supabase
      .schema('trpg')
      .from('v_skill_personal_bests')
      .select('module_id, best_score')
      .eq('discord_id', rawDiscordId)
  }

  const [leaderboardRes, pbRes] = await Promise.all([leaderboardPromise, pbPromise])

  if (leaderboardRes.error) {
    console.error('[-] Leaderboard Query Error:', leaderboardRes.error.message)
    throw createError({ statusCode: 500, statusMessage: `Leaderboard Query Failed: ${leaderboardRes.error.message}` })
  }

  // 格式化输出 PB 字典: { 1: 12430, 2: 11915, ... }
  const personalBests: Record<number, number> = {}
  if (Array.isArray(pbRes.data)) {
    for (const row of pbRes.data) {
      personalBests[row.module_id] = row.best_score
    }
  }

  return {
    success: true,
    moduleId,
    leaderboard: leaderboardRes.data ?? [],
    personalBests
  }
})