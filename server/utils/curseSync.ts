// server/utils/curseSync.ts
// The paging and checkpoint loop of the curse sync, kept free of Discord and Supabase clients so
// it can be checked on its own (scripts/test-curse-sync.mjs).
import { countCurses } from '../discord/curse-words.mjs'

export interface UserDelta {
  userId: string
  username: string
  year: number
  curseDelta: number
  msgDelta: number
}

// One page of messages, or a request to wait (Discord 429), or a reason to stop.
export type PageResult =
  | { kind: 'messages', messages: any[] }
  | { kind: 'rate-limited', retryAfterMs: number }
  | { kind: 'error' }

export interface CurseSyncOptions {
  startCursor: string
  budgetMs: number
  // Save the counts and move the cursor in one step. Resolves false when the cursor already moved
  // (another run got there first); throws when the save failed.
  apply: (expectedCursor: string, newCursor: string, deltas: UserDelta[]) => Promise<boolean>
  fetchPage: (after: string) => Promise<PageResult>
  checkpointEvery?: number
  maxWaitMs?: number
  now?: () => number
  sleep?: (ms: number) => Promise<void>
}

export interface CurseSyncResult {
  // 'skipped': the cursor moved under us, so we stopped (what was saved before that stays saved)
  status: 'ok' | 'skipped'
  syncedUsers: number
  newCursor: string
  caughtUp: boolean
}

// A Discord ID holds its creation time; the leaderboard year is that time in UTC+8
// (the same rule as scripts/discord-backfill-curse.mjs).
export function messageYear(id: string): number {
  const createdMs = Number((BigInt(id) >> 22n) + 1420070400000n)
  return new Date(createdMs + 8 * 60 * 60 * 1000).getUTCFullYear()
}

export async function runCurseSync(opts: CurseSyncOptions): Promise<CurseSyncResult> {
  const now = opts.now ?? Date.now
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)))
  const checkpointEvery = opts.checkpointEvery ?? 10
  const maxWaitMs = opts.maxWaitMs ?? 10_000

  let cursor = opts.startCursor // furthest message read
  let saved = opts.startCursor // furthest message whose counts are in the database
  let caughtUp = false
  let stale = false
  let syncedUsers = 0
  let pages = 0

  // One entry per user per year, so messages around New Year land in their own year.
  // Emptied after every successful save.
  let deltas = new Map<string, UserDelta>()

  // Returns false when the cursor moved under us.
  const checkpoint = async (): Promise<boolean> => {
    if (cursor === saved) return true
    const ok = await opts.apply(saved, cursor, Array.from(deltas.values()))
    if (!ok) return false
    syncedUsers += deltas.size
    saved = cursor
    deltas = new Map()
    return true
  }

  const deadline = now() + opts.budgetMs

  while (now() < deadline) {
    const page = await opts.fetchPage(cursor)

    if (page.kind === 'error') break

    if (page.kind === 'rate-limited') {
      const wait = Math.min(Math.max(page.retryAfterMs, 0), maxWaitMs)
      if (now() + wait >= deadline) break // no time left to wait and retry
      await sleep(wait)
      continue // same page again
    }

    const { messages } = page
    if (messages.length === 0) {
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

    pages += 1
    if (pages % checkpointEvery === 0 && !(await checkpoint())) {
      stale = true
      break
    }
  }

  if (!stale && !(await checkpoint())) stale = true

  return {
    status: stale ? 'skipped' : 'ok',
    syncedUsers,
    newCursor: saved,
    caughtUp: !stale && caughtUp
  }
}
