import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { calculateMahjongPoints } from '~~/server/utils/mahjongScoreEngine'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: '缺少賽事 ID' })

  const supabase = await serverSupabaseClient<Database>(event)

  // 1. 撈取所有對局 (依結束時間由新到舊排序)
  const { data: matches, error: matchErr } = await supabase
    .schema('mahjong')
    .from('matches')
    .select('*')
    .eq('tournament_bind_id', id)
    .order('end_time', { ascending: false })

  if (matchErr) throw createError({ statusCode: 500, statusMessage: matchErr.message })
  if (!matches || matches.length === 0) return []

  const { data: ruleData } = await supabase
    .schema('mahjong') // 假設你建在 mahjong schema
    .from('rules')
    .select('basepts, uma1, uma2, uma3, uma4')
    .eq('id', id)
    .single()

  // 2. 玩家字典建置 (The String Cast Magic)
  const accountIds = new Set<number>()
  matches.forEach(m => {
    accountIds.add(m.east_id); accountIds.add(m.south_id)
    accountIds.add(m.west_id); if (m.north_id) accountIds.add(m.north_id)
  })

  const { data: participants } = await supabase
    .schema('mahjong')
    .from('participants')
    .select('account_id, nickname, discord_id_str:discord_id::text')
    .in('account_id', Array.from(accountIds))

  const discordIdsStr = participants?.map(p => p.discord_id_str).filter(Boolean) as string[]

  const { data: profiles } = await supabase
    .schema('public')
    .from('participant_data')
    .select('discord_id_str:discord_id::text, discord_username')
    .in('discord_id', discordIdsStr as unknown as number[])

  const playerDict = new Map()
  participants?.forEach(p => {
    const profile = profiles?.find(pr => pr.discord_id_str === p.discord_id_str)
    playerDict.set(p.account_id, p.nickname || profile?.discord_username || `Unknown_${p.account_id}`)
  })

  // 3. 時間格式化工具
  const formatDate = (dateString: string) => {
    const d = new Date(dateString)
    // 轉換成 YYYY-MM-DD HH:mm
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  // 4. 核心資料塑形
  return matches.map(m => {
    // 判斷是否為三麻 (北風位為 null)
    const isSanma = m.north_id === null

    // 抽出有效玩家陣列
    const rawPlayers = [
      { seat: '東', id: m.east_id, score: m.east_score },
      { seat: '南', id: m.south_id, score: m.south_score },
      { seat: '西', id: m.west_id, score: m.west_score }
    ]
    if (!isSanma && m.north_id && m.north_score !== null) {
      rawPlayers.push({ seat: '北', id: m.north_id, score: m.north_score })
    }

    // 建立排名對照表 (為了計算 Uma)
    const sortedScores = [...rawPlayers].sort((a, b) => b.score - a.score)
    const getRank = (score: number) => sortedScores.findIndex(p => p.score === score) + 1

    const players = rawPlayers.map(p => {
      const rank = getRank(p.score)
      const pts = calculateMahjongPoints(p.score, rank, isSanma, ruleData)

      return {
        seat: p.seat,
        name: playerDict.get(p.id),
        score: p.score,
        pts: Number(pts.toFixed(1))
      }
    })

    return {
      id: m.uuid,
      round: `第 ${m.tag} 回合`, // 未來你可以加個資料表來對應 Tag 名稱
      table: `Game ${m.tag}`, 
      time: formatDate(m.end_time),
      paipu_url: `https://game.maj-soul.com/1/?paipu=${m.uuid}`,
      players: players
    }
  })
})