// server/api/cron/sync-curse.get.ts
import { createClient } from '@supabase/supabase-js'

// 粗口正則清單 (依據社群常見詞彙維護)
const CURSE_REGEX = /(fuck|shit|機掰|雞掰|78|靠邀|靠么|靠北|三小|殺小|3小|尛|你媽的|操|NMSL|CNMB|你媽逼|NMB|媽的|幹|E04|e04|屌|屄|幹你娘|操你媽|你媽死了|林老師勒|王八蛋|米蟲|賤貨|智障|敗類|白癡|北七|婊子|屎|下流|fk|fucking|fucker|nigga|niggas|nigger|老母|林北|林娘|白癡|智障|低能|腦殘|腦缺|腦癱|霍金|北七|87|靠杯|靠腰|靠夭|三洨|啥小|沙小|可悲|臥槽|窩操|王八蛋|wc|sb|傻逼|傻B|狗屎|去死|幹話|屁話|神經病|有病|皮炎|屁眼|p眼|迪克|nmsl|cnmb|nmb|死全家|死媽|死媽的|死你媽|死你全家|全家產|他喵的")/gi

export default defineEventHandler(async (event) => {
  // 1. 安全防護：校驗 Vercel Cron Secret
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const botToken = process.env.DISCORD_BOT_TOKEN
  const channelId = process.env.CURSE_TRACK_CHANNEL_ID
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!botToken || !channelId || !supabaseUrl || !supabaseKey) {
    throw createError({ statusCode: 500, statusMessage: 'Missing essential environment variables' })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const currentYear = new Date().getFullYear()

  // 2. 獲取上次同步的斷點游標
  const { data: cursorRow } = await supabase
    .schema('trpg')
    .from('sync_cursors')
    .select('last_message_id')
    .eq('channel_id', channelId)
    .maybeSingle()

  let lastId = cursorRow?.last_message_id ? String(cursorRow.last_message_id) : '0'
  let hasMore = true
  const userDeltaMap = new Map<string, number>()
  let newestId = lastId

  console.log(`[Curse Cron] 開始增量拉取頻道 ${channelId}，起點游標: ${lastId}`)

  // 3. 分頁增量抓取 (利用 after 參數，只拉新訊息)
  while (hasMore) {
    const url = new URL(`https://discord.com/api/v10/channels/${channelId}/messages`)
    url.searchParams.set('limit', '100')
    if (lastId !== '0') {
      url.searchParams.set('after', lastId)
    }

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bot ${botToken}` }
    })

    if (!res.ok) {
      console.error(`[Discord API Error]: HTTP ${res.status}`, await res.text())
      break
    }

    const messages = await res.json()
    if (!Array.isArray(messages) || messages.length === 0) {
      hasMore = false
      break
    }

    // 處理當前批次訊息
    for (const msg of messages) {
      if (msg.author?.bot) continue // 排除機器人

      const content = msg.content || ''
      const matches = content.match(CURSE_REGEX)
      if (matches && matches.length > 0) {
        const uId = String(msg.author.id)
        const currentCount = userDeltaMap.get(uId) || 0
        userDeltaMap.set(uId, currentCount + matches.length)
      }

      // 追蹤最大的 Snowflake ID 作為最新游標
      if (BigInt(msg.id) > BigInt(newestId)) {
        newestId = String(msg.id)
      }
    }

    // 將指針向前推移
    lastId = String(messages[messages.length - 1].id)
    if (messages.length < 100) {
      hasMore = false
    }
  }

  // 4. 原子累加回寫至 Supabase
  for (const [userId, delta] of userDeltaMap.entries()) {
    await supabase.rpc('increment_curse_count', {
      p_user_id: userId,
      p_year: currentYear,
      p_delta: delta
    })
  }

  // 5. 儲存最新游標
  if (newestId !== (cursorRow?.last_message_id ? String(cursorRow.last_message_id) : '0')) {
    await supabase
      .schema('trpg')
      .from('sync_cursors')
      .upsert({
        channel_id: channelId,
        last_message_id: newestId,
        updated_at: new Date().toISOString()
      })
  }

  console.log(`[Curse Cron] 同步結束。更新人數: ${userDeltaMap.size}，最新游標: ${newestId}`)

  return {
    status: 'ok',
    syncedUsers: userDeltaMap.size,
    newCursor: newestId
  }
})