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

    // 實用主義：直接信任資料庫的創建時間
    // 只要這個 12 月的總決賽是在當年度建立的，getFullYear() 就會完美運作
    const targetYear = finaleTourney?.created_at
        ? new Date(finaleTourney.created_at).getFullYear()
        : new Date().getFullYear()

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
        .eq('year', targetYear) // ★★★ 不再用 UUID 過濾，而是用年份把 11 個月的資料全撈出來！

    if (rankErr) throw createError({ statusCode: 500, statusMessage: rankErr.message })

    const rawRanks = data as MonthlyRankRow[] | null

    if (!rawRanks || rawRanks.length === 0) return []

    // 3. 升級版 Map/Reduce：保留月份明細
    const aggregatedStats = new Map<number, { total: number, months: Record<number, number> }>()

    rawRanks.forEach(r => {
        if (!aggregatedStats.has(r.account_id)) {
            aggregatedStats.set(r.account_id, { total: 0, months: {} })
        }
        const stat = aggregatedStats.get(r.account_id)!
        stat.total += r.points
        // 記錄該月份的分數
        stat.months[r.month] = (stat.months[r.month] || 0) + r.points
    })

    // 轉回陣列，並按總分排序
    const finalRanks = Array.from(aggregatedStats.entries())
        .map(([account_id, data]) => ({
            account_id,
            points: data.total,
            months: data.months
        }))
        .sort((a, b) => b.points - a.points)

    // 4. 獲取玩家名稱與頭像 (保持你原來的邏輯不變)
    const accountIds = finalRanks.map(r => r.account_id)
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
    return finalRanks.map((r, index) => ({
        rank: index + 1,
        account_id: r.account_id,
        name: playerDict.get(r.account_id)?.name,
        avatar: playerDict.get(r.account_id)?.avatar,
        points: r.points,
        months: r.months
    }))
})