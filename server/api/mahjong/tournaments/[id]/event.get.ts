import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { fetchPlayerDict } from '~~/server/utils/mahjongPlayer'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: '缺少賽事 ID' })

  const supabase = await serverSupabaseClient<Database>(event)

  // 1. 撈取 JSON 資料
  const { data: tourney } = await supabase
    .schema('mahjong')
    .from('tournaments')
    .select('phase_configs')
    .eq('id', id)
    .single()

  let eventData: any = {}
  if (typeof tourney?.phase_configs === 'string') {
    try { eventData = JSON.parse(tourney.phase_configs) } catch { eventData = {} }
  } else if (tourney?.phase_configs && typeof tourney.phase_configs === 'object') {
    eventData = tourney.phase_configs
  }

  if (!eventData.rosters || !Array.isArray(eventData.rosters)) {
    return eventData
  }

  // 2. 收集所有的 account_id
  const accountIds = new Set<number>()
  eventData.rosters.forEach((group: any) => {
    if (Array.isArray(group.players)) {
      group.players.forEach((playerId: any) => {
        if (typeof playerId === 'number') accountIds.add(playerId)
      })
    }
  })

  if (accountIds.size === 0) return eventData

  // 3. 呼叫公共工具函式水合資料 (消滅重複代碼)
  const playerDict = await fetchPlayerDict(supabase, accountIds)

  // 4. 將真實資料注入回 JSON
  eventData.rosters = eventData.rosters.map((group: any) => ({
    ...group,
    players: group.players.map((playerId: number) => {
      const playerData = playerDict.get(playerId)
      return {
        account_id: playerId,
        name: playerData?.name || `ID:${playerId}`,
        avatar: playerData?.avatar || 'https://avatars.githubusercontent.com/u/739984?v=4'
      }
    })
  }))

  return eventData
})