import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { calculateMahjongPoints } from '~~/server/utils/mahjongScoreEngine'

// ============================================================================
// 1. 基礎設施層 (Infrastructure Layer) - 永遠不要讓我再看到你 Copy-Paste 這些代碼
// ============================================================================

async function fetchPlayerDict(supabase: any, accountIds: Set<number> | number[]) {
    const idsArray = Array.from(accountIds)
    if (idsArray.length === 0) return new Map()

    const { data: participants } = await supabase
        .schema('mahjong')
        .from('participants')
        .select('account_id, nickname, discord_id_str:discord_id::text')
        .in('account_id', idsArray)

    const discordIdsStr = participants?.map((p: any) => p.discord_id_str).filter(Boolean) as string[]

    const { data: profiles } = await supabase
        .schema('public')
        .from('participant_data')
        .select('discord_id_str:discord_id::text, discord_username, profile_img')
        .in('discord_id', discordIdsStr)

    const playerDict = new Map()
    participants?.forEach((p: any) => {
        const profile = profiles?.find((pr: any) => pr.discord_id_str === p.discord_id_str)
        playerDict.set(p.account_id, {
            name: p.nickname || profile?.discord_username || `Unknown_${p.account_id}`,
            avatar: profile?.profile_img || null
        })
    })
    return playerDict
}

