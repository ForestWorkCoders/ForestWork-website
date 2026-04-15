import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient<Database>(event)

  // 抓取所有賽事 (依照建立時間由新到舊排序)
  const { data: tournaments, error } = await supabase
    .schema('mahjong')
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  // 準備三個空陣列來裝分類好的資料
  const result = {
    upcoming: [] as any[],
    ongoing: [] as any[],
    past: [] as any[]
  }

  const now = new Date()

  tournaments.forEach((t) => {
    // 日期格式化工具
    const formatDate = (dateString: string | null) => {
      if (!dateString) return 'TBD'
      return new Intl.DateTimeFormat('en-CA').format(new Date(dateString))
    }

    const formattedTourney = {
      id: t.id,
      title: t.title,
      tier: t.tier?.startsWith('Tier') ? t.tier : `Tier ${t.tier}`,
      region: t.region,
      start_date: formatDate(t.created_at),
      end_date: formatDate(t.updates_at)
    }

    // ★ 核心時間邏輯判斷 ★
    if (!t.created_at || !t.updates_at) {
      // 如果缺漏時間，為保安全，預設丟進歷史賽事
      result.past.push(formattedTourney)
      return
    }

    const startTime = new Date(t.created_at)
    const endTime = new Date(t.updates_at)

    if (now < startTime) {
      result.upcoming.push(formattedTourney)
    } else if (now >= startTime && now <= endTime) {
      result.ongoing.push(formattedTourney)
    } else {
      result.past.push(formattedTourney)
    }
  })

  // 回傳分類好的物件
  return result
})