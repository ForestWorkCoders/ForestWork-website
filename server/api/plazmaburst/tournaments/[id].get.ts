import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'

export default defineEventHandler(async (event) => {
  // 1. 從網址擷取動態 ID
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: '缺少賽事 ID' })
  }

  const supabase = await serverSupabaseClient<Database>(event)

  // 2. 查詢單一賽事資料
  const { data: tourney, error } = await supabase
    .schema('plazmaburst')
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single() // 告訴 Supabase 我們只要一筆

  if (error) {
    throw createError({ statusCode: 404, statusMessage: '找不到該賽事' })
  }

  // 3. 日期與狀態計算 (淨水廠邏輯)
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'TBD'
    return new Intl.DateTimeFormat('en-CA').format(new Date(dateString))
  }

  const now = new Date()
  const startTime = tourney.created_at ? new Date(tourney.created_at) : null
  const endTime = tourney.updates_at ? new Date(tourney.updates_at) : null
  
  let status = '未知狀態'
  if (startTime && endTime) {
    if (now > endTime) status = '已結束 · Ended'
    else if (now >= startTime && now <= endTime) status = '進行中 · Ongoing'
    else status = '即將開始 · Upcoming'
  }

  // 4. 完美包裝回傳給前端
  return {
    id: tourney.id,
    title: tourney.title,
    tier: tourney.tier,
    region: tourney.region,
    imageUrl: tourney.icon,
    duration: `${formatDate(tourney.created_at)} ~ ${formatDate(tourney.updates_at)}`,
    status: status,
    organizer: tourney.organizer,
    format: tourney.format,
    created_at: tourney.created_at,
    content_url: tourney.content_url
  }
})