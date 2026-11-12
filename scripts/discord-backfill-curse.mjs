// scripts/discord-backfill-curse.mjs
import { createClient } from '@supabase/supabase-js'
import { countCurses } from '../server/discord/curse-words.mjs'

// 1. 解析與驗證命令列傳入的年份參數
const rawYear = process.argv[2]
if (!rawYear || !/^\d{4}$/.test(rawYear)) {
  console.error('❌ 請提供正確的 4 位數西元年份！')
  console.error('👉 執行範例: node --env-file=.env scripts/discord-backfill-curse.mjs 2024')
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
  let reachedLatest = false // true only when the channel has no newer message at all

  // The whole year is added up here first and written once at the end,
  // so a run that fails halfway leaves the database untouched.
  const yearTotals = new Map()

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
      console.error('❌ Nothing was written to the database.')
      process.exit(1)
    }

    const messages = await res.json()
    if (!Array.isArray(messages) || messages.length === 0) {
      console.log('🏁 已無更多歷史訊息。')
      isCompleted = true
      reachedLatest = true
      break
    }

    let batchNewestId = lastId

    for (const msg of messages) {
      // Next year's messages end the run after this page. They are skipped, not a reason to stop
      // reading: a page comes newest first, so this year's messages follow them in the same page.
      if (BigInt(msg.id) >= BigInt(END_SNOWFLAKE)) {
        if (!isCompleted) {
          console.log(`\n🛑 [Boundary Reached] 檢測到抵達 ${NEXT_YEAR}-01-01 邊界訊息 (${msg.id})，立即安全剎車！`)
        }
        isCompleted = true
        continue
      }

      // Track the newest ID before skipping bots, or a bot at the end of a page is fetched again
      if (BigInt(msg.id) > BigInt(batchNewestId)) {
        batchNewestId = String(msg.id)
      }

      totalMessagesProcessed++
      if (msg.author?.bot) continue

      const uId = String(msg.author.id)
      const displayName = msg.author.global_name || msg.author.username || '神秘成員'

      if (!yearTotals.has(uId)) {
        yearTotals.set(uId, { username: displayName, curseDelta: 0, msgDelta: 0 })
      }

      const userData = yearTotals.get(uId)
      userData.msgDelta += 1
      userData.username = displayName

      const curses = countCurses(msg.content || '')
      totalCurseDetected += curses
      userData.curseDelta += curses
    }

    lastId = batchNewestId

    // 即時匯報進度
    const currentDate = snowflakeToDate(lastId)
    console.log(
      `📊 [${year} 歸檔進度] 日期: ${currentDate} | 累計處理: ${totalMessagesProcessed} 條 | 捕獲粗口: ${totalCurseDetected} 次`
    )

    if (isCompleted) break

    if (messages.length < 100) {
      isCompleted = true
      reachedLatest = true
      break
    }

    await sleep(200) // 防禦節流
  }

  // Replace the year's rows: clear them, then write the fresh totals.
  // Running the script again for the same year gives the same numbers instead of adding on top.
  const { error: clearErr } = await supabase.schema('trpg').from('curse_stats').delete().eq('year', year)
  if (clearErr) {
    console.error(`\n❌ [清除 ${year} 舊資料失敗]`, clearErr)
    process.exit(1)
  }

  for (const [userId, data] of yearTotals.entries()) {
    const { error: rpcErr } = await supabase.schema('trpg').rpc('increment_curse_count', {
      p_user_id: userId,
      p_username: data.username,
      p_year: year,
      p_curse_delta: data.curseDelta,
      p_msg_delta: data.msgDelta
    })

    if (rpcErr) {
      console.error(`\n❌ [RPC 寫入失敗] 使用者: ${userId} (${data.username})`, rpcErr)
      console.error(`❌ ${year} is only partly written. Run the script again.`)
      process.exit(1)
    }
  }

  // Caught up with the live channel: tell the daily cron where to continue,
  // so it doesn't count these messages a second time.
  if (reachedLatest) {
    const { error: cursorErr } = await supabase.schema('trpg').from('sync_cursors').upsert({
      channel_id: CHANNEL_ID,
      last_message_id: lastId,
      updated_at: new Date().toISOString()
    })
    if (cursorErr) {
      console.error('\n❌ [游標寫入失敗]', cursorErr)
      process.exit(1)
    }
    console.log(`📌 Cron cursor saved at ${lastId} (${snowflakeToDate(lastId)})`)
  }

  console.log(`\n================ ${year} 歸檔總結 ================`)
  console.log(`✅ 掃描 ${year} 訊息總數: ${totalMessagesProcessed}`)
  console.log(`✅ 捕獲 ${year} 粗口總數: ${totalCurseDetected}`)
  console.log(`✅ 狀態: 成功永久歸檔至 ${year} 分區`)
  console.log(`==============================================`)
}

runBackfill(TARGET_YEAR).catch(console.error)