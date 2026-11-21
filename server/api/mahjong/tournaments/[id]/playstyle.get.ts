import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const tournamentId = getRouterParam(event, 'id')
  if (!tournamentId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing tournament ID' })
  }

  // Optional ?phase=<id>: only that phase's matches (invitational / relay)
  const { phase } = getQuery(event)
  if (phase !== undefined && !(typeof phase === 'string' && /^[A-Za-z0-9_-]{1,16}$/.test(phase))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid phase' })
  }

  const client = await serverSupabaseClient(event)

  const { data, error } = await client
    .schema('mahjong')
    .rpc('get_tournament_playstyle_stats', {
      t_id: tournamentId,
      ...(phase ? { p_phase: phase } : {})
    })

  if (error) {
    console.error('Supabase RPC Error:', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch playstyle stats' })
  }

  return data
})