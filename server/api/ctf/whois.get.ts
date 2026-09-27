// server/api/ctf/whois.get.ts
import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '../../../types/database.types'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const rawTarget = String(query.operator || '').trim()

  if (!rawTarget) {
    return { found: false }
  }

  const supabase = await serverSupabaseClient<Database>(event)

  // 1. 多態檢索：既支援 Snowflake ID 比對，也支援暱稱比對
  let rankQuery = supabase
    .schema('ctf')
    .from('leaderboard')
    .select('*')

  if (/^\d+$/.test(rawTarget)) {
    // ★ 核心好品味：純數字時比對 account_id (純文字匹配，絕不用 Number 截斷精度！)
    rankQuery = rankQuery.eq('account_id', rawTarget as any)
  } else {
    // 非純數字時，比對顯示名稱
    rankQuery = rankQuery.eq('username', rawTarget)
  }

  const { data: rankEntry, error: rankError } = await rankQuery.maybeSingle()

  if (rankError) {
    console.error('[-] whois rank query error:', rankError.message)
    throw createError({ statusCode: 500, statusMessage: rankError.message })
  }

  // 確定真實要查題目的 account_id
  let targetAccountId = rankEntry ? rankEntry.account_id : (/^\d+$/.test(rawTarget) ? rawTarget : null)

  // 若榜單沒排上（例如 0 分），但傳入的是非數字暱稱，向檔案庫反查 account_id
  if (!targetAccountId && !/^\d+$/.test(rawTarget)) {
    const { data: profile } = await supabase
      .from('participant_data')
      .select('discord_id')
      .or(`discord_username.eq.${rawTarget},username.eq.${rawTarget}`)
      .maybeSingle()
    if (profile) {
      targetAccountId = profile.discord_id
    }
  }

  if (!targetAccountId) {
    return { found: false }
  }

  // 2. 查詢已解題目列表（透過純文字傳遞 BIGINT，零精度損失）
  const { data: solvesData, error: solvesError } = await supabase
    .schema('ctf')
    .from('solves')
    .select('challenge_id, solved_at')
    .eq('account_id', targetAccountId as any)
    .order('solved_at', { ascending: false })

  if (solvesError) {
    console.error('[-] whois solves query error:', solvesError.message)
    throw createError({ statusCode: 500, statusMessage: solvesError.message })
  }

  // 如果榜單與解題庫兩頭皆空，判定查無此人
  if (!rankEntry && (!solvesData || solvesData.length === 0)) {
    return { found: false }
  }

  let challengeMap = new Map<string, { title: string; category: string; points: number }>()

  if (solvesData && solvesData.length > 0) {
    const challengeIds = Array.from(new Set(solvesData.map(s => s.challenge_id)))
    
    const { data: challengesData, error: challengesError } = await supabase
      .schema('ctf')
      .from('challenges')
      .select('id, title, category, initial_points')
      .in('id', challengeIds)

    if (challengesError) {
      console.error('[-] whois challenges lookup error:', challengesError.message)
      throw createError({ statusCode: 500, statusMessage: challengesError.message })
    }

    if (challengesData) {
      challengesData.forEach(c => {
        challengeMap.set(c.id, {
          title: c.title || c.id,
          category: c.category || 'MISC',
          points: c.initial_points || 0
        })
      })
    }
  }


  // 4. 裝配最終檔案
  const solves = (solvesData || []).map(s => {
    const meta = challengeMap.get(s.challenge_id)
    return {
      title: meta?.title || s.challenge_id,
      category: meta?.category || 'MISC',
      points: meta?.points || 0,
      solvedAt: s.solved_at
    }
  })

  const computedScore = solves.reduce((sum, item) => sum + item.points, 0)

  return {
    found: true,
    accountId: rankEntry?.account_id || `operator_${String(targetAccountId).slice(-4)}`,
    rank: rankEntry ? rankEntry.rank : '-',
    totalScore: rankEntry ? rankEntry.total_points : computedScore,
    solvesCount: rankEntry ? rankEntry.solves_count : solves.length,
    solves
  }
})