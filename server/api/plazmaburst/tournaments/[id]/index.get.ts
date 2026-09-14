import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'

function formatDate(dateString: string | null): string {
  if (!dateString) return 'TBD'
  try {
    return new Intl.DateTimeFormat('en-CA').format(new Date(dateString))
  } catch {
    return 'TBD'
  }
}

function resolveTournamentStatus(startTime: Date | null, endTime: Date | null): string {
  if (!startTime || !endTime) return '未知狀態'
  const now = new Date()
  if (now > endTime) return '已結束 · Ended'
  if (now >= startTime && now <= endTime) return '進行中 · Ongoing'
  return '即將開始 · Upcoming'
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: '缺少賽事 ID' })
  }

  const supabase = await serverSupabaseClient<Database>(event)

  const { data: tourney, error } = await supabase
    .schema('plazmaburst')
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !tourney) {
    throw createError({ statusCode: 404, statusMessage: '找不到該賽事' })
  }

  const startTime = tourney.created_at ? new Date(tourney.created_at) : null
  const endTime = tourney.updates_at ? new Date(tourney.updates_at) : null

  return {
    id: tourney.id,
    title: tourney.title,
    tier: tourney.tier,
    region: tourney.region,
    imageUrl: tourney.icon,
    duration: `${formatDate(tourney.created_at)} ~ ${formatDate(tourney.updates_at)}`,
    status: resolveTournamentStatus(startTime, endTime),
    organizer: tourney.organizer,
    format: tourney.format,
    created_at: tourney.created_at,
    content_url: tourney.content_url
  }
})