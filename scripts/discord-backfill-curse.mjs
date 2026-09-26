// scripts/backfill-curse.mjs
import { createClient } from '@supabase/supabase-js'

// 1. 解析與驗證命令列傳入的年份參數
const rawYear = process.argv[2]
if (!rawYear || !/^\d{4}$/.test(rawYear)) {
  console.error('❌ 請提供正確的 4 位數西元年份！')
  console.error('👉 執行範例: node --env-file=.env scripts/backfill-curse.mjs 2024')
  process.exit(1)
}

const TARGET_YEAR = parseInt(rawYear, 10)
const NEXT_YEAR = TARGET_YEAR + 1

// 2. 環境變數檢查
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN
const CHANNEL_ID = process.env.CURSE_TRACK_CHANNEL_ID
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!DISCORD_BOT_TOKEN || !CHANNEL_ID || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ 缺少必要的環境變數，請確認 --env-file 檔案內容是否完整。')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// 粗口正則清單
const CURSE_REGEX = /(fuck|shit|機掰|雞掰|78|靠邀|靠么|靠北|三小|殺小|3小|尛|你媽的|操|NMSL|CNMB|你媽逼|NMB|媽的|幹|E04|e04|屌|屄|幹你娘|操你媽|你媽死了|林老師勒|王八蛋|米蟲|賤貨|智障|敗類|白癡|北七|婊子|屎|下流|fk|fucking|fucker|nigga|niggas|nigger|老母|林北|林娘|白癡|智障|低能|腦殘|腦缺|腦癱|霍金|北七|87|靠杯|靠腰|靠夭|三洨|啥小|沙小|可悲|臥槽|窩操|王八蛋|wc|sb|傻逼|傻B|狗屎|去死|幹話|屁話|神經病|有病|皮炎|屁眼|p眼|迪克|nmsl|cnmb|nmb|死全家|死媽|死媽的|死你媽|死你全家|全家產|他喵的)/gi

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// 毫秒時間戳轉 Discord Snowflake 演算法
function dateToSnowflake(dateStr) {
  const epoch = 1420070400000n
  const timestamp = BigInt(new Date(dateStr).getTime())
  return String((timestamp - epoch) << 22n)
}

function snowflakeToDate(id) {
  const epoch = 1420070400000n
  const timestamp = Number((BigInt(id) >> 22n) + epoch)
  return new Date(timestamp).toISOString().split('T')[0]
}

async function runBackfill(year) {
  console.log(`🏛️ [Archive] 啟動 ${year} 全年度歷史數據歸檔引擎...`)

  // 嚴格鎖定東八區該年份的完整時間窗口 (從 1/1 00:00 到隔年 1/1 00:00)
  const START_SNOWFLAKE = dateToSnowflake(`${year}-01-01T00:00:00+08:00`)
  const END_SNOWFLAKE = dateToSnowflake(`${NEXT_YEAR}-01-01T00:00:00+08:00`)

  console.log(`📍 起點 ID: ${START_SNOWFLAKE} (${year}-01-01)`)
  console.log(`🛑 終點 ID: ${END_SNOWFLAKE} (${NEXT_YEAR}-01-01 截斷線)`)

  let lastId = START_SNOWFLAKE
  let totalMessagesProcessed = 0
  let totalCurseDetected = 0
  let isCompleted = false

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
      console.warn('⚠️ 網路異常，等待 2 秒後重試...', netErr.message)
      await sleep(2000)
      continue
    }

    if (res.status === 429) {
      const rateData = await res.json().catch(() => ({}))
      const waitSec = rateData.retry_after || 1
      console.warn(`⏳ [Rate Limited] 觸發頻率限制，等待 ${waitSec} 秒...`)
      await sleep(Math.ceil(waitSec * 1000) + 200)
      continue
    }

    if (!res.ok) {
      console.error(`❌ Discord API 異常 (HTTP ${res.status}):`, await res.text())
      break
    }

    const messages = await res.json()
    if (!Array.isArray(messages) || messages.length === 0) {
      console.log('🏁 已無更多歷史訊息。')
      isCompleted = true
      break
    }

    const userBatchMap = new Map()
    let batchNewestId = lastId

    for (const msg of messages) {
      // 一旦消息時間跨入下一年，立即中斷
      if (BigInt(msg.id) >= BigInt(END_SNOWFLAKE)) {
        console.log(`\n🛑 [Boundary Reached] 檢測到抵達 ${NEXT_YEAR}-01-01 邊界訊息 (${msg.id})，立即安全剎車！`)
        isCompleted = true
        break
      }

      totalMessagesProcessed++
      if (msg.author?.bot) continue

      const uId = String(msg.author.id)
      const displayName = msg.author.global_name || msg.author.username || '神秘成員'

      if (!userBatchMap.has(uId)) {
        userBatchMap.set(uId, { username: displayName, curseDelta: 0, msgDelta: 0 })
      }

      const userData = userBatchMap.get(uId)
      userData.msgDelta += 1
      userData.username = displayName

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
        p_year: year,
        p_curse_delta: data.curseDelta,
        p_msg_delta: data.msgDelta
      })

      if (rpcErr) {
        console.error(`\n❌ [RPC 寫入失敗] 使用者: ${userId} (${data.username})`, rpcErr)
        process.exit(1)
      }
    }

    lastId = batchNewestId

    // 即時匯報進度
    const currentDate = snowflakeToDate(lastId)
    console.log(
      `📊 [${year} 歸檔進度] 日期: ${currentDate} | 累計處理: ${totalMessagesProcessed} 條 | 捕獲粗口: ${totalCurseDetected} 次`
    )

    if (messages.length < 100) {
      isCompleted = true
      break
    }

    await sleep(200) // 防禦節流
  }

  console.log(`\n================ ${year} 歸檔總結 ================`)
  console.log(`✅ 掃描 ${year} 訊息總數: ${totalMessagesProcessed}`)
  console.log(`✅ 捕獲 ${year} 粗口總數: ${totalCurseDetected}`)
  console.log(`✅ 狀態: 成功永久歸檔至 ${year} 分區`)
  console.log(`==============================================`)
}

runBackfill(TARGET_YEAR).catch(console.error)