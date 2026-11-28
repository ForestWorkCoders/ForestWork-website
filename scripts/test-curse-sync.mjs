// Local check of the curse sync loop (no network, no database):
//   node scripts/test-curse-sync.mjs
// Uses Node's built-in type stripping to import the .ts module.
import assert from 'node:assert/strict'
import { runCurseSync, messageYear } from '../server/utils/curseSync.ts'

const DISCORD_EPOCH = 1420070400000n
const idAt = (ms, seq) => String(((BigInt(ms) - DISCORD_EPOCH) << 22n) + BigInt(seq))

// A fake channel: messages with increasing IDs around New Year (UTC+8), some from bots.
function makeChannel(count) {
  const base = Date.UTC(2025, 11, 31, 15, 0, 0) - 60 * 60 * 1000 // ends a bit after 2026-01-01 00:00 UTC+8
  const messages = []
  for (let i = 0; i < count; i++) {
    messages.push({
      id: idAt(base + i * 60 * 1000, i),
      author: { id: String(1000 + (i % 7)), username: `u${i % 7}`, bot: i % 11 === 0 },
      content: i % 3 === 0 ? 'fuck' : 'hello'
    })
  }
  return messages
}

// Pages of up to 100 after `after`, newest first inside a page, like Discord.
const pageFrom = (channel) => async (after) => {
  const next = channel.filter(m => BigInt(m.id) > BigInt(after)).slice(0, 100).reverse()
  return { kind: 'messages', messages: next }
}

// A fake database: totals per user+year and the cursor, with the same stale-cursor rule.
function makeDb(start = '0') {
  const db = { cursor: start, totals: new Map(), applies: 0 }
  db.apply = async (expected, next, deltas) => {
    if (db.cursor !== expected) return false
    for (const d of deltas) {
      const key = `${d.year}:${d.userId}`
      const t = db.totals.get(key) ?? { curses: 0, messages: 0 }
      t.curses += d.curseDelta
      t.messages += d.msgDelta
      db.totals.set(key, t)
    }
    db.cursor = next
    db.applies += 1
    return true
  }
  return db
}

const channel = makeChannel(1234)

// 1. Checkpointing gives the same counts as one save at the end, with the cursor at the last message.
{
  const one = makeDb()
  const r1 = await runCurseSync({ startCursor: '0', budgetMs: 60_000, checkpointEvery: 1000, apply: one.apply, fetchPage: pageFrom(channel) })
  const many = makeDb()
  const r2 = await runCurseSync({ startCursor: '0', budgetMs: 60_000, checkpointEvery: 3, apply: many.apply, fetchPage: pageFrom(channel) })

  assert.equal(one.applies, 1)
  assert.ok(many.applies > 1, 'saved more than once')
  assert.deepEqual([...many.totals].sort(), [...one.totals].sort())
  assert.equal(many.cursor, channel.at(-1).id)
  assert.equal(r1.caughtUp, true)
  assert.equal(r2.caughtUp, true)
  assert.equal(r2.status, 'ok')
  assert.equal(r2.newCursor, channel.at(-1).id)
  // Bots are skipped, and both years show up
  const total = [...many.totals.values()].reduce((n, t) => n + t.messages, 0)
  assert.equal(total, channel.filter(m => !m.author.bot).length)
  assert.deepEqual([...new Set([...many.totals.keys()].map(k => k.split(':')[0]))].sort(), ['2025', '2026'])
  assert.equal(messageYear(channel[0].id), 2025)
}

// 2. The cursor moves under us at the second checkpoint: stop, keep what was saved, write nothing more.
{
  const db = makeDb()
  let calls = 0
  const apply = async (e, n, d) => {
    calls += 1
    if (calls === 2) db.cursor = 'moved' // someone else got there first
    return db.apply(e, n, d)
  }
  const r = await runCurseSync({ startCursor: '0', budgetMs: 60_000, checkpointEvery: 2, apply, fetchPage: pageFrom(channel) })
  assert.equal(r.status, 'skipped')
  assert.equal(r.caughtUp, false)
  assert.equal(db.applies, 1)
  assert.notEqual(r.newCursor, '0') // the first checkpoint stays saved
  assert.equal(calls, 2)
}

// 3. A 429 waits (capped) and retries the same page without losing or repeating it.
{
  const db = makeDb()
  const waits = []
  let first = true
  const fetchPage = async (after) => {
    if (first) { first = false; return { kind: 'rate-limited', retryAfterMs: 60_000 } }
    return pageFrom(channel)(after)
  }
  const r = await runCurseSync({ startCursor: '0', budgetMs: 600_000, apply: db.apply, fetchPage, sleep: async ms => { waits.push(ms) } })
  assert.deepEqual(waits, [10_000]) // capped at 10 s
  assert.equal(r.caughtUp, true)
  const total = [...db.totals.values()].reduce((n, t) => n + t.messages, 0)
  assert.equal(total, channel.filter(m => !m.author.bot).length)
}

// 4. A 429 that would outlast the budget ends the run; what was read is still saved.
{
  const db = makeDb()
  let t = 0
  let n = 0
  const fetchPage = async (after) => (++n === 1 ? pageFrom(channel)(after) : { kind: 'rate-limited', retryAfterMs: 5_000 })
  const r = await runCurseSync({ startCursor: '0', budgetMs: 1_000, now: () => t, apply: db.apply, fetchPage, sleep: async ms => { t += ms } })
  assert.equal(r.caughtUp, false)
  assert.equal(db.applies, 1)
  assert.equal(db.cursor, channel[99].id)
}

// 5. A fetch error saves what was read; a failed save throws.
{
  const db = makeDb()
  let n = 0
  const fetchPage = async (after) => (++n === 1 ? pageFrom(channel)(after) : { kind: 'error' })
  const r = await runCurseSync({ startCursor: '0', budgetMs: 60_000, apply: db.apply, fetchPage })
  assert.equal(r.status, 'ok')
  assert.equal(r.caughtUp, false)
  assert.equal(db.cursor, channel[99].id)
  await assert.rejects(runCurseSync({
    startCursor: '0', budgetMs: 60_000, fetchPage: pageFrom(channel),
    apply: async () => { throw new Error('db down') }
  }), /db down/)
}

// 6. Nothing new: no save at all.
{
  const db = makeDb(channel.at(-1).id)
  const r = await runCurseSync({ startCursor: channel.at(-1).id, budgetMs: 60_000, apply: db.apply, fetchPage: pageFrom(channel) })
  assert.equal(db.applies, 0)
  assert.equal(r.caughtUp, true)
  assert.equal(r.syncedUsers, 0)
}

console.log('curse sync checks passed')
