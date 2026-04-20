import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { calculateMahjongPoints } from '~~/server/utils/mahjongScoreEngine'

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')
    if (!id) throw createError({ statusCode: 400, statusMessage: '缺少賽事 ID' })

    const supabase = await serverSupabaseClient<Database>(event)

    // 1. 撈取對局、規則、以及 Phase Configs
    const { data: matches } = await supabase.schema('mahjong').from('matches').select('*').eq('tournament_bind_id', id).order('end_time', { ascending: true })
    const { data: ruleData } = await supabase.schema('mahjong').from('rules').select('basepts, uma1, uma2, uma3, uma4').eq('id', id).single()
    const { data: tourney } = await supabase.schema('mahjong').from('tournaments').select('phase_configs').eq('id', id).single()

    let phaseConfigs: any[] = []
    let rawConfig = tourney?.phase_configs

    if (typeof rawConfig === 'string') {
        try { rawConfig = JSON.parse(rawConfig) } catch (e) { rawConfig = {} }
    }

    if (rawConfig && typeof rawConfig === 'object' && !Array.isArray(rawConfig)) {
        // ★ 關鍵魔法：型別斷言。告訴 TS 把它當作一個普通的物件來讀取
        const configObj = rawConfig as Record<string, any>

        if (Array.isArray(configObj.stages)) {
            // 🎯 命中最新資料結構
            phaseConfigs = configObj.stages
        } else {
            // 相容其他物件格式
            phaseConfigs = Object.values(configObj)
        }
    } else if (Array.isArray(rawConfig)) {
        // 相容舊版的純陣列結構
        phaseConfigs = rawConfig
    }

    // ★ 新增：跨 Schema 撈取玩家資料 (建立 playerDict) ★
    const accountIds = new Set<number>()
    matches?.forEach(m => {
        if (m.east_id) accountIds.add(m.east_id)
        if (m.south_id) accountIds.add(m.south_id)
        if (m.west_id) accountIds.add(m.west_id)
        if (m.north_id) accountIds.add(m.north_id)
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

    // ★ 2. 隊伍賽核心：撈取隊伍與隊員資料 ★
    const { data: teams } = await supabase.schema('mahjong').from('tourney_teams').select('*').eq('tournament_id', id)
    const { data: tourneyPlayers } = await supabase.schema('mahjong').from('tourney_players').select('*').in('team_id', teams?.map(t => t.id) || [])

    // 建立「選手 -> 隊伍」的快速對照表
    const playerToTeamMap = new Map()
    tourneyPlayers?.forEach(tp => {
        const team = teams?.find(t => t.id === tp.team_id)
        if (team) playerToTeamMap.set(tp.player_id, team)
    })

    // 3. 處理階段資料 (防彈版)
    const results = phaseConfigs.map(config => {
        const groupMatches = matches?.filter(m => m.group_tag === config.id) || []
        // ★ 修復殺手1：如果沒比賽，回傳空殼階段，讓前端能畫出標題！
        if (groupMatches.length === 0) {
            return {
                ...config,
                id: config.id,
                title: config.title,
                subtitle: config.subtitle,
                gameCount: 0,
                isFinal: config.isFinal,
                leaderboard: [], // 空的排行榜
                matches: []
            }
        }

        const uniqueTags = [...new Set(groupMatches.map(m => m.tag))].sort((a, b) => a - b)
        const gameCount = uniqueTags.length

        // ★ 修復殺手2：使用 Team ID 作為統計的 Key
        const statsMap = new Map()
        const initTeam = (teamId: string, teamData: any) => {
            if (!statsMap.has(teamId)) {
                statsMap.set(teamId, {
                    team_id: teamId,
                    name: teamData.name,
                    avatar: teamData.logo, // 使用隊伍 Logo
                    total: 0,
                    last_score: ruleData?.basepts ?? 25000,
                    games: {} as Record<string, number>
                })
            }
            return statsMap.get(teamId)
        }

        const formattedMatches: any[] = []

        groupMatches.sort((a, b) => a.tag - b.tag).forEach(m => {
            const gameIndex = m.tag
            const isSanma = m.north_id === null
            const rawPlayers = [
                { seat: '東', id: m.east_id, score: m.east_score },
                { seat: '南', id: m.south_id, score: m.south_score },
                { seat: '西', id: m.west_id, score: m.west_score }
            ]
            if (!isSanma && m.north_id && m.north_score !== null) rawPlayers.push({ seat: '北', id: m.north_id, score: m.north_score })

            const sortedScores = [...rawPlayers].sort((a, b) => b.score - a.score)
            const getRank = (score: number) => sortedScores.findIndex(p => p.score === score) + 1
            const matchPlayersDetails: any[] = []

            rawPlayers.forEach(p => {
                if (!p.id || p.score === null || p.id === 1) return

                // 找出這個選手屬於哪個隊伍
                const team = playerToTeamMap.get(p.id)
                // 如果這個人沒有所屬隊伍 (可能是傭兵或路人)，就略過不計入隊伍分數
                if (!team) return

                // ★ 分數加在「隊伍」身上 ★
                const tStat = initTeam(team.id, team)
                const rank = getRank(p.score)

                const dynamicRuleData = {
                    ...ruleData,
                    basepts: tStat.last_score,
                    uma1: ruleData?.uma1 ?? null,
                    uma2: ruleData?.uma2 ?? null,
                    uma3: ruleData?.uma3 ?? null,
                    uma4: ruleData?.uma4 ?? null,
                }

                const pts = calculateMahjongPoints(p.score, rank, isSanma, dynamicRuleData)

                // ★ 4. 交接接力棒：把這一局打完的最終分數，寫回 last_score 供下一棒使用
                tStat.last_score = p.score 

                // 寫入總分與各局分數
                tStat.total += pts

                // 如果同一個隊伍在同一局派出兩個人(基本上不可能)，分數會累加
                tStat.games[`game_${gameIndex}`] = (tStat.games[`game_${gameIndex}`] || 0) + pts
                const playerName = playerDict.get(p.id)?.name || `Unknown_${p.id}`

                matchPlayersDetails.push({ seat: p.seat, name: playerName, score: p.score, pts: pts })
            })

            matchPlayersDetails.sort((a, b) => b.pts - a.pts)
            formattedMatches.push({
                id: m.uuid,
                round: gameIndex === 1 ? '先鋒戰' : gameIndex === 2 ? '中堅戰' : gameIndex === 3 ? '大將戰' : `Game ${gameIndex}`,
                time: m.end_time,
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

        return {
            ...config,
            gameCount: gameCount,
            leaderboard: leaderboard,
            matches: formattedMatches
        }
    })

    // 這次不再過濾掉空階段了！全部回傳給前端渲染！
    return results.filter(Boolean)
})