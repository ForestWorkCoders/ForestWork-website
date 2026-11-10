// server/api/cron/sync-curse.get.ts
import { createClient } from '@supabase/supabase-js'
import { countCurses } from '../../discord/curse-words.mjs'

interface UserDelta {
  userId: string
  username: string
  year: number
  curseDelta: number
  msgDelta: number
}

// How long one run may keep reading pages. Whatever is left waits for the next run.
const TIME_BUDGET_MS = 6000

// A Discord ID holds its creation time; the leaderboard year is that time in UTC+8
// (the same rule as scripts/discord-backfill-curse.mjs).
function messageYear(id: string): number {
  const createdMs = Number((BigInt(id) >> 22n) + 1420070400000n)
  return new Date(createdMs + 8 * 60 * 60 * 1000).getUTCFullYear()
}

export default defineEventHandler(async (event) => {
  // 1. 安全防護：校驗 Vercel Cron Secret
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  // No secret configured = nobody may run it (Vercel's cron sends the secret once it is set)
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
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

  // 2. 獲取上次同步的斷點游標
  const { data: cursorRow } = await supabase
    .schema('trpg')
    .from('sync_cursors')
    .select('last_message_id')
    .eq('channel_id', channelId)
    .maybeSingle()

  const startId = cursorRow?.last_message_id ? String(cursorRow.last_message_id) : '0'
  let cursor = startId
  let caughtUp = false

  // One entry per user per year, so messages around New Year land in their own year
  const deltas = new Map<string, UserDelta>()

  console.log(`[Curse Cron] 開始增量拉取頻道 ${channelId}，起點游標: ${startId}`)

  // 3. Read pages of 100 until there is nothing new or the time budget runs out
  const startedAt = Date.now()
  while (Date.now() - startedAt < TIME_BUDGET_MS) {
    const url = new URL(`https://discord.com/api/v10/channels/${channelId}/messages`)
    url.searchParams.set('limit', '100')
    if (cursor !== '0') {
      url.searchParams.set('after', cursor)
    }

    let res: Response
    try {
      res = await fetch(url.toString(), {
        headers: { Authorization: `Bot ${botToken}` },
        signal: AbortSignal.timeout(5000)
      })
    } catch (err: any) {
      console.error('[Discord API Error]:', err.message)
      break
    }

    if (!res.ok) {
      console.error(`[Discord API Error]: HTTP ${res.status}`, await res.text())
      break
    }

    const messages = await res.json()
    if (!Array.isArray(messages) || messages.length === 0) {
      caughtUp = true
      break
    }

    for (const msg of messages) {
      // Discord returns a page newest first, so the cursor is the largest ID seen, not the last item
      if (BigInt(msg.id) > BigInt(cursor)) {
        cursor = String(msg.id)
      }

      if (msg.author?.bot) continue // 排除機器人

      const userId = String(msg.author.id)
      const year = messageYear(String(msg.id))
      const key = `${year}:${userId}`
      const delta = deltas.get(key) ?? { userId, username: '', year, curseDelta: 0, msgDelta: 0 }

      delta.username = msg.author.global_name || msg.author.username || '神秘成員'
      delta.msgDelta += 1
      delta.curseDelta += countCurses(msg.content || '')
      deltas.set(key, delta)
    }

    if (messages.length < 100) {
      caughtUp = true
      break
    }
  }

  // 4. Save the counts and the new cursor together, in one database transaction.
  //    `applied` is false when the cursor moved since this run started (another run or a
  //    backfill got there first): then nothing is written, so nothing is counted twice.
  let applied = true
  if (cursor !== startId) {
    const { data, error } = await supabase.schema('trpg').rpc('apply_curse_sync', {
      p_channel_id: channelId,
      p_expected_cursor: startId,
      p_new_cursor: cursor,
      p_deltas: Array.from(deltas.values()).map((d) => ({
        user_id: d.userId,
        username: d.username,
        year: d.year,
        curses: d.curseDelta,
        messages: d.msgDelta
      }))
    })

    // Nothing was saved and the cursor did not move: the next run reads the same messages again
    if (error) {
      console.error('[Curse Cron] apply_curse_sync failed:', error.message)
      throw createError({ statusCode: 500, statusMessage: 'Curse sync could not be saved' })
    }
    applied = data === true
  }

  return {
    status: applied ? 'ok' : 'skipped',
    syncedUsers: applied ? deltas.size : 0,
    newCursor: applied ? cursor : startId,
    caughtUp: applied && caughtUp
  }
})
