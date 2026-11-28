import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabase } from '~~/server/utils/supabase'

export interface MahjongPlayerProfile {
  name: string
  avatar: string | null
}

export interface PlayerDictOptions {
  /** Service-role client for public.discord_users. Defaults to the shared server client. */
  admin?: SupabaseClient<any, any>
  /** Name shown as `<prefix>_<account id>` when nothing else is known. */
  fallbackPrefix?: string
}

/**
 * 跨 Schema 批量撈取玩家暱稱與 Discord 頭像
 * Name order: mahjong nickname, server nickname, Discord display name, Discord handle, fallback.
 */
export async function fetchPlayerDict(
  supabase: SupabaseClient<any, any>,
  accountIds: Set<number> | number[],
  { admin = getSupabase(), fallbackPrefix = 'Unknown' }: PlayerDictOptions = {}
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
  const { data: profiles } = await admin
    .schema('public')
    .from('discord_users')
    .select('discord_id_str:discord_id::text, username, global_name, server_nick, avatar_url')
    .in('discord_id', discordIdsStr as unknown as number[])

  // 3. 組裝為高效查詢字典
  const playerDict = new Map<number, MahjongPlayerProfile>()
  participants?.forEach((p: any) => {
    const profile = profiles?.find((pr: any) => pr.discord_id_str === p.discord_id_str)
    playerDict.set(p.account_id, {
      name: p.nickname || profile?.server_nick || profile?.global_name || profile?.username || `${fallbackPrefix}_${p.account_id}`,
      avatar: profile?.avatar_url || null
    })
  })

  return playerDict
}