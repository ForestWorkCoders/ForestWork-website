// Run with: pnpm test  (node's built-in test runner)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  avatarUrl,
  collectMembers,
  countChannelName,
  countRole,
  needsRename,
  retryWaitMs,
  toUserRow,
  type GuildMember,
  type MemberPage
} from '../server/utils/memberSync.ts'

const member = (id: number, roles: string[] = []): GuildMember => ({ user: { id: String(id), username: `u${id}` }, roles })
const page = (from: number, n: number): MemberPage => ({ ok: true, members: Array.from({ length: n }, (_, i) => member(from + i)) })

test('avatarUrl: png, gif for animated hashes, null when unset', () => {
  assert.equal(avatarUrl('1', 'abc'), 'https://cdn.discordapp.com/avatars/1/abc.png')
  assert.equal(avatarUrl('1', 'a_abc'), 'https://cdn.discordapp.com/avatars/1/a_abc.gif')
  assert.equal(avatarUrl('1', null), null)
  assert.equal(avatarUrl('1', ''), null)
})

test('toUserRow maps names, keeps the ID a string and marks the member as in the guild', () => {
  const row = toUserRow(
    { user: { id: '123456789012345678', username: ' Eagle ', global_name: 'Eagle G', avatar: null }, nick: 'Nick', roles: [] },
    'T'
  )
  assert.deepEqual(row, {
    discord_id: '123456789012345678',
    username: 'eagle',
    global_name: 'Eagle G',
    server_nick: 'Nick',
    avatar_url: null,
    in_guild: true,
    synced_at: 'T'
  })
  assert.equal(toUserRow(member(5), 'T').server_nick, null)
  assert.equal(toUserRow(member(5), 'T').global_name, null)
})

test('collectMembers: a short page ends the walk and passes the last ID as the cursor', async () => {
  const afters: string[] = []
  const result = await collectMembers(async (after) => {
    afters.push(after)
    return after === '0' ? page(1, 1000) : page(2000, 3)
  })
  assert.deepEqual(afters, ['0', '1000'])
  assert.equal(result.members.length, 1003)
  assert.equal(result.complete, true)
})

test('collectMembers: exactly 1000 members needs one more (empty) page', async () => {
  const afters: string[] = []
  const result = await collectMembers(async (after) => {
    afters.push(after)
    return after === '0' ? page(1, 1000) : page(0, 0)
  })
  assert.equal(afters.length, 2)
  assert.equal(result.complete, true)
})

test('collectMembers: a failed page is incomplete', async () => {
  let calls = 0
  const result = await collectMembers(async () => (calls++ === 0 ? page(1, 1000) : { ok: false }))
  assert.equal(result.complete, false)
  assert.equal(result.members.length, 1000)
})

test('collectMembers: an empty guild is not trusted as complete', async () => {
  const result = await collectMembers(async () => page(0, 0))
  assert.equal(result.complete, false)
})

test('countRole counts members holding the role', () => {
  const list = [member(1, ['a', 'b']), member(2, ['b']), { user: { id: '3' } } as GuildMember]
  assert.equal(countRole(list, 'b'), 2)
  assert.equal(countRole(list, 'x'), 0)
})

test('channel name and rename decision', () => {
  assert.equal(countChannelName(42), '📜 居民数量 : 42')
  assert.equal(needsRename('📜 居民数量 : 42', countChannelName(42)), false)
  assert.equal(needsRename('📜 居民数量 : 41', countChannelName(42)), true)
  assert.equal(needsRename(undefined, countChannelName(42)), true)
})

test('retryWaitMs caps the wait at 10 seconds', () => {
  assert.equal(retryWaitMs(0.5), 500)
  assert.equal(retryWaitMs(3), 3000)
  assert.equal(retryWaitMs(60), 10_000)
  assert.equal(retryWaitMs(undefined), 10_000)
  assert.equal(retryWaitMs('nope'), 10_000)
})
