import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const tournamentId = getRouterParam(event, 'id')
  if (!tournamentId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing tournament ID' })
  }

  const client = await serverSupabaseClient(event)

  const { data, error } = await client
    .schema('mahjong')
    .rpc('get_tournament_playstyle_stats', { 
      t_id: tournamentId 
    })

  if (error) {
    console.error('Supabase RPC Error:', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch playstyle stats' })
  }

  return data
})