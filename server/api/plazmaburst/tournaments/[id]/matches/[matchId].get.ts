import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
    // 獲取路由參數
    const tournamentId = getRouterParam(event, 'id')
    const matchId = getRouterParam(event, 'matchId')

    if (!tournamentId || !matchId) {
        throw createError({ statusCode: 400, statusMessage: 'Missing ID parameters' })
    }

    const supabase = await serverSupabaseClient(event)

    // 1. 終極關聯查詢 (One Query to Rule Them All)
    const { data: match, error } = await supabase
        .schema('plazmaburst')
        .from('matches')
        .select(`
            id, phase_tag, format, status, red_team_score, blue_team_score, scheduled_at,
            red_team:teams!matches_red_team_id_fkey(id, name, short_sign, colour, logo),
            blue_team:teams!matches_blue_team_id_fkey(id, name, short_sign, colour, logo),
            match_games (
                id, game_number, status, red_team_score, blue_team_score, round_history,
                map:maps(id, name, pb2_map_id, thumbnail_url),
                stats:match_game_stats(
                    player_id, team_id, kills, deaths, headshots, aces,
                    player:players(nickname)
                )
            )
        `)
        .eq('id', matchId)
        .single() // 因為我們是抓單場比賽，直接用 single() 返回物件而不是陣列

    if (error) {
        console.error('Fetch match detail error:', error)
        throw createError({ statusCode: 500, statusMessage: 'Failed to fetch match details' })
    }

    // 2. 數據清洗：讓前端 UI 變成絕對的傻瓜 (Dumb UI)
    
    // 防呆：確保 match_games 是陣列，並且按照 game_number (1, 2, 3) 嚴格排序
    const rawGames = match.match_games || []
    rawGames.sort((a, b) => a.game_number - b.game_number)

    // 輔助函數：計算 KDR，並防禦死亡數為 0 的 Infinity 災難
    const calcKDR = (k: number, d: number) => {
        if (d === 0) return k === 0 ? '0.00' : k.toFixed(2)
        return (k / d).toFixed(2)
    }

    // 輔助函數：清洗單個選手數據
    const formatStat = (s: any) => ({
        id: s.player_id,
        name: s.player?.nickname || 'Unknown',
        kills: s.kills,
        deaths: s.deaths,
        kdr: calcKDR(s.kills, s.deaths),
        headshots: s.headshots,
        aces: s.aces
    })

    const formattedMatch = {
        id: match.id,
        phase: match.phase_tag,
        format: match.format, // 'BO1', 'BO3', 'BO5'
        status: match.status,
        scheduledAt: match.scheduled_at,
        
        // 頂層大比分 (例如 BO3 中的 2:1)
        score: {
            red: match.red_team_score,
            blue: match.blue_team_score
        },
        
        // 隊伍資訊
        redTeam: match.red_team,
        blueTeam: match.blue_team,
        
        // 子地圖戰況列表
        games: rawGames.map(g => {
            const allStats = g.stats || []
            
            // 將選手數據按隊伍分開，並按擊殺數(Kills)降序排列，這是電競榜單的絕對標準
            const redStats = allStats.filter(s => s.team_id === match.red_team.id).map(formatStat).sort((a, b) => b.kills - a.kills)
            const blueStats = allStats.filter(s => s.team_id === match.blue_team.id).map(formatStat).sort((a, b) => b.kills - a.kills)

            return {
                id: g.id,
                gameNumber: g.game_number,
                status: g.status,
                score: { red: g.red_team_score, blue: g.blue_team_score },
                map: g.map || { name: 'TBD', pb2_map_id: 'unknown' },
                roundHistory: g.round_history || [],
                // 直接給前端餵食分類好的乾淨數據
                redTeamStats: redStats,
                blueTeamStats: blueStats
            }
        })
    }

    return formattedMatch
})