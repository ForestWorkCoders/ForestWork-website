import { serverSupabaseClient } from '#supabase/server'
import type { Match, Phase, Section } from '~/types/phases'
import { pb2Bracket, pb2GroupStage } from '~~/server/utils/pb2Results'

// PB2 results as phases: a duel league (the weeks), then the playoff bracket.
// A phase with no matches is left out.

const COLUMNS = [
    { key: 'pld', label: 'P' }, { key: 'w', label: 'W' }, { key: 'd', label: 'D' },
    { key: 'l', label: 'L' }, { key: 'diff', label: '+/-', signed: true }, { key: 'pts', label: 'Pts', main: true }
]

// League matches carry a status; bracket matches already carry `winner`
const WALKOVER: Record<string, 'A' | 'B'> = { Walkover_Red: 'A', Walkover_Blue: 'B' }

function leagueWinner(m: any): 'A' | 'B' | null {
    const walkover = WALKOVER[m.status]
    if (walkover) return walkover
    if (m.status !== 'Completed' || m.scoreA === m.scoreB) return null
    return m.scoreA > m.scoreB ? 'A' : 'B'
}

export default defineEventHandler(async (event): Promise<Phase[]> => {
    const tournamentId = getRouterParam(event, 'id')
    if (!tournamentId) throw createError({ statusCode: 400, statusMessage: 'Tournament ID required' })

    // Both old shapes name the sides A (red) and B (blue)
    const duel = (m: any, winner: 'A' | 'B' | null): Match => ({
        id: m.id,
        status: m.status ?? null,
        label: WALKOVER[m.status] ? 'W/O' : undefined,
        url: `/games/plazmaburst/tournaments/${tournamentId}/matches/${m.id}`,
        next: m.nextMatchId ?? null,
        nextLoser: m.nextLoserMatchId ?? null,
        sides: (['A', 'B'] as const).map(s => ({
            entrant: m[`team${s}`] ? { name: m[`team${s}`], colour: m[`colour${s}`] ?? m[`color${s}`] ?? null } : null,
            score: m[`score${s}`] ?? null,
            winner: winner === s
        }))
    })

    const supabase = await serverSupabaseClient(event)
    const [league, bracket] = await Promise.all([pb2GroupStage(supabase, tournamentId), pb2Bracket(supabase, tournamentId)])
    const phases: Phase[] = []

    if (league.rounds.length) phases.push({
        id: 'group',
        title: '小組賽 · Group Stage',
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
            rounds: league.rounds.map((r: any) => ({
                id: r.roundName, title: r.roundName, matches: r.matches.map((m: any) => duel(m, leagueWinner(m)))
            }))
        }]
    })

    const sections: Section[] = [
        { id: 'upper', title: '勝部 · Upper Bracket', rounds: bracket.upperBracket },
        { id: 'lower', title: '敗部 · Lower Bracket', rounds: bracket.lowerBracket }
    ]
        .filter(s => s.rounds.length)
        .map(s => ({
            ...s,
            rounds: s.rounds.map((r: any, i: number) => ({
                id: `${s.id}_${i + 1}`, title: r.title, matches: r.matches.map((m: any) => duel(m, m.winner))
            }))
        }))

    if (sections.length) phases.push({
        id: 'playoffs',
        title: '季後賽 · Playoffs',
        stage: bracket.lowerBracket.length ? 'double_elim' : 'single_elim',
        sides: 2,
        entrant: 'team',
        columns: [],
        groups: [{ id: 'playoffs', rounds: [], sections }]
    })

    return phases
})
