import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

// PB2 tournament results: the league weeks and the playoff bracket.
// Shared by /group-stage and /bracket (the old shapes) and /phases (the WL2f shape).

export async function pb2GroupStage(supabase: SupabaseClient<Database>, tournamentId: string) {
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
}

export async function pb2Bracket(supabase: SupabaseClient<Database>, tournamentId: string) {
    const { data: matches, error } = await supabase
        .schema('plazmaburst')
        .from('matches')
        .select(`
            id,
            phase_tag,
            bracket_position,
            red_team_score,
            blue_team_score,
            red_team:teams!matches_red_team_id_fkey(short_sign, colour),
            blue_team:teams!matches_blue_team_id_fkey(short_sign, colour),
            next_match_id,
            next_loser_match_id
        `)
        .eq('tournament_id', tournamentId)
        .not('bracket_position', 'is', null)

    if (error) throw createError({ statusCode: 500, statusMessage: error.message })

    // 🛡️ 防禦 1：資料集為空或 null 的優雅降級 (Early Return)
    if (!matches || matches.length === 0) {
        return {
            upperBracket: [],
            lowerBracket: []
        }
    }

    // 定義一個嚴格的型別字典：Key 是字串 (回合數)，Value 是陣列 (該回合的比賽列表)
    type BracketDict = Record<string, any[]>

    // 明確告訴 TS 這是兩個合法字典，而不是空物件 {}
    const brackets: { upper: BracketDict, lower: BracketDict } = {
        upper: {}, 
        lower: {}
    }

    matches.forEach(m => {
        // 🛡️ 防禦 2：極端防禦，哪怕 Supabase 的過濾器漏了，這裡也不能報錯
        if (!m.bracket_position || typeof m.bracket_position !== 'string') return

        const parts = m.bracket_position.split('_')
        
        // 1. 使用解構賦值，將陣列元素拔出來
        const [type, roundStr, matchStr] = parts

        // 2. 嚴格型別守衛：確保這三個變數不僅存在，而且有值。
        // 這行會徹底消除 TS 的 "possibly undefined" 恐懼
        if (!type || !roundStr || !matchStr) return

        // 3. 安全操作
        const roundNum = roundStr.replace('R', '')
        
        // 🛡️ 防禦 3：安全的分數比較 (防禦 null 或 undefined)
        // 確保兩邊都有分數才判定勝負，如果還沒打完 (null)，winner 保持為 null
        let winner = null
        if (m.red_team_score !== null && m.blue_team_score !== null) {
            if (m.red_team_score > m.blue_team_score) winner = 'A'
            else if (m.blue_team_score > m.red_team_score) winner = 'B'
        }

        const formattedMatch = {
            id: m.id,
            phaseTag: m.phase_tag,
            teamA: m.red_team?.short_sign || null,
            teamB: m.blue_team?.short_sign || null,
            colourA: m.red_team?.colour || null,
            colourB: m.blue_team?.colour || null,
            scoreA: m.red_team_score,
            scoreB: m.blue_team_score,
            winner: winner,
            // 這裡也換成安全的 matchStr
            _matchNum: parseInt(matchStr.replace('M', '')),

            nextMatchId: m.next_match_id,
            nextLoserMatchId: m.next_loser_match_id,
        }

        const targetBracket = type === 'UB' ? brackets.upper : brackets.lower
        if (!targetBracket[roundNum]) targetBracket[roundNum] = []
        targetBracket[roundNum].push(formattedMatch)
    })

    const formatBracket = (bracketDict: any) => {
        return Object.keys(bracketDict)
            .sort((a, b) => parseInt(a) - parseInt(b)) 
            .map(roundKey => {
                const matchesInRound = bracketDict[roundKey]
                matchesInRound.sort((a: any, b: any) => a._matchNum - b._matchNum) 
                
                const dynamicTitle = matchesInRound[0]?.phaseTag || `Round ${roundKey}`

                return {
                    title: dynamicTitle,
                    matches: matchesInRound
                }
            })
    }

    return {
        upperBracket: formatBracket(brackets.upper),
        lowerBracket: formatBracket(brackets.lower)
    }
}
