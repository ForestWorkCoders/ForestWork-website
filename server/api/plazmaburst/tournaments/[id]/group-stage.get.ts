import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
    const tournamentId = getRouterParam(event, 'id')
    if (!tournamentId) throw createError({ statusCode: 400, statusMessage: 'Tournament ID required' })

    const supabase = await serverSupabaseClient(event)

    // 1. 獲取所有小組賽 (假設 phase_tag 以 'Week' 或 'Group' 開頭)
    const { data: matches, error } = await supabase
        .schema('plazmaburst')
        .from('matches')
        .select(`
            id,
            phase_tag,
            status,
            red_team_score,
            blue_team_score,
            scheduled_at,
            red_team:teams!matches_red_team_id_fkey(id, name, logo, short_sign, colour),
            blue_team:teams!matches_blue_team_id_fkey(id, name, logo, short_sign, colour)
        `)
        .eq('tournament_id', tournamentId)
        .is('bracket_position', null)
        .order('scheduled_at', { ascending: true })

    if (error) throw createError({ statusCode: 500, statusMessage: error.message })

    // 2. 初始化積分榜字典 (確保所有參賽隊伍都在榜單上，即使還沒打過比賽)
    const standingsMap: Record<string, any> = {}

    // 初始化輔助函數
    const initTeam = (team: any) => {
        if (!team || standingsMap[team.id]) return
        standingsMap[team.id] = {
            id: team.id, name: team.name, short_sign: team.short_sign, colour: team.colour, logo: team.logo,
            pld: 0, w: 0, d: 0, l: 0, pts: 0, diff: 0
        }
    }

    // 3. 處理賽程分組與積分計算 (The Engine)
    const roundsMap: Record<string, any[]> = {}


    for (const match of matches || []) {
        // --- 處理賽程列表 (Rounds) ---
        const phase = match.phase_tag || 'Uncategorized'

        if (!roundsMap[phase]) {
            roundsMap[phase] = []
        }

        roundsMap[phase].push({
            // ... 裡面保持原樣
            id: match.id,
            teamA: match.red_team?.short_sign || match.red_team?.name,
            teamB: match.blue_team?.short_sign || match.blue_team?.name,
            colorA: match.red_team?.colour,
            colorB: match.blue_team?.colour,
            scoreA: match.red_team_score,
            scoreB: match.blue_team_score,
            status: match.status
        })

        // --- 處理積分榜 (Standings) ---
        initTeam(match.red_team)
        initTeam(match.blue_team)

        const tRed = standingsMap[match.red_team?.id]
        const tBlue = standingsMap[match.blue_team?.id]

        // 只有已完賽或棄權的比賽才計入積分榜
        if (match.status === 'Completed' || match.status === 'Draw') {
            tRed.pld++; tBlue.pld++;
            const diffRed = (match.red_team_score || 0) - (match.blue_team_score || 0)
            const diffBlue = (match.blue_team_score || 0) - (match.red_team_score || 0)

            tRed.diff += diffRed; tBlue.diff += diffBlue;

            if (diffRed > 0) { tRed.w++; tRed.pts += 3; tBlue.l++; }
            else if (diffBlue > 0) { tBlue.w++; tBlue.pts += 3; tRed.l++; }
            else { tRed.d++; tBlue.d++; tRed.pts += 1; tBlue.pts += 1; }
        }
        else if (match.status === 'Walkover_Red') {
            tRed.pld++; tBlue.pld++;
            tRed.w++; tRed.pts += 3; // 紅隊不戰而勝
            tBlue.l++;
        }
        else if (match.status === 'Walkover_Blue') {
            tRed.pld++; tBlue.pld++;
            tBlue.w++; tBlue.pts += 3; // 藍隊不戰而勝
            tRed.l++;
        }
    }

    // 4. 將字典轉為陣列，並按 積分 > 淨勝分 > 勝場 進行排序
    const standings = Object.values(standingsMap).sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts
        if (b.diff !== a.diff) return b.diff - a.diff
        return b.w - a.w
    })

    // 加上排名 (Rank) 和晉級線標記 (Qualified)
    standings.forEach((team, index) => {
        team.rank = index + 1
        team.qualified = index < 6 // 假設前 6 名晉級，這個可以根據賽事配置調整
    })

    // 格式化賽程為陣列
    const rounds = Object.keys(roundsMap).map(phase => ({
        roundName: phase,
        matches: roundsMap[phase]
    }))

    return { standings, rounds }
})