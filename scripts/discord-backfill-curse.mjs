// scripts/backfill-curse.mjs
import { createClient } from '@supabase/supabase-js'

// 從環境變數讀取憑證 (本地執行自動吃 .env)
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN
const CHANNEL_ID = process.env.CURSE_TRACK_CHANNEL_ID
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const CURSE_REGEX = /(fuck|shit|機掰|雞掰|78|靠邀|靠么|靠北|三小|殺小|3小|尛|你媽的|操|NMSL|CNMB|你媽逼|NMB|媽的|幹|E04|e04|屌|屄|幹你娘|操你媽|你媽死了|林老師勒|王八蛋|米蟲|賤貨|智障|敗類|白癡|北七|婊子|屎|下流|fk|fucking|fucker|nigga|niggas|nigger|老母|林北|林娘|白癡|智障|低能|腦殘|腦缺|腦癱|霍金|北七|87|靠杯|靠腰|靠夭|三洨|啥小|沙小|可悲|臥槽|窩操|王八蛋|wc|sb|傻逼|傻B|狗屎|去死|幹話|屁話|神經病|有病|皮炎|屁眼|p眼|迪克|nmsl|cnmb|nmb|死全家|死媽|死媽的|死你媽|死你全家|全家產|他喵的)/gi
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// 將 Discord Snowflake 轉換為可讀的 UTC 日期字串 (供終端進度回顯)
function snowflakeToDate(id) {
  const epoch = 1420070400000n
  const timestamp = Number((BigInt(id) >> 22n) + epoch)
  return new Date(timestamp).toISOString().split('T')[0]
}

async function runBackfill() {
  console.log('🚀 [Backfill] 啟動 2026 全量歷史數據追溯引擎...')

  // 1. 自動從資料庫獲取上次中斷的游標 (無縫斷點續傳！)
  const { data: cursorRow } = await supabase
    .schema('trpg')
    .from('sync_cursors')
    .select('last_message_id')
    .eq('channel_id', CHANNEL_ID)
    .maybeSingle()

  let lastId = cursorRow?.last_message_id ? String(cursorRow.last_message_id) : '0'
  
  // 若從未同步過，手動設定 2026-01-01 00:00:00 UTC+8 起點 Snowflake
  if (lastId === '0') {
    // 2026-01-01 00:00:00 UTC+8 對應的 Snowflake
    lastId = '1455953654333968458'
  }

  console.log(`📍 [Checkpoint] 從游標 Message ID: ${lastId} (${snowflakeToDate(lastId)}) 開始掃描...`)

  let totalMessagesProcessed = 0
  let totalCurseDetected = 0
  let isCompleted = false
  let currentYear = new Date().getFullYear()

  while (!isCompleted) {
    const url = new URL(`https://discord.com/api/v10/channels/${CHANNEL_ID}/messages`)
    url.searchParams.set('limit', '100')
    url.searchParams.set('after', lastId)

    let res
    try {
      res = await fetch(url.toString(), {
        headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` }
      })
    } catch (netErr) {
      console.warn('⚠️ 網路抖動，等待 2 秒後重試...', netErr.message)
      await sleep(2000)
      continue
    }

    // ★★★ 核心好品味：處理 429 Rate Limit (不退出，精準退避等待) ★★★
    if (res.status === 429) {
      const rateData = await res.json().catch(() => ({}))
      const waitSec = rateData.retry_after || 1
      console.warn(`⏳ [Rate Limited] 觸發限制，依要求等待 ${waitSec} 秒後自動重試...`)
      await sleep(Math.ceil(waitSec * 1000) + 200)
      continue // 重試當前相同的 lastId 請求
    }

    if (!res.ok) {
      console.error(`❌ Discord API 異常 (HTTP ${res.status}):`, await res.text())
      break
    }

    const messages = await res.json()
    if (!Array.isArray(messages) || messages.length === 0) {
      console.log('🏁 [Completed] 已抵達頻道最新訊息，沒有更多歷史數據！')
      isCompleted = true
      break
    }

    // Discord 返回的訊息是按時間升序 (舊 -> 新)
    const userBatchMap = new Map()
    let batchNewestId = lastId

    for (const msg of messages) {
      totalMessagesProcessed++
      if (msg.author?.bot) continue

      const uId = String(msg.author.id)
      // 優先使用伺服器全域暱稱，若無則降級使用 handle
      const displayName = msg.author.global_name || msg.author.username || '神秘調查員'

      if (!userBatchMap.has(uId)) {
        userBatchMap.set(uId, { username: displayName, curseDelta: 0, msgDelta: 0 })
      }

      const userData = userBatchMap.get(uId)
      userData.msgDelta += 1 // ★ 總訊息數原子 +1
      userData.username = displayName // 保持最新名字

      const content = msg.content || ''
      const matches = content.match(CURSE_REGEX)
      if (matches && matches.length > 0) {
        totalCurseDetected += matches.length
        userData.curseDelta += matches.length
      }

      if (BigInt(msg.id) > BigInt(batchNewestId)) {
        batchNewestId = String(msg.id)
      }
    }

    // 原子累加至 Supabase
    for (const [userId, data] of userBatchMap.entries()) {
      const { error: rpcErr } = await supabase.rpc('increment_curse_count', {
        p_user_id: userId,
        p_username: data.username,
        p_year: currentYear,
        p_curse_delta: data.curseDelta,
        p_msg_delta: data.msgDelta
      })

      if (rpcErr) {
        console.error(`\n❌ [RPC 寫入失敗] 使用者: ${userId} (${data.username})`, rpcErr)
        process.exit(1)
      }
    }

    // 更新最新斷點游標
    lastId = batchNewestId
    await supabase
      .schema('trpg')
      .from('sync_cursors')
      .upsert({
        channel_id: CHANNEL_ID,
        last_message_id: lastId,
        updated_at: new Date().toISOString()
      })

    // 終端即時進度匯報
    const currentDate = snowflakeToDate(lastId)
    console.log(
      `📊 [Progress] 日期進度: ${currentDate} | 累計掃描: ${totalMessagesProcessed} 條 | 累計口吐芬芳: ${totalCurseDetected} 次`
    )

    // 若本批次未滿 100 條，說明已追上頻道最新發言
    if (messages.length < 100) {
      console.log('🎉 [Success] 頻道歷史已徹底對齊至最新進度！')
      isCompleted = true
      break
    }

    // ★ 主動防禦節流：每次拉取間隔 200 毫秒，維持在 Discord 限制之內
    await sleep(200)
  }

  console.log(`\n================ 回溯任務總結 ================`)
  console.log(`✅ 最終游標: ${lastId}`)
  console.log(`✅ 掃描訊息總數: ${totalMessagesProcessed}`)
  console.log(`✅ 捕獲口吐芬芳總數: ${totalCurseDetected}`)
  console.log(`==============================================`)
}

runBackfill().catch(console.error)