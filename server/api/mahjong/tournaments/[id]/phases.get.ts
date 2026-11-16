import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'
import type { Phase, Round, Row } from '~/types/phases'
import { mahjongResults } from '~~/server/utils/mahjongResults'

// Mahjong results as phases (WL2f). Every mahjong phase is an FFA league:
// one standings table, and the tables of each game as a round.

const row = ({ rank, account_id, team_id, name, avatar, last_score, ...stats }: any): Row => ({
    rank,
    entrant: { id: String(account_id ?? team_id), name, avatar: avatar ?? null },
    stats
})

// Matches come as "Game N"; one round per game, in game order
function rounds(matches: any[]): Round[] {
    const byGame = new Map<number, Round>()
    for (const m of matches) {
        const n = Number(m.round.replace('Game ', ''))
        if (!byGame.has(n)) byGame.set(n, { id: `game_${n}`, title: m.round, matches: [] })
        byGame.get(n)!.matches.push({
            id: m.id,
            title: m.round,
            time: m.time,
            url: m.paipu_url,
            sides: m.players.map((p: any) => ({ seat: p.seat, entrant: { name: p.name }, score: p.score, points: p.pts }))
        })
    }
    return [...byGame.entries()].sort((a, b) => a[0] - b[0]).map(([, r]) => r)
}

export default defineEventHandler(async (event): Promise<Phase[]> => {
    const id = getRouterParam(event, 'id')
    if (!id) throw createError({ statusCode: 400, statusMessage: '缺少賽事 ID' })

    const supabase = await serverSupabaseClient<Database>(event)
    const { format, config, data } = await mahjongResults(supabase, id)

    // An event is information only: no results
    if (format === 'event') return []

    const entrant = config.entity_type === 'team' || format === 'relay' ? 'team' : 'player'
    const columns = [...config.columns, { key: 'total', label: 'TOTAL' }]

    return config.phases.map((p: any): Phase => {
        const { leaderboard = [], matches = [] } = data[p.id] ?? {}
        // 4 seats, or 3 if every table of the phase was sanma
        const seats = new Set(matches.flatMap((m: any) => m.players.map((s: any) => s.seat))).size

        return {
            id: p.id,
            title: p.title,
            subtitle: p.subtitle,
            stage: 'league',
            sides: seats || 4,
            entrant,
            final: !!p.is_final,
            columns,
            promotedRanks: p.promoted_ranks ?? [],
            disqualifiedRanks: p.disqualified_ranks ?? [],
            groups: [{ id: p.id, standings: leaderboard.map(row), rounds: rounds(matches) }]
        }
    })
})
