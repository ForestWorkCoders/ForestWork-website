// server/api/mahjong/me.get.ts
import { serverSupabaseClient } from '#supabase/server'
import { getCookie } from 'h3'
import type { Database } from '~/types/database.types'

// 好品味防禦：精準相容 2段式簽名Cookie (data.sig)、3段式JWT (h.p.s) 與裸JSON
function parseSessionUser(rawCookie: string | undefined | null) {
  if (!rawCookie) return null
  try {
    const trimmed = rawCookie.trim()
    // 1. 裸 JSON
    if (trimmed.startsWith('{')) {
      return JSON.parse(trimmed)
    }

    // 2. 核心修復：按 '.' 拆分！
    // 簽名 Cookie (data.sig) 的 Payload 是 parts[0]
    // JWT (header.payload.sig) 的 Payload 是 parts[1]
    const parts = trimmed.split('.')
    const rawPayload = parts.length === 3 ? parts[1] : parts[0]

    if (!rawPayload) return null

    // 解碼純淨的 Base64 Payload (徹底排除尾部 Signature 亂碼干擾)
    const decoded = Buffer.from(rawPayload, 'base64').toString('utf-8')
    return JSON.parse(decoded)
  } catch (err: any) {
    console.error('[Mahjong Auth] Cookie 解碼致命異常:', err.message)
    return null
  }
}

export default defineEventHandler(async (event) => {
  // 1. 提取 Cookie
  const rawCookie = getCookie(event, 'fw_session')

  // ★★★ 核心好品味：入口無條件打出 X 光日誌，消滅黑盒！ ★★★
  console.log(`[Mahjong Auth Probe] 
    收到 Cookie 長度: ${rawCookie ? rawCookie.length : 0}
    Cookie 開頭特徵: ${rawCookie ? rawCookie.slice(0, 15) + '...' : '空(未登入)'}
  `)

  const sessionUser = event.context.user || parseSessionUser(rawCookie)

  console.log(`[Mahjong Auth Probe] 解析出的 SessionUser:`, sessionUser ? JSON.stringify(sessionUser) : '無效或未授權')

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