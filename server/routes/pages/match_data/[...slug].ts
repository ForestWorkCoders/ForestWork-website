// server/routes/pages/match_date/[...slug].ts
import { sendRedirect, getRequestURL } from 'h3'
import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
}

export default defineEventHandler(async (event) => {
  const searchStr = getRequestURL(event).search.replace(/^\?/, '').trim()
  const match = searchStr.match(/^(\d{4})([a-zA-Z]{3,})/i)

  // 1. 防线一：正则未匹配，直接退出
  if (!match) {
    return sendRedirect(event, '/games/mahjongsoul', 302)
  }

  // 2. 防线二：解构并收窄类型（TypeScript 警告在此被物理抹杀）
  const [, rawYear, rawMonth] = match
  if (!rawYear || !rawMonth) {
    return sendRedirect(event, '/games/mahjongsoul', 302)
  }

  const monthKey = rawMonth.toLowerCase().slice(0, 3)
  const monthNum = MONTH_MAP[monthKey]

  // 3. 防线三：月份字典未命中，直接退出
  if (!monthNum) {
    return sendRedirect(event, '/games/mahjongsoul', 302)
  }

  // 4. 主干逻辑：扁平执行数据库检索
  try {
    const supabase = await serverSupabaseClient<Database>(event)

    const { data: tournament } = await supabase
      .schema('mahjong')
      .from('tournaments')
      .select('id')
      .ilike('title', `%${rawYear}%`)
      .or(`title.ilike.%${monthNum}月%,title.ilike.%-${monthNum}-%,title.ilike.%${monthKey}%`)
      .limit(1)
      .maybeSingle()

    if (tournament?.id) {
      return sendRedirect(event, `/games/mahjongsoul/tournaments/${tournament.id}`, 301)
    }
  } catch {
    // 数据库网络波动或异常静默降级，不阻断网络流
  }

  // 5. 最终兜底
  return sendRedirect(event, '/games/mahjongsoul', 302)
})