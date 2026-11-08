import type { SupabaseClient } from '@supabase/supabase-js'

export interface MahjongPlayerProfile {
  name: string
  avatar: string | null
}

/**
 * 跨 Schema 批量撈取玩家暱稱與 Discord 頭像
 */
export async function fetchPlayerDict(
  supabase: SupabaseClient<any, any>,
  accountIds: Set<number> | number[]
): Promise<Map<number, MahjongPlayerProfile>> {
  const idsArray = Array.from(accountIds)
  if (idsArray.length === 0) return new Map()

  // 1. 撈取麻將參賽者基本資訊與文字化 Discord ID
  const { data: participants } = await supabase
    .schema('mahjong')
    .from('participants')
    .select('account_id, nickname, discord_id_str:discord_id::text')
    .in('account_id', idsArray)

  const discordIdsStr = participants?.map((p: any) => p.discord_id_str).filter(Boolean) as string[]

  // 2. 跨 Schema 撈取 Discord 頭像與用戶名
  const { data: profiles } = await supabase
    .schema('public')
    .from('participant_data')
    .select('discord_id_str:discord_id::text, discord_username, profile_img')
    .in('discord_id', discordIdsStr as unknown as number[])

  // 3. 組裝為高效查詢字典
  const playerDict = new Map<number, MahjongPlayerProfile>()
  participants?.forEach((p: any) => {
    const profile = profiles?.find((pr: any) => pr.discord_id_str === p.discord_id_str)
    playerDict.set(p.account_id, {
      name: p.nickname || profile?.discord_username || `Unknown_${p.account_id}`,
      avatar: profile?.profile_img || null
    })
  })

  return playerDict
}