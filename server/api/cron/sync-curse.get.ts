// server/api/cron/sync-curse.get.ts
import { createClient } from '@supabase/supabase-js'

// How long one run may keep reading pages; whatever is left waits for the next run.
// The default fits a 10 s function limit. Set CURSE_SYNC_BUDGET_MS higher (for example 240000)
// only when the function's max duration is raised to match.
const DEFAULT_BUDGET_MS = 8000

export default defineEventHandler(async (event) => {
  // 1. 安全防護：校驗 Cron Secret
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
  const budgetMs = Number(process.env.CURSE_SYNC_BUDGET_MS) || DEFAULT_BUDGET_MS

  console.log(`[Curse Cron] 開始增量拉取頻道 ${channelId}，起點游標: ${startId}`)

  // 3. Read pages of 100, saving every few pages, until there is nothing new or the time budget runs out
  return await runCurseSync({
    startCursor: startId,
    budgetMs,
    fetchPage: async (after) => {
      const url = new URL(`https://discord.com/api/v10/channels/${channelId}/messages`)
      url.searchParams.set('limit', '100')
      if (after !== '0') {
        url.searchParams.set('after', after)
      }

      let res: Response
      try {
        res = await fetch(url.toString(), {
          headers: { Authorization: `Bot ${botToken}` },
          signal: AbortSignal.timeout(5000)
        })
      } catch (err: any) {
        console.error('[Discord API Error]:', err.message)
        return { kind: 'error' }
      }

      if (res.status === 429) {
        const body: any = await res.json().catch(() => ({}))
        const raw = body?.retry_after ?? res.headers.get('retry-after')
        const seconds = raw == null ? NaN : Number(raw)
        return { kind: 'rate-limited', retryAfterMs: (Number.isFinite(seconds) ? seconds : 1) * 1000 }
      }

      if (!res.ok) {
        console.error(`[Discord API Error]: HTTP ${res.status}`, await res.text())
        return { kind: 'error' }
      }

      const messages = await res.json()
      return { kind: 'messages', messages: Array.isArray(messages) ? messages : [] }
    },
    // Counts and the new cursor go in together, in one database transaction. `false` means the
    // cursor moved since we read it (another run or a backfill got there first): nothing is
    // written, so nothing is counted twice.
    apply: async (expectedCursor, newCursor, deltas) => {
      const { data, error } = await supabase.schema('trpg').rpc('apply_curse_sync', {
        p_channel_id: channelId,
        p_expected_cursor: expectedCursor,
        p_new_cursor: newCursor,
        p_deltas: deltas.map((d) => ({
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
      return data === true
    }
  })
})
