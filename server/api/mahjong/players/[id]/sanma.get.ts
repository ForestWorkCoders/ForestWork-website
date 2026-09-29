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

// ==========================================
// 役種解析與稱謂輔助函式 (純函數，注入資料庫字典)
// ==========================================
const YAKUMAN_IDS = new Set([
  35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45
])
const DOUBLE_YAKUMAN_IDS = new Set([47, 48, 49, 50])

interface YakuItem {
  name: string
  han: number
  isYakuman: boolean
  label: string
}

function parseWonYaku(rawYaku: any, yakuMap: Map<number, string>): YakuItem[] {
  if (!rawYaku) return []
  let parsed = rawYaku

  // 防禦性解析：若資料庫吐出未反序列化的 JSON 字串
  if (typeof rawYaku === 'string') {
    try {
      parsed = JSON.parse(rawYaku)
    } catch {
      return []
    }
  }

  const items: YakuItem[] = []

  // 情況 1：若是陣列結構 [{ id, val }, ...] 或 [{ name, val }, ...]
  if (Array.isArray(parsed)) {
    parsed.forEach(y => {
      if (typeof y === 'object' && y !== null) {
        const id = Number(y.id || y.yaku_id)
        const name = yakuMap.get(id) || y.name || `役種_${id}`
        const isYakuman = YAKUMAN_IDS.has(id) || name.includes('役滿') || name === '四暗刻' || name === '大三元' || name === '國士無雙'
        const isDouble = DOUBLE_YAKUMAN_IDS.has(id) || name.includes('雙倍') || name.includes('單騎') || name.includes('十三面')

        const rawVal = Number(y.val || y.han || y.count || 1)
        const han = isYakuman ? (isDouble ? 26 : 13) : rawVal
        const label = isYakuman ? (isDouble ? '雙倍役滿' : '役滿') : `${han} 番`

        items.push({ name, han, isYakuman, label })
      }
    })
  }
  // 情況 2：若是鍵值物件 { "34": 1, "2": 1 } 或 { "四暗刻": 1 }
  else if (typeof parsed === 'object' && parsed !== null) {
    Object.entries(parsed).forEach(([k, v]) => {
      const numericKey = Number(k)
      const name = !isNaN(numericKey) && yakuMap.has(numericKey)
        ? yakuMap.get(numericKey)!
        : k

      const isYakuman = YAKUMAN_IDS.has(numericKey) || name.includes('役滿') || name === '四暗刻' || name === '大三元' || name === '國士無雙'
      const isDouble = DOUBLE_YAKUMAN_IDS.has(numericKey) || name.includes('雙倍') || name.includes('單騎') || name.includes('十三面')

      const rawVal = Number(v) || 1
      const han = isYakuman ? (isDouble ? 26 : 13) : rawVal
      const label = isYakuman ? (isDouble ? '雙倍役滿' : '役滿') : `${han} 番`

      items.push({ name, han, isYakuman, label })
    })
  }

  return items
}

