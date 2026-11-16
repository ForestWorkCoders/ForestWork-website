import { serverSupabaseClient } from '#supabase/server'
import { pb2GroupStage } from '~~/server/utils/pb2Results'

// Old league shape, used by Pb2GroupStage until WL2g moves it to /phases
export default defineEventHandler(async (event) => {
    const tournamentId = getRouterParam(event, 'id')
    if (!tournamentId) throw createError({ statusCode: 400, statusMessage: 'Tournament ID required' })

    const supabase = await serverSupabaseClient(event)
    return pb2GroupStage(supabase, tournamentId)
})
