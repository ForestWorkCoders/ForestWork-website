import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { mahjongResults } from '~~/server/utils/mahjongResults'

// Old results shape, used by MahjongDashboard until WL2g moves it to /phases
export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')
    if (!id) throw createError({ statusCode: 400, statusMessage: '缺少賽事 ID' })

    const supabase = await serverSupabaseClient<Database>(event)
    const { config, data } = await mahjongResults(supabase, id)
    return { config, data }
})
