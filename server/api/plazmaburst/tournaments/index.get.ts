import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'

export interface Pb2TournamentListItem {
  id: string
  title: string
  icon: string
  tier: string
  region: string | null
  start_date: string
  end_date: string
}

export interface Pb2TournamentGroupedList {
  upcoming: Pb2TournamentListItem[]
  ongoing: Pb2TournamentListItem[]
  past: Pb2TournamentListItem[]
}

// 纯函数提取至模块顶层，避免每次请求或循环重复创建函数闭包
function formatDate(dateString: string | null): string {
  if (!dateString) return 'TBD'
  const d = new Date(dateString)
  if (isNaN(d.getTime())) return 'TBD'
  return new Intl.DateTimeFormat('en-CA').format(d)
}

function normalizeTier(tier: string | null): string {
  if (!tier) return 'Tier ?'
  return tier.startsWith('Tier') ? tier : `Tier ${tier}`
}

function parseValidDate(dateString: string | null): Date | null {
  if (!dateString) return null
  const d = new Date(dateString)
  return isNaN(d.getTime()) ? null : d
}

export default defineEventHandler(async (event): Promise<Pb2TournamentGroupedList> => {
  const supabase = await serverSupabaseClient<Database>(event)

  // 抓取所有賽事 (依照建立時間由新到舊排序)
  const { data: tournaments, error } = await supabase
    .schema('plazmaburst')
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  const result: Pb2TournamentGroupedList = {
    upcoming: [],
    ongoing: [],
    past: []
  }

  const nowMs = Date.now()

  tournaments?.forEach((t) => {
    const formattedTourney: Pb2TournamentListItem = {
      id: t.id,
      title: t.title,
      icon: t.icon,
      tier: normalizeTier(t.tier),
      region: t.region,
      start_date: formatDate(t.created_at),
      end_date: formatDate(t.updates_at)
    }

    const startTime = parseValidDate(t.created_at)
    const endTime = parseValidDate(t.updates_at)

    // 缺少必要时间戳，归入历史归档
    if (!startTime || !endTime) {
      result.past.push(formattedTourney)
      return
    }

    const startMs = startTime.getTime()
    const endMs = endTime.getTime()

    if (nowMs < startMs) {
      result.upcoming.push(formattedTourney)
    } else if (nowMs >= startMs && nowMs <= endMs) {
      result.ongoing.push(formattedTourney)
    } else {
      result.past.push(formattedTourney)
    }
  })

  return result
})