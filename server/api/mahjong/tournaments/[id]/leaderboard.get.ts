import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')
    if (!id) throw createError({ statusCode: 400, statusMessage: '缺少賽事 ID' })

    const supabase = await serverSupabaseClient<Database>(event)

    // ==========================================
    // 1. 撈取該賽事所有的對局 (Matches)
    // ==========================================
    const { data: matches, error: matchErr } = await supabase
        .schema('mahjong')
        .from('matches')
        .select('*')
        .eq('tournament_bind_id', id)

    if (matchErr) throw createError({ statusCode: 500, statusMessage: matchErr.message })

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
                games: {} as Record<string, number> // 用來裝 game_1, game_2...
            })
        }
        return statsMap.get(accountId)
    }

    // 遍歷所有對局，把分數塞進對應的玩家身上
    matches.forEach(m => {
        const gameTag = m.tag // 這場是第幾局 (1~16)

        // 處理單一座位分數的輔助函數
        const processSeat = (accountId: number | null, score: number | null) => {
            if (!accountId || score === null) return

            const pStat = initPlayer(accountId)
            pStat.played += 1
            pStat.total_score += score

            // ★ 積分計算 (Points Calculation) ★
            // 這裡我先放一個最基礎的佔位邏輯：(得點 - 25000) / 1000
            // 之後你可以根據你們賽制的 Uma (順位馬) 和 Oka 去修改這個算式
            const pts = (score - 25000) / 1000

            pStat.total_pts += pts
            // 將這局的積分記錄進 game_X 欄位 (UI 顯示使用)
            pStat.games[`game_${gameTag}`] = Number(pts.toFixed(1))
        }

        processSeat(m.east_id, m.east_score)
        processSeat(m.south_id, m.south_score)
        processSeat(m.west_id, m.west_score)
        processSeat(m.north_id, m.north_score) // 北風可能為 Null，輔助函數會自動略過
    })

    // ==========================================
    // 4. 排序、排名與 DNF 判定
    // ==========================================
    let leaderboard = Array.from(statsMap.values())

    // 第一步：根據總積分 (total_pts) 由高到低排序
    leaderboard.sort((a, b) => b.total_pts - a.total_pts)

    // 第二步：計算名次，並處理 DNF (< 8 場)
    let currentRank = 1
    const finalLeaderboard = leaderboard.map(p => {
        // 判斷是否完賽
        const isDNF = p.played < 8

        // 把 .games 裡面的 { game_1, game_2... } 展開到外層，符合 TanStack Table 格式
        const result = {
            ...p,
            ...p.games,
            rank: isDNF ? 'DNF' : currentRank++,
            total_pts: Number(p.total_pts.toFixed(1)) // 確保小數點漂亮
        }
        delete result.games // 刪除多餘的內層物件
        return result
    })

    // 第三步：強制把 DNF 的玩家沉到陣列最底部
    finalLeaderboard.sort((a, b) => {
        if (a.rank === 'DNF' && b.rank !== 'DNF') return 1
        if (a.rank !== 'DNF' && b.rank === 'DNF') return -1
        return 0
    })

    return finalLeaderboard
})