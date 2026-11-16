import { serverSupabaseClient } from '#supabase/server'
import type { Match, Phase, Section } from '~/types/phases'
import { pb2Bracket, pb2GroupStage } from '~~/server/utils/pb2Results'

// PB2 results as phases (WL2f): a duel league (the weeks), then the playoff bracket.
// A phase with no matches is left out.

const COLUMNS = [
    { key: 'pld', label: 'P' }, { key: 'w', label: 'W' }, { key: 'd', label: 'D' },
    { key: 'l', label: 'L' }, { key: 'diff', label: '+/-' }, { key: 'pts', label: 'Pts' }
]

// Both old shapes name the sides A (red) and B (blue)
const duel = (m: any): Match => ({
    id: m.id,
    status: m.status ?? null,
    next: m.nextMatchId ?? null,
    nextLoser: m.nextLoserMatchId ?? null,
    sides: (['A', 'B'] as const).map(s => ({
        entrant: m[`team${s}`] ? { name: m[`team${s}`], colour: m[`colour${s}`] ?? m[`color${s}`] ?? null } : null,
        score: m[`score${s}`] ?? null,
        ...(m.winner !== undefined && { winner: m.winner === s })
    }))
})

export default defineEventHandler(async (event): Promise<Phase[]> => {
    const tournamentId = getRouterParam(event, 'id')
    if (!tournamentId) throw createError({ statusCode: 400, statusMessage: 'Tournament ID required' })

    const supabase = await serverSupabaseClient(event)
    const [league, bracket] = await Promise.all([pb2GroupStage(supabase, tournamentId), pb2Bracket(supabase, tournamentId)])
    const phases: Phase[] = []

    if (league.rounds.length) phases.push({
        id: 'group',
        title: 'Group Stage',
        stage: 'league',
        sides: 2,
        entrant: 'team',
        columns: COLUMNS,
        promotedRanks: league.standings.filter((t: any) => t.qualified).map((t: any) => t.rank),
        groups: [{
            id: 'group',
            standings: league.standings.map(({ rank, id, name, short_sign, colour, logo, pld, w, d, l, diff, pts }: any) => ({
                rank,
                entrant: { id: String(id), name, short: short_sign, colour, avatar: logo },
                stats: { pld, w, d, l, diff, pts }
            })),
            rounds: league.rounds.map((r: any) => ({ id: r.roundName, title: r.roundName, matches: r.matches.map(duel) }))
        }]
    })

    const sections: Section[] = [
        { id: 'upper', title: 'Upper Bracket', rounds: bracket.upperBracket },
        { id: 'lower', title: 'Lower Bracket', rounds: bracket.lowerBracket }
    ]
        .filter(s => s.rounds.length)
        .map(s => ({
            ...s,
            rounds: s.rounds.map((r: any, i: number) => ({ id: `${s.id}_${i + 1}`, title: r.title, matches: r.matches.map(duel) }))
        }))

    if (sections.length) phases.push({
        id: 'playoffs',
        title: 'Playoffs',
        stage: bracket.lowerBracket.length ? 'double_elim' : 'single_elim',
        sides: 2,
        entrant: 'team',
        columns: [],
        groups: [{ id: 'playoffs', rounds: [], sections }]
    })

    return phases
})
