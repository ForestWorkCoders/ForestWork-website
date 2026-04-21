import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { calculateMahjongPoints } from '~~/server/utils/mahjongScoreEngine'

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')
    if (!id) throw createError({ statusCode: 400, statusMessage: '缺少賽事 ID' })

    const supabase = await serverSupabaseClient<Database>(event)

    // ★ 魔法 0：撈取賽事的 dnfThreshold
    // (注意：請確認你的資料庫欄位名稱是 camelCase 的 dnfThreshold 還是 snake_case 的 dnf_threshold)
    const { data: tourney } = await supabase
        .schema('mahjong')
        .from('tournaments') // 依照你說的資料表名稱
        .select('dnfThreshold')
        .eq('id', id)
        .single()

    const dnfThreshold = tourney?.dnfThreshold || 8 // 如果沒設定，預設為 8

    // ==========================================
    // 1. 撈取該賽事所有的對局 (Matches)
    // ==========================================
    const { data: matches, error: matchErr } = await supabase
        .schema('mahjong')
        .from('matches')
        .select('*')
        .eq('tournament_bind_id', id)

    if (matchErr) throw createError({ statusCode: 500, statusMessage: matchErr.message })

    // ★ 補上缺失的 rules 查詢，讓它和 matches.get.ts 一模一樣
    const { data: ruleData } = await supabase
        .schema('mahjong')
        .from('rules')
        .select('basepts, uma1, uma2, uma3, uma4')
        .eq('id', id)
        .single()

    const validTags = matches.map(m => Number(m.tag)).filter(n => !isNaN(n))
    const totalGames = validTags.length > 0 ? Math.max(...validTags) : 16

    // 如果還沒有任何對局，直接回傳空陣列
    if (!matches || matches.length === 0) return []

    

    // ==========================================
    // 2. 跨 Schema 撈取玩家資料 (The String Cast Fix)
    // ==========================================
    const accountIds = new Set<number>()
    matches.forEach(m => {
        accountIds.add(m.east_id); accountIds.add(m.south_id)
        accountIds.add(m.west_id); if (m.north_id) accountIds.add(m.north_id)
    })

    // ★ 魔法 1：使用 discord_id_str:discord_id::text，讓資料庫先把它轉成字串再傳過來
    const { data: participants } = await supabase
        .schema('mahjong')
        .from('participants')
        .select('account_id, nickname, discord_id_str:discord_id::text')
        .in('account_id', Array.from(accountIds))

    // 現在我們拿到的是純字串陣列了，完美避開精度遺失
    const discordIdsStr = participants?.map(p => p.discord_id_str).filter(Boolean) as string[]

    // ★ 魔法 2：查詢大頭貼時，一樣強制將資料庫欄位轉成字串來比對
    const { data: profiles } = await supabase
        .schema('public')
        .from('participant_data')
        .select('discord_id_str:discord_id::text, discord_username, profile_img')
        .in('discord_id', discordIdsStr as unknown as number[]) // Supabase 的 in 函數可以接受字串去對應 bigint

    // 建立玩家字典
    const playerDict = new Map()
    participants?.forEach(p => {
        // 兩邊現在都是絕對精準的 18 位數字串了，不會再發生覆寫！
        const profile = profiles?.find(pr => pr.discord_id_str === p.discord_id_str)

        playerDict.set(p.account_id, {
            name: p.nickname || profile?.discord_username || `Unknown_${p.account_id}`,
            avatar: profile?.profile_img || null
        })
    })

    // ==========================================
    // 3. Map/Reduce: 核心資料處理與分數聚合
    // ==========================================
    const statsMap = new Map()

    // 初始化玩家資料結構的輔助函數
    const initPlayer = (accountId: number) => {
        if (!statsMap.has(accountId)) {
            statsMap.set(accountId, {
                account_id: accountId,
                player: playerDict.get(accountId)?.name,
                avatar: playerDict.get(accountId)?.avatar,
                played: 0,
                total_score: 0,
                total_pts: 0,
                previous_played: 0,
                previous_pts: 0,
                games: {} as Record<string, number> // 用來裝 game_1, game_2...
            })
        }
        return statsMap.get(accountId)
    }

    // 遍歷所有對局，把分數塞進對應的玩家身上
    matches.forEach(m => {
        const gameTag = Number(m.tag) || 1

        // 判斷是否為三麻
        const isSanma = m.north_id === null

        // 抽出有效玩家陣列，這一步是為了計算單局名次 (Rank)
        const rawPlayers = [
            { id: m.east_id, score: m.east_score },
            { id: m.south_id, score: m.south_score },
            { id: m.west_id, score: m.west_score }
        ]
        if (!isSanma && m.north_id && m.north_score !== null) {
            rawPlayers.push({ id: m.north_id, score: m.north_score })
        }

        // 計算名次對照表
        const sortedScores = [...rawPlayers].sort((a, b) => b.score - a.score)
        const getRank = (score: number) => sortedScores.findIndex(p => p.score === score) + 1

        // 結算分數並寫入 Map
        rawPlayers.forEach(p => {
            // 過濾帳號 1 或髒資料 (沿用你之前的防禦邏輯)
            if (!p.id || p.score === null || p.id === 1) return

            const rank = getRank(p.score)
            const pts = calculateMahjongPoints(p.score, rank, isSanma, ruleData)

            const pStat = initPlayer(p.id)
            pStat.played += 1
            pStat.total_score += p.score
            pStat.total_pts += pts
            pStat.games[`game_${gameTag}`] = pts

            // ★ 趨勢魔法：如果這一局發生在「最新一輪」之前，把它算進歷史成績中
            if (gameTag < totalGames) {
                pStat.previous_played += 1
                pStat.previous_pts += pts
            }
        })
    })

    // ==========================================
    // 4. 排序、排名與 DNF 判定
    // ==========================================
    // ★ 步驟 4-1：模擬出「打最後一輪之前」的排行榜 (套用相同的 DNF 邏輯)
    const prevLeaderboard = Array.from(statsMap.values()).sort((a, b) => b.previous_pts - a.previous_pts)
    let prevRankCounter = 1
    const previousRanks = new Map()

    prevLeaderboard.forEach(p => {
        const prevIsDNF = p.previous_played < dnfThreshold
        // 如果上一輪還沒達到完賽標準，他在舊榜單就是 'DNF'
        previousRanks.set(p.account_id, prevIsDNF ? 'DNF' : prevRankCounter++)
    })

    // ★ 步驟 4-2：計算目前的排行榜與名次變動
    let leaderboard = Array.from(statsMap.values())

    // 第一步：根據總積分 (total_pts) 由高到低排序
    leaderboard.sort((a, b) => b.total_pts - a.total_pts)

    // 第二步：計算名次，並處理 DNF (< 8 場)
    let currentRankCounter = 1
    const finalLeaderboard = leaderboard.map(p => {
        const isDNF = p.played < dnfThreshold
        const currentRank = isDNF ? 'DNF' : currentRankCounter++
        const prevRank = previousRanks.get(p.account_id)

        let rankDiff: number | string | null = null // 預設 null，前端顯示 'NEW'

        // 只有當「上輪已完賽」且「這輪也完賽」時，才能比較名次變化
        if (isDNF) {
            // ★ 修復：如果連完賽門檻都沒達到，就不顯示任何趨勢
            rankDiff = 'hide'
        } else if (prevRank !== 'DNF' && currentRank !== 'DNF') {
            // 如果上一輪有排名，這輪也有排名，正常相減
            rankDiff = prevRank - currentRank
        }

        const result = {
            ...p,
            ...p.games,
            rank: currentRank,
            rank_diff: rankDiff, // ★ 將趨勢推給前端
            total_pts: Number(p.total_pts.toFixed(1))
        }

        // 刪除多餘的內層與中繼屬性，保持 API 乾淨
        delete result.games
        delete result.previous_pts
        delete result.previous_played
        return result
    })

    // 第三步：強制把 DNF 的玩家沉到陣列最底部
    finalLeaderboard.sort((a, b) => {
        if (a.rank === 'DNF' && b.rank !== 'DNF') return 1
        if (a.rank !== 'DNF' && b.rank === 'DNF') return -1
        return 0
    })

    return {
        meta: { totalGames, dnfThreshold },
        data: finalLeaderboard
    }
})