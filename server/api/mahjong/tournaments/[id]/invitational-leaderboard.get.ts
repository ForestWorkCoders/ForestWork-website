import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')
    if (!id) throw createError({ statusCode: 400, statusMessage: '缺少賽事 ID' })

    const supabase = await serverSupabaseClient<Database>(event)

    // 1. 獲取當前總決賽的資訊，推導出它是哪一年的賽季 (Season)
    const { data: finaleTourney } = await supabase
        .schema('mahjong')
        .from('tournaments')
        .select('title, created_at')
        .eq('id', id)
        .single()

    const targetDate = finaleTourney?.created_at ? new Date(finaleTourney.created_at) : new Date()
    const targetYear = targetDate.getFullYear()
    const targetMonth = targetDate.getMonth() + 1

    let validMonths: number[] = []
    let displayMonthsMeta: { val: number, label: string }[] = []

    if (targetYear < 2025) {
        // 【舊紀元 Legacy】2023, 2024 年制：全年 11 個月大亂鬥
        validMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
        displayMonthsMeta = [
            { val: 1, label: 'JAN' }, { val: 2, label: 'FEB' }, { val: 3, label: 'MAR' },
            { val: 4, label: 'APR' }, { val: 5, label: 'MAY' }, { val: 6, label: 'JUN' },
            { val: 7, label: 'JUL' }, { val: 8, label: 'AUG' }, { val: 9, label: 'SEP' },
            { val: 10, label: 'OCT' }, { val: 11, label: 'NOV' }
        ]
    } else {
        // 【新紀元 Modern】2025 年起：半年制
        if (targetMonth <= 6) {
            // 上半賽季：邀請賽在 6 月，抓取 1~5 月
            validMonths = [1, 2, 3, 4, 5]
            displayMonthsMeta = [
                { val: 1, label: 'JAN' }, { val: 2, label: 'FEB' }, { val: 3, label: 'MAR' },
                { val: 4, label: 'APR' }, { val: 5, label: 'MAY' }
            ]
        } else {
            // 下半賽季：邀請賽在 12 月，抓取 7~11 月
            validMonths = [7, 8, 9, 10, 11]
            displayMonthsMeta = [
                { val: 7, label: 'JUL' }, { val: 8, label: 'AUG' }, { val: 9, label: 'SEP' },
                { val: 10, label: 'OCT' }, { val: 11, label: 'NOV' }
            ]
        }
    }

    interface MonthlyRankRow {
        account_id: number;
        points: number;
        month: number;
    }

    // 2. 撈取該年度【所有月賽】的積分紀錄 (我們剛剛在視圖裡加回了 year)
    const { data, error: rankErr } = await supabase
        .schema('mahjong')
        .from('monthly_player_ranks')
        .select('account_id, points, month')
        .eq('year', targetYear)
        .in('month', validMonths)

    if (rankErr) throw createError({ statusCode: 500, statusMessage: rankErr.message })
    const rawRanks = data as MonthlyRankRow[] | null

    if (!rawRanks || rawRanks.length === 0) return []

    const latestMonth = Math.max(...rawRanks.map(r => r.month))

    // 3. 升級版 Map/Reduce：保留月份明細
    const aggregatedStats = new Map<number, {
        total: number,
        previous_total: number,
        previous_played_months: number,
        months: Record<number, number>
    }>()

    rawRanks.forEach(r => {
        if (!aggregatedStats.has(r.account_id)) {
            aggregatedStats.set(r.account_id, {
                total: 0,
                previous_total: 0,
                previous_played_months: 0,
                months: {}
            })
        }
        const stat = aggregatedStats.get(r.account_id)!
        stat.total += r.points
        stat.months[r.month] = (stat.months[r.month] || 0) + r.points

        // ★ 如果這個月早於「最新的月」，把它算進歷史成績中！
        if (r.month < latestMonth) {
            stat.previous_total += r.points
            stat.previous_played_months += 1
        }
    })

    // ==========================================
    // 4. 計算上個月的排行榜 (模擬快照)
    // ==========================================
    const prevLeaderboard = Array.from(aggregatedStats.entries())
        .sort((a, b) => b[1].previous_total - a[1].previous_total)

    const previousRanks = new Map<number, number | 'DNF'>()
    let prevRankCounter = 1
    prevLeaderboard.forEach(([account_id, stat]) => {
        if (stat.previous_played_months === 0) {
            // 如果上個月為止他都還沒參加過任何月賽，標記為 DNF (不存在排行榜上)
            previousRanks.set(account_id, 'DNF')
        } else {
            previousRanks.set(account_id, prevRankCounter++)
        }
    })

    // 計算這個月的最終排行榜
    const currentLeaderboard = Array.from(aggregatedStats.entries())
        .sort((a, b) => b[1].total - a[1].total)

    // 4. 獲取玩家名稱與頭像 (保持你原來的邏輯不變)
    const accountIds = currentLeaderboard.map(r => r[0])
    const { data: participants } = await supabase
        .schema('mahjong')
        .from('participants')
        .select('account_id, nickname, discord_id_str:discord_id::text')
        .in('account_id', accountIds)

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
            name: p.nickname || profile?.discord_username || `Player_${p.account_id}`,
            avatar: profile?.profile_img || null
        })
    })

    // 5. 組裝成前端需要的陣列
    return {
        meta: {
            months: displayMonthsMeta
        },
        data: currentLeaderboard.map(([account_id, stat], index) => {
            const currentRank = index + 1
            const prevRank = previousRanks.get(account_id)

            let rankDiff: number | string | null = null

            // 只要上個月他有排名，就可以相減算出變動
            if (prevRank && prevRank !== 'DNF') {
                rankDiff = prevRank - currentRank
            }

            return {
                rank: currentRank,
                rank_diff: rankDiff, // ★ 將名次趨勢傳給前端
                account_id: account_id,
                name: playerDict.get(account_id)?.name,
                avatar: playerDict.get(account_id)?.avatar,
                points: Number(stat.total.toFixed(1)),
                months: stat.months
            }
        })
    }
})