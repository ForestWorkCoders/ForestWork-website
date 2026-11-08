import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'

// 定義職位的排序權重 (確保先鋒在最上面，大將在下面)
const ROLE_WEIGHT: Record<string, number> = {
    Senpo: 1,
    Jiho: 2,
    Chuken: 3,
    Fukusho: 4,
    Taisho: 5,
    Substitute: 6
}

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')
    if (!id) throw createError({ statusCode: 400, statusMessage: '缺少賽事 ID' })

    const supabase = await serverSupabaseClient<Database>(event)

    // 1. 撈取該賽事的所有隊伍
    const { data: teams, error: teamsErr } = await supabase
        .schema('mahjong')
        .from('tourney_teams')
        .select('*')
        .eq('tournament_id', id)
        .order('created_at', { ascending: true }) // 依照創建時間排序，確保順序一致

    if (teamsErr) throw createError({ statusCode: 500, statusMessage: teamsErr.message })
    if (!teams || teams.length === 0) return []

    // 2. 撈取這些隊伍的所有隊員關聯
    const teamIds = teams.map(t => t.id)
    const { data: tourneyPlayers } = await supabase
        .schema('mahjong')
        .from('tourney_players')
        .select('*')
        .in('team_id', teamIds)

    if (!tourneyPlayers || tourneyPlayers.length === 0) {
        // 如果有隊伍但還沒排隊員，直接回傳空隊員的隊伍列表
        return teams.map(t => ({ ...t, players: [] }))
    }

    // 3. 跨 Schema 撈取玩家的真實名稱與大頭貼 (The String Cast Fix)
    const accountIds = Array.from(new Set(tourneyPlayers.map(tp => tp.player_id)))
    
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

    // 建立玩家字典
    const playerDict = new Map()
    participants?.forEach(p => {
        const profile = profiles?.find(pr => pr.discord_id_str === p.discord_id_str)
        playerDict.set(p.account_id, {
            name: p.nickname || profile?.discord_username || `Unknown_${p.account_id}`,
            avatar: profile?.profile_img || null
        })
    })

    // 4. 組裝最終的資料結構
    const finalTeams = teams.map(team => {
        // 篩選出該隊伍的隊員
        const players = tourneyPlayers
            .filter(tp => tp.team_id === team.id)
            .map(tp => ({
                role: tp.role,
                ...playerDict.get(tp.player_id)
            }))
            // 依照日麻職位排序 (先鋒 -> 大將)
            .sort((a, b) => (ROLE_WEIGHT[a.role] || 99) - (ROLE_WEIGHT[b.role] || 99))

        return {
            id: team.id,
            name: team.name,
            logo: team.logo,
            notes: team.notes,
            players: players
        }
    })

    // 依照隊伍名稱簡單排序一下
    return finalTeams;
})