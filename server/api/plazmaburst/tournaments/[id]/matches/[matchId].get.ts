import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'

// 纯函数提到外部，拒绝每次请求重复构建闭包
function calcKDR(k: number, d: number): string {
  if (d === 0) return k === 0 ? '0.00' : k.toFixed(2)
  return (k / d).toFixed(2)
}

function formatPlayerStat(s: any) {
  return {
    id: s.player_id,
    name: s.player?.nickname || 'Unknown',
    kills: s.kills ?? 0,
    deaths: s.deaths ?? 0,
    kdr: calcKDR(s.kills ?? 0, s.deaths ?? 0),
    headshots: s.headshots ?? 0,
    aces: s.aces ?? 0
  }
}

export default defineEventHandler(async (event) => {
  const tournamentId = getRouterParam(event, 'id')
  const matchId = getRouterParam(event, 'matchId')

  if (!tournamentId || !matchId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing ID parameters' })
  }

  const supabase = await serverSupabaseClient<Database>(event)

  const { data: match, error } = await supabase
    .schema('plazmaburst')
    .from('matches')
    .select(`
      id, phase_tag, format, status, red_team_score, blue_team_score, scheduled_at,
      tournament:tournaments(id, title),
      red_team:teams!matches_red_team_id_fkey(id, name, short_sign, colour, logo),
      blue_team:teams!matches_blue_team_id_fkey(id, name, short_sign, colour, logo),
      match_games (
        id, game_number, status, red_team_score, blue_team_score, round_history,
        map:maps(id, name, pb2_map_id, thumbnail_url),
        stats:match_game_stats(
          player_id, team_id, kills, deaths, headshots, aces,
          player:players(nickname)
        )
      )
    `)
    .eq('id', matchId)
    .single()

  if (error || !match) {
    console.error('Fetch match detail error:', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch match details' })
  }

  const rawGames = Array.isArray(match.match_games) ? match.match_games : []
  rawGames.sort((a, b) => a.game_number - b.game_number)

  const redTeamId = (match.red_team as any)?.id
  const blueTeamId = (match.blue_team as any)?.id

  return {
    id: match.id,
    tournamentTitle: (match.tournament as any)?.title,
    phase: match.phase_tag,
    format: match.format,
    status: match.status,
    scheduledAt: match.scheduled_at,
    score: {
      red: match.red_team_score,
      blue: match.blue_team_score
    },
    redTeam: match.red_team,
    blueTeam: match.blue_team,
    games: rawGames.map((g) => {
      const allStats = Array.isArray(g.stats) ? g.stats : []
      const redStats = allStats
        .filter((s: any) => s.team_id === redTeamId)
        .map(formatPlayerStat)
        .sort((a, b) => b.kills - a.kills)
      const blueStats = allStats
        .filter((s: any) => s.team_id === blueTeamId)
        .map(formatPlayerStat)
        .sort((a, b) => b.kills - a.kills)

      return {
        id: g.id,
        gameNumber: g.game_number,
        status: g.status,
        score: { red: g.red_team_score, blue: g.blue_team_score },
        map: g.map || { name: 'TBD', pb2_map_id: 'unknown' },
        roundHistory: g.round_history || [],
        redTeamStats: redStats,
        blueTeamStats: blueStats
      }
    })
  }
})