function getHandTitle(totalHan: number, score: number, yakus: YakuItem[]): string {
  // 1. 純役滿判定：只要存在役滿役，絕不計算普通番數！
  const yakumanYakus = yakus.filter(y => y.isYakuman)
  if (yakumanYakus.length > 0) {
    // 累計役滿倍數 (例如大四喜雙倍=2，四暗刻=1)
    const multiplier = yakumanYakus.reduce((sum, y) => sum + (y.label.includes('雙倍') ? 2 : 1), 0)
    if (multiplier === 1) return '役滿'
    if (multiplier === 2) return '雙倍役滿'
    return `${multiplier}倍役滿`
  }

  // 2. 常規番數手牌判定
  if (totalHan >= 13) return `${totalHan} 番 · 累計役滿`
  if (totalHan >= 11) return `${totalHan} 番 · 三倍滿`
  if (totalHan >= 8) return `${totalHan} 番 · 倍滿`
  if (totalHan >= 6) return `${totalHan} 番 · 跳滿`
  if (totalHan >= 5 || score >= 8000) return `${totalHan} 番 · 滿貫`
  return `${totalHan} 番`
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
  const excludeInvitational = query.exclude_invitational === 'true'
  const excludeGroup = query.exclude_group === 'true'

  const supabase = await serverSupabaseClient<Database>(event)

  // ==========================================
  // 1. 查詢選手所有三麻對局 (north_id IS NULL)
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

  const matches = (allSanmaMatches || []) as any[]

  // ==========================================
  // 1.1 批次查詢賽事字典與役種繁體中文維度表 (Promise.all 併發)
  // ==========================================
  const [tourneyRes, yakuDictRes] = await Promise.all([
    supabase
      .schema('mahjong')
      .from('tournaments')
      .select('id, format, title'),
    supabase
      .schema('mahjong')
      .from('paipu_yaku_dict')
      .select('id, name_chs_t')
  ])

  const tourneyMap = new Map((tourneyRes.data || []).map(t => [String(t.id).toLowerCase(), t]))
  const yakuMap = new Map<number, string>(
    (yakuDictRes.data || []).map(y => [Number(y.id), y.name_chs_t])
  )

  // 1.2 特殊賽制前置排除
  const eligibleMatches = matches.filter(m => {
    const rawTourneyId = String(m.tournament_bind_id || '').toLowerCase()
    const tourney = rawTourneyId ? tourneyMap.get(rawTourneyId) : null

    const isInvitational = tourney?.format === 'invitational' || (tourney?.title && tourney.title.includes('邀請賽'))
    const isGroup = Boolean(m.group_tag && String(m.group_tag).trim() !== '') || tourney?.format === 'relay'

    if (excludeInvitational && isInvitational) return false
    if (excludeGroup && isGroup) return false
    return true
  })

  // 2. 生涯真實物理邊界
  let earliestYear = '2023-01'
  let latestYear = '2026-12'
  const dates = eligibleMatches
    .map(m => m.start_time)
    .filter((d): d is string => typeof d === 'string' && d.length >= 7)
    .sort()

  const firstDate = dates[0]
  const lastDate = dates[dates.length - 1]
  if (firstDate && lastDate) {
    earliestYear = firstDate.slice(0, 7)
    latestYear = lastDate.slice(0, 7)
  }

  // 3. 時間區間過濾對局
  const filteredMatches = eligibleMatches.filter(m => {
    if (!m.start_time) return false
    const matchMonth = m.start_time.slice(0, 7)
    if (startMonth && matchMonth < startMonth) return false
    if (endMonth && matchMonth > endMonth) return false
    return true
  })

  // 4. 計算順位分佈、宏觀指標與時間戳字典
  let rank1 = 0
  let rank2 = 0
  let rank3 = 0
  let totalRankSum = 0
  let tobuCount = 0
  const matchDateMap = new Map<string, string>()

  const calculateMatchRankAndScore = (m: typeof matches[0]) => {
    const scores = [
      { id: m.east_id, score: m.east_score },
      { id: m.south_id, score: m.south_score },
      { id: m.west_id, score: m.west_score }
    ].sort((a, b) => b.score - a.score)

    const rank = scores.findIndex(s => s.id === accountId) + 1
    const myScoreObj = scores.find(s => s.id === accountId)
    return { rank, myScore: myScoreObj ? myScoreObj.score : 0 }
  }

  // 建立時間戳字典 (移到全域，一次性填充)
  matches.forEach(m => {
    if (m.uuid && m.start_time) {
      const d = new Date(m.start_time)
      const formatted = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      matchDateMap.set(m.uuid, formatted)
    }
  })

  filteredMatches.forEach(m => {
    const { rank, myScore } = calculateMatchRankAndScore(m)
    totalRankSum += rank
    if (rank === 1) rank1++
    else if (rank === 2) rank2++
    else if (rank === 3) rank3++

    if (myScore !== null && myScore < 0) {
      tobuCount++
    }
  })

  // 5. 最近 20 場走勢
  const recent20 = eligibleMatches.slice(0, 20).reverse()
  const recentRanks = recent20.map(m => calculateMatchRankAndScore(m).rank)

  // ==========================================
  // 6. 單局資料 (paipu_rounds) 分流提純
  // ==========================================
  const uuidSeatMap = new Map<string, number>()
  eligibleMatches.forEach(m => {
    if (!m.uuid) return
    if (m.east_id === accountId) uuidSeatMap.set(m.uuid, 0)
    else if (m.south_id === accountId) uuidSeatMap.set(m.uuid, 1)
    else if (m.west_id === accountId) uuidSeatMap.set(m.uuid, 2)
  })

  const scopedUuidSet = new Set<string>(filteredMatches.map(m => m.uuid).filter(Boolean) as string[])
  const recentUuids = eligibleMatches.slice(0, 25).map(m => m.uuid).filter(Boolean) as string[]
  const allTargetUuids = Array.from(new Set([...scopedUuidSet, ...recentUuids]))

  let allRounds: any[] = []
  if (allTargetUuids.length > 0) {
    const batches = chunkArray(allTargetUuids, 40)
    const results = await Promise.all(
      batches.map(batch =>
        supabase
          .schema('mahjong')
          .from('paipu_rounds')
          .select('id, paipu_id, won_seat, won_type, win_turn, won_yaku, ron_seat, delta_scores, riichi_status, fulo_status, draw_tenpai')
          .in('paipu_id', batch)
          .order('id', { ascending: false })
      )
    )
    results.forEach(res => {
      if (res.data) allRounds.push(...res.data)
    })
  }

  // ====================================================================
  // 6.1 核心好品味：單次 O(N) 遍歷完成基礎矩陣、三聯姿態、最大大牌/痛銃追蹤
  // ====================================================================
  const scopedPlayerRounds = allRounds.filter(r => scopedUuidSet.has(r.paipu_id))
  const totalRounds = scopedPlayerRounds.length

  let winCount = 0
  let tsumoCount = 0
  let dealInCount = 0
  let totalWinScore = 0
  let totalDealInScore = 0
  let totalWinTurns = 0

  let riichiRoundCount = 0
  let fuloRoundCount = 0
  let drawRoundCount = 0
  let drawTenpaiRoundCount = 0

  // 姿態 1：和牌時狀態
  let winRiichi = 0
  let winFulo = 0
  let winDama = 0

  // 姿態 2：放銃時自身狀態
  let dealInSelfRiichi = 0
  let dealInSelfFulo = 0
  let dealInSelfMenzen = 0

  // 姿態 3：放銃至對象狀態
  let dealInToRiichi = 0
  let dealInToFulo = 0
  let dealInToDama = 0

  // ★ 移至外層：高光大牌與痛銃追蹤指針
  let maxWinRound: any = null
  let maxWinScore = -1

  let maxDealInRound: any = null
  let maxDealInScore = -1

  scopedPlayerRounds.forEach(r => {
    const mySeat = uuidSeatMap.get(r.paipu_id)
    if (mySeat === undefined) return

    const deltaScores = Array.isArray(r.delta_scores) ? r.delta_scores : []
    const riichiStatus = Array.isArray(r.riichi_status) ? r.riichi_status : []
    const fuloStatus = Array.isArray(r.fulo_status) ? r.fulo_status : []
    const drawTenpai = Array.isArray(r.draw_tenpai) ? r.draw_tenpai : []

    const isMyRiichi = riichiStatus[mySeat] === 1
    const isMyFulo = fuloStatus[mySeat] === 1

    if (isMyRiichi) riichiRoundCount++
    if (isMyFulo) fuloRoundCount++

    // 流局與聽牌判定
    if (r.won_type === 'draw') {
      drawRoundCount++
      if (drawTenpai[mySeat] === 1) {
        drawTenpaiRoundCount++
      }
    }

    // 和牌判定
    if (r.won_seat === mySeat) {
      winCount++
      if (r.won_type === 'zimo') tsumoCount++

      const gained = Number(deltaScores[mySeat]) || 0
      totalWinScore += Math.max(0, gained)

      if (typeof r.win_turn === 'number' && r.win_turn > 0) {
        totalWinTurns += r.win_turn
      }

      // 和牌姿態
      if (isMyRiichi) winRiichi++
      else if (isMyFulo) winFulo++
      else winDama++

      // ★ 順手追蹤生涯最大和牌
      if (gained > maxWinScore) {
        maxWinScore = gained
        maxWinRound = r
      }
    }

    // 放銃判定 (榮和且放銃座是我)
    if (r.won_type === 'ron' && r.ron_seat === mySeat) {
      dealInCount++
      const lost = Math.abs(Number(deltaScores[mySeat]) || 0)
      totalDealInScore += lost

      // 放銃時自身姿態
      if (isMyRiichi) dealInSelfRiichi++
      else if (isMyFulo) dealInSelfFulo++
      else dealInSelfMenzen++

      // 放銃至對手姿態
      const winnerSeat = r.won_seat
      if (winnerSeat !== null && winnerSeat !== undefined) {
        if (riichiStatus[winnerSeat] === 1) dealInToRiichi++
        else if (fuloStatus[winnerSeat] === 1) dealInToFulo++
        else dealInToDama++
      }

      // ★ 順手追蹤最近最大痛銃
      if (lost > maxDealInScore) {
        maxDealInScore = lost
        maxDealInRound = r
      }
    }
  })

  // 格式化大牌資料包
  const formatMajorHand = (targetRound: any, isDealIn: boolean) => {
    if (!targetRound) return null
    const mySeat = uuidSeatMap.get(targetRound.paipu_id)!
    const deltaScores = Array.isArray(targetRound.delta_scores) ? targetRound.delta_scores : []
    const rawScore = Number(deltaScores[isDealIn ? targetRound.won_seat : mySeat]) || 0
    const score = Math.abs(rawScore)

    const yakus = parseWonYaku(targetRound.won_yaku, yakuMap)
    const totalHan = yakus.reduce((sum, y) => sum + y.han, 0)
    const title = getHandTitle(totalHan, score, yakus)
    const date = matchDateMap.get(targetRound.paipu_id) || '未知時間'

    return {
      paipuId: targetRound.paipu_id,
      date,
      score,
      totalHan,
      title,
      yakus
    }
  }

  // ★ 在 Handler 作用域內標準生成 majorHands
  const majorHands = {
    biggestWin: formatMajorHand(maxWinRound, false),
    biggestDealIn: formatMajorHand(maxDealInRound, true)
  }

  // 安全計算百分比助手
  const calcPct = (num: number, den: number) => den > 0 ? Number(((num / den) * 100).toFixed(2)) : 0

  const basicStats = {
    matchesCount: filteredMatches.length,
    totalRounds,
    avgRank: filteredMatches.length > 0 ? (totalRankSum / filteredMatches.length).toFixed(3) : '0.000',
    bustingRate: calcPct(tobuCount, filteredMatches.length),
    winRate: calcPct(winCount, totalRounds),
    dealInRate: calcPct(dealInCount, totalRounds),
    tsumoRate: calcPct(tsumoCount, winCount),
    damaRate: calcPct(winDama, totalRounds),
    callRate: calcPct(fuloRoundCount, totalRounds),
    riichiRate: calcPct(riichiRoundCount, totalRounds),
    drawRate: calcPct(drawRoundCount, totalRounds),
    drawTenpaiRate: calcPct(drawTenpaiRoundCount, drawRoundCount),
    avgWinScore: winCount > 0 ? Math.round(totalWinScore / winCount) : 0,
    avgDealInScore: dealInCount > 0 ? Math.round(totalDealInScore / dealInCount) : 0,
    avgWinTurn: winCount > 0 ? Number((totalWinTurns / winCount).toFixed(2)) : 0
  }

  // ====================================================================
  // 6.2 四維作風指標 (滾動取最新 100 局)
  // ====================================================================
  const recentPlayerRounds = allRounds
    .filter(r => uuidSeatMap.has(r.paipu_id))
    .sort((a, b) => b.id - a.id)
    .slice(0, 100)

  let rollingWinScore = 0
  let rollingWinTurns = 0
  let rollingWinCount = 0
  let rollingDealInCount = 0

  recentPlayerRounds.forEach(r => {
    const mySeat = uuidSeatMap.get(r.paipu_id)!
    const deltaScores = Array.isArray(r.delta_scores) ? r.delta_scores : []

    if (r.won_type === 'ron' && r.ron_seat === mySeat) rollingDealInCount++
    if (r.won_seat === mySeat) {
      rollingWinCount++
      rollingWinScore += Math.max(0, Number(deltaScores[mySeat]) || 0)
      if (typeof r.win_turn === 'number' && r.win_turn > 0) {
        rollingWinTurns += r.win_turn
      }
    }
  })

  const avgAtk = rollingWinCount > 0 ? Math.round(rollingWinScore / rollingWinCount) : 0
  const avgSpd = rollingWinCount > 0 ? Number((rollingWinTurns / rollingWinCount).toFixed(1)) : 0
  const dealInRate = recentPlayerRounds.length > 0
    ? Number(((rollingDealInCount / recentPlayerRounds.length) * 100).toFixed(1))
    : 0

  const recent20Rounds = recentPlayerRounds.slice(0, 20)
  let lukCount = 0
  recent20Rounds.forEach(r => {
    const mySeat = uuidSeatMap.get(r.paipu_id)!
    if (r.won_seat === mySeat && r.won_yaku) {
      if (Array.isArray(r.won_yaku)) lukCount += r.won_yaku.length
      else if (typeof r.won_yaku === 'object' && r.won_yaku !== null) lukCount += Object.keys(r.won_yaku).length
    }
  })

  // ====================================================================
  // 6.3 最常同桌對手統計 (Frequent Opponents)
  // ====================================================================
  const opponentCountMap = new Map<number, number>()

  filteredMatches.forEach(m => {
    const seatIds = [m.east_id, m.south_id, m.west_id]
    seatIds.forEach(id => {
      const oppId = Number(id)
      if (oppId && oppId !== accountId) {
        opponentCountMap.set(oppId, (opponentCountMap.get(oppId) || 0) + 1)
      }
    })
  })

  const sortedOpponentEntries = Array.from(opponentCountMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)

  const topOpponentIds = sortedOpponentEntries.map(([id]) => id)

  let frequentOpponents: Array<{ accountId: number; nickname: string; count: number; rate: number }> = []

  if (topOpponentIds.length > 0) {
    const { data: opponentProfiles } = await supabase
      .schema('mahjong')
      .from('participants')
      .select('account_id, nickname')
      .in('account_id', topOpponentIds)

    const nameMap = new Map((opponentProfiles || []).map(p => [p.account_id, p.nickname]))

    const matchTotal = filteredMatches.length
    frequentOpponents = sortedOpponentEntries.map(([oppId, count]) => ({
      accountId: oppId,
      nickname: nameMap.get(oppId) || `選手_${oppId}`,
      count,
      rate: matchTotal > 0 ? Number(((count / matchTotal) * 100).toFixed(2)) : 0
    }))
  }

  // ==========================================
  // 7. 回傳閉環數據合約
  // ==========================================
  return {
    careerBounds: { start: earliestYear, end: latestYear },
    basicStats,
    placements: { rank1, rank2, rank3, total: filteredMatches.length },
    recentRanks,
    radarStats: { atk: avgAtk, spd: avgSpd, def: dealInRate, luk: lukCount },
    winStyles: { riichi: winRiichi, dama: winDama, fulo: winFulo },
    dealInStyles: { riichi: dealInSelfRiichi, fulo: dealInSelfFulo, menzen: dealInSelfMenzen },
    dealInTargetStyles: { riichi: dealInToRiichi, fulo: dealInToFulo, dama: dealInToDama },
    frequentOpponents,
    majorHands
  }
})