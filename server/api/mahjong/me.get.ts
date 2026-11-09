// server/api/mahjong/me.get.ts
import { serverSupabaseClient } from '#supabase/server'
import { getCookie } from 'h3'
import { unsealSessionData, SESSION_COOKIE_NAME } from '../../utils/session'
import type { Database } from '~/types/database.types'

export default defineEventHandler(async (event) => {
  // 1. The login cookie, with its signature checked (a forged cookie gives null)
  const sessionUser = unsealSessionData(getCookie(event, SESSION_COOKIE_NAME))

  // 若未登入或 Cookie 無效，回傳訪客態
  if (!sessionUser?.id) {
    return { loggedIn: false, linked: false, player: null }
  }

  const supabase = await serverSupabaseClient<Database>(event)

  // 2. 提取 Discord ID (保持字串，型別強轉為 number 通過 TS 檢查)
  const discordIdStr = String(sessionUser.id).trim()

  const { data: participant, error } = await supabase
    .schema('mahjong')
    .from('participants')
    .select('account_id, nickname, discord_id')
    .eq('discord_id', discordIdStr as unknown as number)
    .maybeSingle()

  if (error || !participant) {
    return {
      loggedIn: true,
      linked: false,
      discordUser: sessionUser,
      player: null
    }
  }

  // 3. 成功命中
  return {
    loggedIn: true,
    linked: true,
    discordUser: sessionUser,
    player: {
      accountId: participant.account_id,
      nickname: participant.nickname
    }
  }
})