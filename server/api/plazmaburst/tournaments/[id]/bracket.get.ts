import { serverSupabaseClient } from '#supabase/server'
import { pb2Bracket } from '~~/server/utils/pb2Results'

// Old bracket shape, used by Pb2Playoffs until WL2g moves it to /phases
export default defineEventHandler(async (event) => {
    const tournamentId = getRouterParam(event, 'id')
    if (!tournamentId) throw createError({ statusCode: 400, statusMessage: 'Missing tournament ID' })

    const supabase = await serverSupabaseClient(event)
    return pb2Bracket(supabase, tournamentId)
})
