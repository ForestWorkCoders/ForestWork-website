import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
    const tournamentId = getRouterParam(event, 'id')

    if (!tournamentId) {
        throw createError({ statusCode: 400, statusMessage: 'Tournament ID is required' })
    }

    const supabase = await serverSupabaseClient(event)

    // 1. 執行關聯查詢：加入 status 欄位，並修正 profile_url
    const { data: teams, error } = await supabase
        .schema('plazmaburst')
        .from('teams')
        .select(`
          id, 
          name, 
          logo, 
          colour, 
          short_sign, 
          notes,
          team_members (
            role,
            status,
            players (
              id,
              nickname,
              profile_url
            )
          )
        `)
        .eq('tournament_id', tournamentId)

    if (error) {
        console.error('Fetch teams error:', error)
        throw createError({ statusCode: 500, statusMessage: 'Failed to fetch teams data' })
    }

    // 2. 數據清洗與變換 (Data Transformation)
    const formattedTeams = teams.map(team => {

        // 防守型編程：不僅防 null，還要過濾出 Active 的現役成員！
        // 這樣被 Traded 或 Released 的選手就不會變成幽靈人口出現在名單上
        const activeMembers = team.team_members?.filter(tm => tm.status === 'active') || []

        // 壓平選手列表
        const players = activeMembers.map(tm => ({
            id: tm.players?.id || null,
            name: tm.players?.nickname || 'Unknown',
            role: tm.role || 'Substitute',
            avatar: tm.players?.profile_url || null // 修正為 profile_url
        }))

        // 強制排序：隊長 > 隊員 > 替補
        const roleWeight: Record<string, number> = {
            manager: 1,
            player: 2,
            substitute: 3
        }
        players.sort((a, b) => (roleWeight[a.role] || 99) - (roleWeight[b.role] || 99))

        return {
            id: team.id,
            name: team.name,
            logo: team.logo,
            colour: team.colour,
            short_sign: team.short_sign,
            notes: team.notes,
            players: players
        }
    })

    return formattedTeams
})