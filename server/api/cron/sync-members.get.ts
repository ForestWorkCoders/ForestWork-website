// server/api/cron/sync-members.get.ts
import { createClient } from '@supabase/supabase-js'
import {
  MEMBERS_PAGE_SIZE,
  collectMembers,
  countChannelName,
  countRole,
  needsRename,
  retryWaitMs,
  toUserRow,
  type MemberPage
} from '../../utils/memberSync'

const DISCORD_API = 'https://discord.com/api/v10'
const UPSERT_CHUNK = 500
const FETCH_TIMEOUT_MS = 8000

// One Discord call with a timeout. On a 429 it waits `retry_after` (capped) and tries once more.
// Returns null when the request itself fails (network error or timeout).
async function discordRequest(url: string, botToken: string, init: RequestInit = {}): Promise<Response | null> {
  const send = () => fetch(url, {
    ...init,
    headers: { ...(init.headers as Record<string, string> | undefined), Authorization: `Bot ${botToken}` },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
  })

  try {
    let res = await send()
    if (res.status === 429) {
      const body = await res.json().catch(() => null)
      const wait = retryWaitMs(body?.retry_after ?? res.headers.get('retry-after'))
      await new Promise(resolve => setTimeout(resolve, wait))
      res = await send()
    }
    return res
  } catch (err) {
    console.error('[Member Sync] Discord request failed:', err instanceof Error ? err.name : 'error')
    return null
  }
}

export default defineEventHandler(async (event) => {
  // Same guard as the other cron endpoints: no secret configured = nobody may run it
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const botToken = process.env.DISCORD_BOT_TOKEN
  const guildId = process.env.DISCORD_GUILD_ID
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!botToken || !guildId || !supabaseUrl || !supabaseKey) {
    throw createError({ statusCode: 500, statusMessage: 'Missing essential environment variables' })
  }

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
  const runStart = new Date().toISOString()

  // 1. Read the whole member list, 1000 per page
  const { members, complete: listComplete } = await collectMembers(async (after): Promise<MemberPage> => {
    const url = new URL(`${DISCORD_API}/guilds/${guildId}/members`)
    url.searchParams.set('limit', String(MEMBERS_PAGE_SIZE))
    if (after !== '0') url.searchParams.set('after', after)

    const res = await discordRequest(url.toString(), botToken)
    if (!res || !res.ok) {
      if (res) console.error(`[Member Sync] Member list failed: HTTP ${res.status}`)
      return { ok: false }
    }
    const page = await res.json().catch(() => null)
    return Array.isArray(page) ? { ok: true, members: page } : { ok: false }
  })

  // 2. Upsert everyone we saw. joined_at is only sent when Discord gave it. A batch must not mix rows
  //    with and without the key (missing keys would be written as null), so the two kinds go in separate batches.
  let complete = listComplete
  let upserted = 0
  const allRows = members.map(m => toUserRow(m, runStart))
  const batches = [allRows.filter(r => r.joined_at), allRows.filter(r => !r.joined_at)]
  const chunks = batches.flatMap(rows =>
    Array.from({ length: Math.ceil(rows.length / UPSERT_CHUNK) }, (_, i) => rows.slice(i * UPSERT_CHUNK, (i + 1) * UPSERT_CHUNK)))
  for (const chunk of chunks) {
    const { error } = await supabase.from('discord_users').upsert(chunk, { onConflict: 'discord_id' })
    if (error) {
      console.error('[Member Sync] Upsert failed:', error.message)
      complete = false
      break
    }
    upserted += chunk.length
  }

  // 3. Whoever this run did not see has left. Only conclude that from a complete list. Rows are never deleted.
  let markedLeft = 0
  if (complete) {
    const { error, count } = await supabase
      .from('discord_users')
      .update({ in_guild: false }, { count: 'exact' })
      .eq('in_guild', true)
      .lt('synced_at', runStart)
    if (error) {
      console.error('[Member Sync] Mark-left failed:', error.message)
      complete = false
    } else {
      markedLeft = count ?? 0
    }
  }

  // 4. Member count channel: only from a complete list, and only when both IDs are configured
  let roleCount: number | null = null
  let renamed = false
  const countRoleId = process.env.COUNT_ROLE_ID
  const countChannelId = process.env.COUNT_CHANNEL_ID
  if (complete && countRoleId && countChannelId) {
    roleCount = countRole(members, countRoleId)
    const target = countChannelName(roleCount)

    const current = await discordRequest(`${DISCORD_API}/channels/${countChannelId}`, botToken)
    if (current?.ok) {
      const channel = await current.json().catch(() => null)
      if (channel && needsRename(channel.name, target)) {
        const patch = await discordRequest(`${DISCORD_API}/channels/${countChannelId}`, botToken, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: target })
        })
        renamed = !!patch?.ok
        if (!renamed) console.error(`[Member Sync] Rename failed: ${patch ? `HTTP ${patch.status}` : 'no response'}`)
      }
    } else {
      console.error(`[Member Sync] Channel read failed: ${current ? `HTTP ${current.status}` : 'no response'}`)
    }
  }

  return { members: members.length, upserted, markedLeft, roleCount, renamed, complete }
})
