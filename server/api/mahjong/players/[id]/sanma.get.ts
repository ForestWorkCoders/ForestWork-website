// server/api/mahjong/players/[id]/sanma.get.ts
import { serverSupabaseClient } from '#supabase/server'
import { getQuery, getRouterParam, createError } from 'h3'
import type { Database } from '~/types/database.types'

function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size))
  }
  return result
}

export default defineEventHandler(async (event) => {
  const rawId = getRouterParam(event, 'id')
  const accountId = Number(rawId)
  if (!accountId || isNaN(accountId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid player ID' })
  }

  const query = getQuery(event)
  const startMonth = query.start ? String(query.start) : null
  const endMonth = query.end ? String(query.end) : null

  // ★ 讀取賽制排除參數
  const excludeInvitational = query.exclude_invitational === 'true'
  const excludeGroup = query.exclude_group === 'true'

  const supabase = await serverSupabaseClient<Database>(event)

  // ==========================================
  // 1. 查詢選手所有三麻對局 (必須選取 tournament_bind_id 與 group_tag)
  // ==========================================
  const { data: allSanmaMatches, error: matchErr } = await supabase
    .schema('mahjong')
    .from('matches')
    .select('id, uuid, start_time, east_id, east_score, south_id, south_score, west_id, west_score, tournament_bind_id, group_tag')
    .is('north_id', null)
    .or(`east_id.eq.${accountId},south_id.eq.${accountId},west_id.eq.${accountId}`)
    .order('start_time', { ascending: false })

  if (matchErr) {
    throw createError({ statusCode: 500, statusMessage: matchErr.message })
  }

  const matches = allSanmaMatches || []

  // 1.1 批次拉取賽事元數據字典 (用最斯巴達的方式建立 format 索引)
  const { data: tourneys } = await supabase
    .schema('mahjong')
    .from('tournaments')
    .select('id, format, title')

  const tourneyList = tourneys || []
  const tourneyMap = new Map(tourneyList.map(t => [String(t.id).toLowerCase(), t]))

  // ★★★ 核心好品味：在源頭將特殊賽事對局一刀切除，下游完全無感知 ★★★
  let invitationalDropCount = 0
  let groupDropCount = 0

  const eligibleMatches = matches.filter(m => {
    const rawTourneyId = String(m.tournament_bind_id).toLowerCase()
    const tourney = rawTourneyId ? tourneyMap.get(rawTourneyId) : null

    // 判定邀請賽 (格式為 invitational，或標題含邀請賽)
    const isInvitational = tourney?.format === 'invitational' || (tourney?.title && tourney.title.includes('邀請賽'))

    // 判定分組/接力賽 (含有分組標籤，或賽制為 relay)
    const rawGroupTag = m.group_tag
    const isGroup = Boolean(rawGroupTag && String(rawGroupTag).trim() !== '') || tourney?.format === 'relay'

    if (excludeInvitational && isInvitational) {
      invitationalDropCount++
      return false
    }
    if (excludeGroup && isGroup) {
      groupDropCount++
      return false
    }
    return true
  })

//   console.log(`[Sanma Filter X-Ray]
//     選手 ID: ${accountId}
//     該選手三麻總場次 (north_id IS NULL): ${matches.length}
//     讀取到的賽事總數 (tournaments): ${tourneyList.length} (錯誤: ${matchErr || '無'})
//     排除參數: excludeInvitational=${excludeInvitational}, excludeGroup=${excludeGroup}
//     實際剔除場次: 邀請賽剔除 ${invitationalDropCount} 場, 分組/接力剔除 ${groupDropCount} 場
//     最終有效場次: ${eligibleMatches.length}
//   `)

  // 2. 生涯邊界計算 (型別收窄防禦)
  let earliestYear = '2023-01'
  let latestYear = '2026-12'
  const dates = matches
    .map(m => m.start_time)
    .filter((d): d is string => typeof d === 'string' && d.length >= 7)
    .sort()

  const firstDate = dates[0]
  const lastDate = dates[dates.length - 1]
  if (firstDate && lastDate) {
    earliestYear = firstDate.slice(0, 7)
    latestYear = lastDate.slice(0, 7)
  }

  // 3. 依據時間區間過濾對局
  const filteredMatches = eligibleMatches.filter(m => {
    if (!m.start_time) return false
    const matchMonth = m.start_time.slice(0, 7)
    if (startMonth && matchMonth < startMonth) return false
    if (endMonth && matchMonth > endMonth) return false
    return true
  })

  // 4. 計算順位分佈 (Placements)
  let rank1 = 0
  let rank2 = 0
  let rank3 = 0

  const calculateMatchRank = (m: typeof matches[0]) => {
    const scores = [
      { id: m.east_id, score: m.east_score },
      { id: m.south_id, score: m.south_score },
      { id: m.west_id, score: m.west_score }
    ].sort((a, b) => b.score - a.score)
    return scores.findIndex(s => s.id === accountId) + 1
  }

  filteredMatches.forEach(m => {
    const rank = calculateMatchRank(m)
    if (rank === 1) rank1++
    else if (rank === 2) rank2++
    else if (rank === 3) rank3++
  })

  // 5. 最近 20 場走勢 (按時間正序供折線圖使用)
  const recent20 = filteredMatches.slice(0, 20).reverse()
  const recentRanks = recent20.map(m => calculateMatchRank(m))

  // ==========================================
  // 6. 單局資料 (paipu_rounds) 分流提純
  // ==========================================

  // 6.1 建立座位映射字典
  const uuidSeatMap = new Map<string, number>()
  filteredMatches.forEach(m => {
    if (!m.uuid) return
    if (m.east_id === accountId) uuidSeatMap.set(m.uuid, 0)
    else if (m.south_id === accountId) uuidSeatMap.set(m.uuid, 1)
    else if (m.west_id === accountId) uuidSeatMap.set(m.uuid, 2)
  })

  // 6.2 劃分目標 UUID 集合
  // 集合 A：用於時間區間內和牌形態的 UUID 集合 (受 dateRange 嚴格控制)
  const scopedUuidSet = new Set<string>(filteredMatches.map(m => m.uuid).filter(Boolean) as string[])
  
  // 集合 B：用於四維雷達的最近對局 (取最新 25 場以覆蓋 100 局)
  const recentUuids = matches.slice(0, 25).map(m => m.uuid).filter(Boolean) as string[]

  // 合併去重，準備向資料庫發起分批查詢
  const allTargetUuids = Array.from(new Set([...scopedUuidSet, ...recentUuids]))

  let allRounds: any[] = []
  if (allTargetUuids.length > 0) {
    // 每次最多查 40 個 UUID，徹底消滅 414 URI Too Long 隱患
    const batches = chunkArray(allTargetUuids, 40)
    const results = await Promise.all(
      batches.map(batch =>
        supabase
          .schema('mahjong')
          .from('paipu_rounds')
          .select('id, paipu_id, won_seat, won_type, win_turn, won_yaku, ron_seat, delta_scores, riichi_status, fulo_status')
          .in('paipu_id', batch)
          .order('id', { ascending: false })
      )
    )

    results.forEach(res => {
      if (res.data) allRounds.push(...res.data)
    })
  }

  // ====================================================================
  // 6.3 管線 A：計算選定時間區間內的「和牌形態 (Win Methods)」
  // ====================================================================
  let riichiWins = 0
  let damaWins = 0
  let fuloWins = 0

  // 嚴格只過濾出屬於 scopedUuidSet（選定區間）的單局
  const scopedPlayerRounds = allRounds.filter(r => scopedUuidSet.has(r.paipu_id))

  scopedPlayerRounds.forEach(r => {
    const mySeat = uuidSeatMap.get(r.paipu_id)
    if (mySeat === undefined) return

    // 只有我贏的局才統計和牌形態
    if (r.won_seat === mySeat) {
      const riichiStatus = Array.isArray(r.riichi_status) ? r.riichi_status : []
      const fuloStatus = Array.isArray(r.fulo_status) ? r.fulo_status : []

      if (riichiStatus[mySeat] === 1) {
        riichiWins++
      } else if (fuloStatus[mySeat] === 1) {
        fuloWins++
      } else {
        damaWins++ // 門清未立直和牌 = 默聽
      }
    }
  })

  console.log(`[WinStyles Debug]
    區間目標場次數: ${scopedUuidSet.size}
    匹配到的區間單局數 (scopedPlayerRounds): ${scopedPlayerRounds.length}
    和牌總計: 立直=${riichiWins}, 默聽=${damaWins}, 副露=${fuloWins}
  `)

  // ====================================================================
  // 6.4 管線 B：計算「四維雷達圖 (Radar Stats)」(滾動取最近 100 / 20 局)
  // ====================================================================
  // 取該選手生涯最新出賽的 100 局單局
  const recentPlayerRounds = allRounds
    .filter(r => uuidSeatMap.has(r.paipu_id))
    .sort((a, b) => b.id - a.id) // 確保由新到舊
    .slice(0, 100)

  let totalWinScore = 0
  let totalWinTurns = 0
  let winCount = 0
  let dealInCount = 0

  recentPlayerRounds.forEach(r => {
    const mySeat = uuidSeatMap.get(r.paipu_id)!
    const deltaScores = Array.isArray(r.delta_scores) ? r.delta_scores : []

    // 防：放銃判定
    if (r.won_type === 'ron' && r.ron_seat === mySeat) {
      dealInCount++
    }

    // 攻與速：和牌得點與巡數
    if (r.won_seat === mySeat) {
      winCount++
      const gainedScore = Number(deltaScores[mySeat]) || 0
      totalWinScore += Math.max(0, gainedScore)

      if (typeof r.win_turn === 'number' && r.win_turn > 0) {
        totalWinTurns += r.win_turn
      }
    }
  })

  const avgAtk = winCount > 0 ? Math.round(totalWinScore / winCount) : 0
  const avgSpd = winCount > 0 ? Number((totalWinTurns / winCount).toFixed(1)) : 0
  const dealInRate = recentPlayerRounds.length > 0
    ? Number(((dealInCount / recentPlayerRounds.length) * 100).toFixed(1))
    : 0

  // 運：取最近 20 局累計和牌役種數
  const recent20Rounds = recentPlayerRounds.slice(0, 20)
  let lukCount = 0

  recent20Rounds.forEach(r => {
    const mySeat = uuidSeatMap.get(r.paipu_id)!
    if (r.won_seat === mySeat && r.won_yaku) {
      if (Array.isArray(r.won_yaku)) {
        lukCount += r.won_yaku.length
      } else if (typeof r.won_yaku === 'object') {
        lukCount += Object.keys(r.won_yaku).length
      }
    }
  })

  // ==========================================
  // 7. 回傳閉環數據合約
  // ==========================================
  return {
    careerBounds: {
      start: earliestYear,
      end: latestYear
    },
    placements: {
      rank1,
      rank2,
      rank3,
      total: filteredMatches.length
    },
    recentRanks,
    radarStats: {
      atk: avgAtk,
      spd: avgSpd,
      def: dealInRate,
      luk: lukCount
    },
    winStyles: {
      riichi: riichiWins,
      dama: damaWins,
      fulo: fuloWins
    }
  }
})