function formatDate(dateString: string) {
    const d = new Date(dateString)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// ============================================================================
// 2. 策略層 (Strategy Engines) - 隔離不同賽制的計算邏輯
// ============================================================================

// 策略 A: 標準賽 & 階段賽 (Standard & Playoffs 共用引擎)
async function processPlayerMatches(matches: any[], ruleData: any, config: any, playerDict: Map<number, any>, dnfThreshold: number) {
    const data: Record<string, any> = {}

    console.log(matches)

    // 遍歷 JSON 裡的 phases (常規賽只有一個 [{id: 'MAIN'}], 階段賽有多個)
    config.phases.forEach((phase: any) => {
        // 如果是常規賽(MAIN)，拿所有對局；如果是階段賽，根據 group_tag 過濾
        const phaseMatches = phase.id === 'MAIN'
            ? matches
            : matches.filter(m => m.group_tag === phase.id)

        if (phaseMatches.length === 0) {
            data[phase.id] = { leaderboard: [], matches: [] }
            return
        }

        const uniqueTags = [...new Set(phaseMatches.map(m => m.tag))].sort((a, b) => a - b)
        const statsMap = new Map()

        const formattedMatches: any[] = []

        phaseMatches.sort((a, b) => a.tag - b.tag).forEach(m => {
            const gameIndex = phase.id === 'MAIN' ? m.tag : (uniqueTags.indexOf(m.tag) + 1)
            const isSanma = m.north_id === null

            const rawPlayers = [
                { seat: '東', id: m.east_id, score: m.east_score },
                { seat: '南', id: m.south_id, score: m.south_score },
                { seat: '西', id: m.west_id, score: m.west_score }
            ]
            if (!isSanma && m.north_id) rawPlayers.push({ seat: '北', id: m.north_id, score: m.north_score })

            const sortedScores = [...rawPlayers].sort((a, b) => b.score - a.score)
            const getRank = (score: number) => sortedScores.findIndex(p => p.score === score) + 1

            const matchPlayersDetails: any[] = []

            rawPlayers.forEach(p => {
                if (!p.id || p.score === null) return

                const rank = getRank(p.score)
                const pts = calculateMahjongPoints(p.score, rank, isSanma, ruleData)

                const playerName = playerDict.get(p.id)?.name || `Unknown_${p.id}`

                matchPlayersDetails.push({ seat: p.seat, name: playerName, score: p.score, pts: pts })

                if (p.id !== 1) {
                    if (!statsMap.has(p.id)) {
                        statsMap.set(p.id, { 
                            account_id: p.id, 
                            name: playerName, 
                            avatar: playerDict.get(p.id)?.avatar, 
                            total: 0, played: 0, games: {} 
                        })
                    }
                    const pStat = statsMap.get(p.id)!
                    pStat.total += pts
                    pStat.played += 1
                    pStat.games[`game_${gameIndex}`] = pts
                }
            })

            // matchPlayersDetails.sort((a, b) => b.pts - a.pts)
            formattedMatches.push({
                id: m.uuid,
                round: `Game ${gameIndex}`,
                time: formatDate(m.end_time),
                paipu_url: `https://game.maj-soul.com/1/?paipu=${m.uuid}`,
                players: matchPlayersDetails
            })
        })

        let leaderboard = Array.from(statsMap.values()).sort((a, b) => b.total - a.total)

        // DNF 處理邏輯 (僅當賽事有設定 dnfThreshold 且大於 0 時生效)
        let rankCounter = 1
        leaderboard = leaderboard.map(p => {
            const isDNF = dnfThreshold > 0 && p.played < dnfThreshold
            const finalRank = isDNF ? 'DNF' : rankCounter++
            const result = { ...p, ...p.games, rank: finalRank, total: Number(p.total.toFixed(1)) }
            delete result.games
            return result
        }).sort((a, b) => {
            if (a.rank === 'DNF' && b.rank !== 'DNF') return 1
            if (a.rank !== 'DNF' && b.rank === 'DNF') return -1
            return 0
        })

        data[phase.id] = {
            leaderboard,
            matches: formattedMatches.reverse() // 新對局在最上面
        }
    })

    return data
}

// 策略 B: 隊伍接力賽引擎 (Relay Engine)
async function processTeamMatches(supabase: any, tournamentId: string, matches: any[], ruleData: any, config: any, playerDict: Map<number, any>) {
    const { data: teams } = await supabase.schema('mahjong').from('tourney_teams').select('*').eq('tournament_id', tournamentId)
    const { data: tourneyPlayers } = await supabase.schema('mahjong').from('tourney_players').select('*').in('team_id', teams?.map((t: any) => t.id) || [])

    const playerToTeamMap = new Map()
    tourneyPlayers?.forEach((tp: any) => {
        const team = teams?.find((t: any) => t.id === tp.team_id)
        if (team) playerToTeamMap.set(tp.player_id, team)
    })

    const data: Record<string, any> = {}

    config.phases.forEach((phase: any) => {
        const phaseMatches = matches.filter(m => m.group_tag === phase.id)
        if (phaseMatches.length === 0) {
            data[phase.id] = { leaderboard: [], matches: [] }
            return
        }

        const statsMap = new Map()
        const formattedMatches: any[] = []

        phaseMatches.sort((a, b) => a.tag - b.tag).forEach(m => {
            const isSanma = m.north_id === null
            const rawPlayers = [
                { seat: '東', id: m.east_id, score: m.east_score },
                { seat: '南', id: m.south_id, score: m.south_score },
                { seat: '西', id: m.west_id, score: m.west_score }
            ]
            if (!isSanma && m.north_id) rawPlayers.push({ seat: '北', id: m.north_id, score: m.north_score })

            const sortedScores = [...rawPlayers].sort((a, b) => b.score - a.score)
            const getRank = (score: number) => sortedScores.findIndex(p => p.score === score) + 1
            const matchPlayersDetails: any[] = []

            rawPlayers.forEach(p => {
                if (!p.id || p.score === null || p.id === 1) return
                const team = playerToTeamMap.get(p.id)
                if (!team) return

                if (!statsMap.has(team.id)) {
                    statsMap.set(team.id, {
                        team_id: team.id, name: team.name, avatar: team.logo,
                        total: 0, last_score: ruleData?.basepts ?? 25000, games: {}
                    })
                }
                const tStat = statsMap.get(team.id)!
                const rank = getRank(p.score)

                const dynamicRuleData = { ...ruleData, basepts: tStat.last_score }
                const pts = calculateMahjongPoints(p.score, rank, isSanma, dynamicRuleData)

                tStat.last_score = p.score
                tStat.total += pts
                tStat.games[`game_${m.tag}`] = (tStat.games[`game_${m.tag}`] || 0) + pts

                matchPlayersDetails.push({ seat: p.seat, name: playerDict.get(p.id)?.name, score: p.score, pts: pts })
            })

            // matchPlayersDetails.sort((a, b) => b.pts - a.pts)
            formattedMatches.push({
                id: m.uuid,
                round: `Game ${m.tag}`,
                time: formatDate(m.end_time),
                paipu_url: `https://game.maj-soul.com/1/?paipu=${m.uuid}`,
                players: matchPlayersDetails
            })
        })

        const leaderboard = Array.from(statsMap.values())
            .sort((a, b) => b.total - a.total)
            .map((t, index) => {
                const result = { ...t, ...t.games, rank: index + 1, total: Number(t.total.toFixed(1)) }
                delete result.games
                return result
            })

        data[phase.id] = { leaderboard, matches: formattedMatches }
    })

    return data
}


// ============================================================================
// 3. 主控制器 (The Controller)
// ============================================================================
export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')
    if (!id) throw createError({ statusCode: 400, statusMessage: '缺少賽事 ID' })

    const supabase = await serverSupabaseClient<Database>(event)

    // 1. 拿取賽事基礎設定與完美 JSON 契約
    const { data: tourney } = await supabase
        .schema('mahjong')
        .from('tournaments')
        .select('format, dnfThreshold, phase_configs, created_at')
        .eq('id', id)
        .single()

    if (!tourney) throw createError({ statusCode: 404, statusMessage: '賽事不存在' })

    // 2. 拿取共用數據 (Matches & Rules)
    const { data: matches } = await supabase
        .schema('mahjong')
        .from('matches')
        .select('*')
        .eq('tournament_bind_id', id)
        .order('end_time', { ascending: true })

    const { data: ruleData } = await supabase
        .schema('mahjong')
        .from('rules')
        .select('basepts, uma1, uma2, uma3, uma4')
        .eq('id', id)
        .single()

    let config: any = { entity_type: 'player', columns: [], phases: [] }

    if (tourney.phase_configs) {
        // 如果有特殊配置，听配置的
        config = typeof tourney.phase_configs === 'string'
            ? JSON.parse(tourney.phase_configs)
            : tourney.phase_configs
    } else {
        // ★ Linus 智能兜底：如果資料庫是 null，自動產生完美常規賽配置 ★

        // 1. 偷看對局紀錄，找出總共打了幾局 (最大 tag)
        const validTags = matches?.map(m => Number(m.tag)).filter(n => !isNaN(n)) || []
        const totalGames = validTags.length > 0 ? Math.max(...validTags) : 16 // 如果還沒打，預設給 16 局

        // 2. 自動生成 G1, G2, G3... 的表頭合約
        const autoColumns = Array.from({ length: totalGames }, (_, i) => ({
            key: `game_${i + 1}`,
            label: `G${i + 1}`
        }))

        // 3. 虛擬出一個標準的 "MAIN" 階段
        config = {
            entity_type: 'player',
            columns: autoColumns,
            phases: [
                {
                    id: 'MAIN',
                    title: '總積分榜',
                    subtitle: 'Leaderboard',
                    is_final: true,
                    promoted_ranks: [],
                    disqualified_ranks: []
                }
            ]
        }
    }

    // 3. 收集所有相關帳號，建立唯一玩家字典
    const accountIds = new Set<number>()
    matches?.forEach(m => {
        if (m.east_id) accountIds.add(m.east_id)
        if (m.south_id) accountIds.add(m.south_id)
        if (m.west_id) accountIds.add(m.west_id)
        if (m.north_id) accountIds.add(m.north_id)
    })
    const playerDict = await fetchPlayerDict(supabase, accountIds)

    // 4. 路由到正確的計算引擎
    let dashboardData = {}

    if (config.entity_type === 'team' || tourney.format === 'relay') {
        // Relay 走隊伍加總與繼承引擎
        dashboardData = await processTeamMatches(supabase, id, matches || [], ruleData, config, playerDict)
    } else {
        // Standard / Playoffs 走標準玩家計算引擎
        const dnfThreshold = tourney.dnfThreshold || 0
        dashboardData = await processPlayerMatches(matches || [], ruleData, config, playerDict, dnfThreshold)
    }

    // 5. 吐出完美的、前端最喜歡的形狀
    return {
        config: config,
        data: dashboardData
    }
})