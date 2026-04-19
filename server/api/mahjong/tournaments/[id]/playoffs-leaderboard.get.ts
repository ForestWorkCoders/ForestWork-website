import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { calculateMahjongPoints } from '~~/server/utils/mahjongScoreEngine' // 確保你已經建立了這個共用引擎

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: '缺少賽事 ID' })

  const supabase = await serverSupabaseClient<Database>(event)

  // ==========================================
  // 1. 撈取對局與規則 (Matches & Rules)
  // ==========================================
  const { data: matches, error: matchErr } = await supabase
    .schema('mahjong')
    .from('matches')
    .select('*')
    .eq('tournament_bind_id', id)
    .order('end_time', { ascending: true }) // 確保依照時間正序排列，方便後續發牌譜

  if (matchErr) throw createError({ statusCode: 500, statusMessage: matchErr.message })
  // 如果還沒有任何對局，直接回傳空陣列
  if (!matches || matches.length === 0) return []

  const { data: ruleData } = await supabase
    .schema('mahjong')
    .from('rules')
    .select('basepts, uma1, uma2, uma3, uma4')
    .eq('id', id)
    .single()

  // ==========================================
  // 2. 玩家字典建置 (The String Cast Magic)
  // ==========================================
  const accountIds = new Set<number>()
  matches.forEach(m => {
    if (m.east_id) accountIds.add(m.east_id)
    if (m.south_id) accountIds.add(m.south_id)
    if (m.west_id) accountIds.add(m.west_id)
    if (m.north_id) accountIds.add(m.north_id)
  })

  // 完美避開 JS BigInt 精度遺失的字串轉型
  const { data: participants } = await supabase
    .schema('mahjong')
    .from('participants')
    .select('account_id, nickname, discord_id_str:discord_id::text')
    .in('account_id', Array.from(accountIds))

  const discordIdsStr = participants?.map(p => p.discord_id_str).filter(Boolean) as string[]

  const { data: profiles } = await supabase
    .schema('public')
    .from('participant_data')
    .select('discord_id_str:discord_id::text, discord_username, profile_img')
    .in('discord_id', discordIdsStr as unknown as number[])

  const playerDict = new Map()
  participants?.forEach(p => {
    const profile = profiles?.find(pr => pr.discord_id_str === p.discord_id_str)
    playerDict.set(p.account_id, {
      name: p.nickname || profile?.discord_username || `Unknown_${p.account_id}`,
      avatar: profile?.profile_img || null
    })
  })

  // 時間格式化工具
  const formatDate = (dateString: string) => {
    const d = new Date(dateString)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  // ==========================================
  // 3. 階段定義 (Phase Configuration)
  // ==========================================
  // 這裡定義了 2025 賽制的骨架，API 會依照這個骨架去 matches 裡撈資料

  interface PhaseConfig {
    id: string;
    title: string;
    subtitle: string;
    promotionCount?: number;   // 一般的晉級名額
    promotedRanks?: number[];  // 處理 DQ 順延的指定晉級名次
    isFinal: boolean;
  }

  const { data: tourney } = await supabase
    .schema('mahjong')
    .from('tournaments')
    .select('phase_configs') // ★ 把配置撈出來
    .eq('id', id)
    .single()

  const dbPhaseConfigs = tourney?.phase_configs as PhaseConfig[] | undefined | null

  const phaseConfigs = dbPhaseConfigs || [
    { id: 'A', title: 'Group A', subtitle: 'Group Stage', promotionCount: 1, isFinal: false },
    { id: 'D', title: 'Finals', subtitle: 'Championship', promotionCount: 0, isFinal: true }
  ]

  // ==========================================
  // 4. 核心處理引擎：分組 Map/Reduce
  // ==========================================
  const results = phaseConfigs.map(config => {
    // 篩選出該組的所有對局 (利用我們新加的 group_tag 欄位)
    const groupMatches = matches.filter(m => m.group_tag === config.id)
    
    // 如果這組還沒開始打，直接跳過不渲染
    if (groupMatches.length === 0) return null

    // ★ 防禦性工程：Tag 偏移陷阱重置器 ★
    const uniqueTags = [...new Set(groupMatches.map(m => m.tag))].sort((a, b) => a - b)
    const gameCount = uniqueTags.length // 動態決定這組打了幾局 (3局或4局)

    // 準備排行榜的 Map
    const statsMap = new Map()
    const initPlayer = (accountId: number) => {
      if (!statsMap.has(accountId)) {
        statsMap.set(accountId, {
          account_id: accountId,
          name: playerDict.get(accountId)?.name,
          avatar: playerDict.get(accountId)?.avatar,
          total: 0,
          games: {} as Record<string, number>
        })
      }
      return statsMap.get(accountId)
    }

    // 準備對局明細的陣列
    const formattedMatches: any[] = []

    // 遍歷該組的每一場對局
    groupMatches.forEach(m => {
      // 1. 將絕對 Tag 轉換為相對局數 (解決 5,6,7 變成 1,2,3 的問題)
      const relativeGameIndex = uniqueTags.indexOf(m.tag) + 1

      // 2. 判斷是否為三麻
      const isSanma = m.north_id === null
      const rawPlayers = [
        { seat: '東', id: m.east_id, score: m.east_score },
        { seat: '南', id: m.south_id, score: m.south_score },
        { seat: '西', id: m.west_id, score: m.west_score }
      ]
      if (!isSanma && m.north_id && m.north_score !== null) {
        rawPlayers.push({ seat: '北', id: m.north_id, score: m.north_score })
      }

      // 3. 計算名次 (供共用引擎使用)
      const sortedScores = [...rawPlayers].sort((a, b) => b.score - a.score)
      const getRank = (score: number) => sortedScores.findIndex(p => p.score === score) + 1

      // 4. 結算每個人的分數
      const matchPlayersDetails: any[] = []

      rawPlayers.forEach(p => {
        if (!p.id || p.score === null || p.id === 1) return

        const rank = getRank(p.score)
        
        // ★ 呼叫共用算分引擎，確保全站分數絕對一致 ★
        const pts = calculateMahjongPoints(p.score, rank, isSanma, ruleData)

        // 寫入排行榜 Map
        const pStat = initPlayer(p.id)
        pStat.total += pts
        pStat.games[`game_${relativeGameIndex}`] = pts

        // 寫入單場對局明細
        matchPlayersDetails.push({
          seat: p.seat,
          name: playerDict.get(p.id)?.name,
          score: p.score,
          pts: pts
        })
      })

      // 5. 格式化單場對局物件 (供 MatchCard 使用)
      // 將分數由高到低排序，讓贏家排在最上面
      matchPlayersDetails.sort((a, b) => b.pts - a.pts)
      
      formattedMatches.push({
        id: m.uuid,
        round: `Game ${relativeGameIndex}`, // 顯示相對局數
        time: formatDate(m.end_time),
        paipu_url: `https://game.maj-soul.com/1/?paipu=${m.uuid}`,
        players: matchPlayersDetails
      })
    })

    // 將排行榜 Map 轉成陣列並排序
    const leaderboard = Array.from(statsMap.values())
      .sort((a, b) => b.total - a.total)
      .map((p, index) => {
        const result = {
          ...p,
          ...p.games, // 將 game_1, game_2 展開攤平給 TanStack Table
          rank: index + 1,
          total: Number(p.total.toFixed(1))
        }
        delete result.games
        return result
      })

    // 回傳這個階段 (Phase) 的完整合約
    return {
      ...config,
      id: config.id,
      title: config.title,
      subtitle: config.subtitle,
      gameCount: gameCount, // 讓前端知道要畫幾根柱子
      promotionCount: config.promotionCount, // 讓前端知道前幾名要亮綠燈
      isFinal: config.isFinal, // 讓前端知道這是不是決賽(金銀銅)
      leaderboard: leaderboard,
      matches: formattedMatches.reverse() // 將最新的對局排在最前面
    }
  })

  // 過濾掉還沒開打的 null 組別，回傳給 Vue
  return results.filter(Boolean)
})