// server/middleware/legacy-dynamic-redirects.ts
import { sendRedirect, getRequestURL, getQuery, setResponseHeader } from 'h3'
import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'

const MONTH_MAP: Record<string, { num: number; pad: string; aliases: string[] }> = {
  jan: { num: 1, pad: '01', aliases: ['1月', '01月', 'jan', 'january'] },
  feb: { num: 2, pad: '02', aliases: ['2月', '02月', 'feb', 'february'] },
  mar: { num: 3, pad: '03', aliases: ['3月', '03月', 'mar', 'march'] },
  apr: { num: 4, pad: '04', aliases: ['4月', '04月', 'apr', 'april'] },
  may: { num: 5, pad: '05', aliases: ['5月', '05月', 'may'] },
  jun: { num: 6, pad: '06', aliases: ['6月', '06月', 'jun', 'june'] },
  jul: { num: 7, pad: '07', aliases: ['7月', '07月', 'jul', 'july'] },
  aug: { num: 8, pad: '08', aliases: ['8月', '08月', 'aug', 'august'] },
  sep: { num: 9, pad: '09', aliases: ['9月', '09月', 'sep', 'september'] },
  oct: { num: 10, pad: '10', aliases: ['10月', 'oct', 'october'] },
  nov: { num: 11, pad: '11', aliases: ['11月', 'nov', 'november'] },
  dec: { num: 12, pad: '12', aliases: ['12月', 'dec', 'december'] }
}

function getLocalYearMonth(dateString: string | null) {
  if (!dateString) return { year: 0, month: 0 }
  const d = new Date(dateString)
  if (isNaN(d.getTime())) return { year: 0, month: 0 }
  const local = new Date(d.getTime() + 8 * 60 * 60 * 1000)
  return {
    year: local.getUTCFullYear(),
    month: local.getUTCMonth() + 1
  }
}

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)
  // 消除尾随斜杠
  const pathname = url.pathname.replace(/\/+$/, '')

  let targetYear = 0
  let targetMonthKey = ''

  // 1. 拦截 match_date
  if (pathname === '/pages/match_date') {
    const rawSearch = url.search.replace(/^\?/, '').trim()
    const match = rawSearch.match(/^(\d{4})([a-zA-Z]{3,})/i)
    if (match && match[1] && match[2]) {
      targetYear = parseInt(match[1], 10)
      targetMonthKey = match[2].toLowerCase().slice(0, 3)
    } else {
      setResponseHeader(event, 'x-redirect-reason', 'invalid-search-format')
      return sendRedirect(event, '/games/mahjongsoul', 302)
    }
  }
  // 2. 拦截 league_result
  else if (pathname === '/league_result') {
    const query = getQuery(event)
    targetYear = parseInt(String(query.league_year || ''), 10)
    targetMonthKey = String(query.league_month || '').trim().toLowerCase()
  }
  // 其他路径直接放行
  else {
    return
  }

  const spec = MONTH_MAP[targetMonthKey]
  if (!targetYear || !spec) {
    setResponseHeader(event, 'x-redirect-reason', 'missing-year-or-month')
    return sendRedirect(event, '/games/mahjongsoul', 302)
  }

  // 3. 查询 Supabase 动态匹配
  try {
    const supabase = await serverSupabaseClient<Database>(event)
    const { data: tournaments, error } = await supabase
      .schema('mahjong')
      .from('tournaments')
      .select('id, title, created_at')

    if (error) {
      console.error('[Middleware Supabase Error]:', error.message)
    }

    if (tournaments && tournaments.length > 0) {
      const hit = tournaments.find((t) => {
        const { year, month } = getLocalYearMonth(t.created_at)
        if (year === targetYear && month === spec.num) return true

        const titleLower = (t.title || '').toLowerCase()
        const titleYearHit = titleLower.includes(String(targetYear))
        const titleMonthHit = spec.aliases.some((alias) => titleLower.includes(alias))
        return titleYearHit && titleMonthHit
      })

      if (hit?.id) {
        setResponseHeader(event, 'x-redirect-reason', `matched-tournament-${hit.id}`)
        return sendRedirect(event, `/games/mahjongsoul/tournaments/${hit.id}`, 301)
      }
    }
  } catch (err: any) {
    console.error('[Middleware Crash]:', err?.message)
  }

  setResponseHeader(event, 'x-redirect-reason', 'tournament-not-found')
  return sendRedirect(event, '/games/mahjongsoul', 302)
})