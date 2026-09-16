// server/routes/league_result.ts
import { getQuery, sendRedirect } from 'h3'
import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'

// 英文月份到数字的斯巴达式静态转换表（纯规则，非业务数据）
const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const rawYear = String(query.league_year || '').trim()
  const rawMonth = String(query.league_month || '').trim().toLowerCase()

  // 1. 防御性检查：参数不全直接安全降级到日麻主页，拒绝无效 I/O
  if (!rawYear || !rawMonth || !MONTH_MAP[rawMonth]) {
    return sendRedirect(event, '/games/mahjongsoul', 302)
  }

  const monthNum = MONTH_MAP[rawMonth] // 例如: "09"

  try {
    const supabase = await serverSupabaseClient<Database>(event)

    // 2. 动态向数据库求证：在标题或特定字段中模糊匹配 "2024" 和 "9月" / "09"
    // 假设你的比赛标题形如 "2024年9月常规赛" 或 "2024-09 Invitational"
    const { data: tournament } = await supabase
      .schema('mahjong')
      .from('tournaments')
      .select('id')
      .ilike('title', `%${rawYear}%`)
      .or(`title.ilike.%${monthNum}月%,title.ilike.%-${monthNum}-%,title.ilike.%${rawMonth}%`)
      .limit(1)
      .maybeSingle()

    // 3. 命中目标：精准 301 永久重定向到现代化动态详情页
    if (tournament?.id) {
      return sendRedirect(event, `/games/mahjongsoul/tournaments/${tournament.id}`, 301)
    }
  } catch (err) {
    // 即使底层数据库报错，也誓死捍卫用户空间，吞掉异常并兜底
  }

  // 4. 查无此赛或发生异常：降级到日麻大厅，绝不 404
  return sendRedirect(event, '/games/mahjongsoul', 302)
})