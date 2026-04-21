import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')
    if (!id) throw createError({ statusCode: 400, statusMessage: '缺少賽事 ID' })

    const supabase = await serverSupabaseClient<Database>(event)

    // 1. 撈取 JSON 資料
    const { data: tourney } = await supabase.schema('mahjong').from('tournaments').select('phase_configs').eq('id', id).single()

    let eventData: any = {}
    if (typeof tourney?.phase_configs === 'string') {
        try { eventData = JSON.parse(tourney.phase_configs) } catch (e) { eventData = {} }
    } else if (tourney?.phase_configs && typeof tourney.phase_configs === 'object') {
        eventData = tourney.phase_configs
    }

    // 如果沒有設定名單，直接回傳
    if (!eventData.rosters || !Array.isArray(eventData.rosters)) {
        return eventData
    }

    // ==========================================
    // 2. 收集 JSON 中所有的 account_id
    // ==========================================
    const accountIds = new Set<number>()
    eventData.rosters.forEach((group: any) => {
        if (Array.isArray(group.players)) {
            group.players.forEach((playerId: any) => {
                if (typeof playerId === 'number') accountIds.add(playerId)
            })
        }
    })

    if (accountIds.size === 0) return eventData

    // ==========================================
    // 3. 跨 Schema 撈取最新玩家資料 (沿用你的魔法)
    // ==========================================
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

    // ==========================================
    // 4. 將真實資料「注入 (Hydrate)」回 JSON 中
    // ==========================================
    eventData.rosters = eventData.rosters.map((group: any) => {
        return {
            ...group,
            // 將原本 [8341, 7963] 的陣列，轉換成帶有名字和頭像的物件陣列
            players: group.players.map((playerId: number) => {
                const playerData = playerDict.get(playerId)
                return {
                    account_id: playerId,
                    name: playerData?.name || `ID:${playerId}`,
                    avatar: playerData?.avatar || 'https://avatars.githubusercontent.com/u/739984?v=4'
                }
            })
        }
    })

    // 回傳加工完成的終極 JSON 給前端！
    return eventData
})