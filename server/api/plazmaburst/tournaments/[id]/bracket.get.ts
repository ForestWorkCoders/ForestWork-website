import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
    const tournamentId = getRouterParam(event, 'id')
    if (!tournamentId) throw createError({ statusCode: 400, statusMessage: 'Missing tournament ID' })

    const supabase = await serverSupabaseClient(event)

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
})