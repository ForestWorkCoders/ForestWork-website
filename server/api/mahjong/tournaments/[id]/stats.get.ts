import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  // 1. 抓取 URL 里的 UUID 參數
  const tournamentId = getRouterParam(event, 'id')
  if (!tournamentId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing tournament ID' })
  }

  // 2. 獲取 Supabase 客戶端
  const client = await serverSupabaseClient(event)

  // 3. 呼叫你剛剛建好的 RPC 函數。
  // 注意：因為你的表在 mahjong schema 下，必須鏈式調用 .schema('mahjong') 防爆！
  const { data, error } = await client
    .schema('mahjong')
    .rpc('get_tournament_match_stats', { 
      t_id: tournamentId 
    })

  // 4. 錯誤防禦
  if (error) {
    console.error('Supabase RPC Error:', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch match stats' })
  }

  // 5. 直接吐給前端乾淨的 JSON 陣列
  return data
})