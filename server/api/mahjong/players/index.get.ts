// server/api/mahjong/players/index.get.ts
import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient<Database>(event)

  // 撈取所有註冊選手 (包含其 account_id 與 nickname)
  const { data: participants, error } = await supabase
    .schema('mahjong')
    .from('participants')
    .select('account_id, nickname')
    .order('nickname', { ascending: true })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  // 輸出對齊 Nuxt UI v3 SelectMenu 規範的扁平結構
  return (participants || []).map(p => ({
    id: p.account_id,
    label: p.nickname || `ID: ${p.account_id}`
  }))
})