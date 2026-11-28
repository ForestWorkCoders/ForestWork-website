// Pure helpers for the Discord member sync (server/api/cron/sync-members.get.ts).
// Nothing here touches the network or the database, so tests can import this file directly.

export const MEMBERS_PAGE_SIZE = 1000
export const MAX_RETRY_WAIT_MS = 10_000

export interface GuildMember {
  user: {
    id: string
    username?: string | null
    global_name?: string | null
    avatar?: string | null
  }
  nick?: string | null
  roles?: string[]
  /** ISO timestamp of when the member (last) joined the server */
  joined_at?: string | null
}

export interface DiscordUserRow {
  discord_id: string
  username: string
  global_name: string | null
  server_nick: string | null
  avatar_url: string | null
  in_guild: true
  synced_at: string
  /** Left out when Discord does not send it, so an existing value is kept */
  joined_at?: string
}

export type MemberPage = { ok: true, members: GuildMember[] } | { ok: false }

/** Discord CDN URL of a user's own avatar: .gif for animated hashes, .png otherwise, null when unset. */
export function avatarUrl(userId: string, hash?: string | null): string | null {
  if (!hash) return null
  const ext = hash.startsWith('a_') ? 'gif' : 'png'
  return `https://cdn.discordapp.com/avatars/${userId}/${hash}.${ext}`
}

export function toUserRow(member: GuildMember, syncedAt: string): DiscordUserRow {
  const { user } = member
  const row: DiscordUserRow = {
    discord_id: String(user.id),
    username: String(user.username || '').trim().toLowerCase(),
    global_name: user.global_name ? String(user.global_name).trim() : null,
    server_nick: member.nick ? String(member.nick).trim() : null,
    avatar_url: avatarUrl(String(user.id), user.avatar),
    in_guild: true,
    synced_at: syncedAt
  }
  if (member.joined_at) row.joined_at = member.joined_at
  return row
}

/**
 * Reads the whole member list, page by page, `after` the last user ID of the previous page.
 * A short page is the last one. A failed page, or an empty first page, makes the list
 * incomplete: the caller must then not conclude that anyone left.
 */
export async function collectMembers(
  fetchPage: (after: string) => Promise<MemberPage>
): Promise<{ members: GuildMember[], complete: boolean }> {
  const members: GuildMember[] = []
  let after = '0'
  for (;;) {
    const page = await fetchPage(after)
    if (!page.ok) return { members, complete: false }
    members.push(...page.members)
    if (page.members.length < MEMBERS_PAGE_SIZE) {
      return { members, complete: members.length > 0 }
    }
    after = String(page.members[page.members.length - 1]!.user.id)
  }
}

export function countRole(members: GuildMember[], roleId: string): number {
  return members.reduce((n, m) => n + (Array.isArray(m.roles) && m.roles.includes(roleId) ? 1 : 0), 0)
}

export function countChannelName(count: number): string {
  return `📜 居民数量 : ${count}`
}

/** Channel renames are tightly rate limited, so only rename when the name really differs. */
export function needsRename(currentName: unknown, targetName: string): boolean {
  return currentName !== targetName
}

/** Milliseconds to wait after a 429: Discord's `retry_after` (seconds), capped. Unknown values wait the cap. */
export function retryWaitMs(retryAfterSeconds: unknown): number {
  if (retryAfterSeconds == null || retryAfterSeconds === '') return MAX_RETRY_WAIT_MS
  const seconds = Number(retryAfterSeconds)
  if (!Number.isFinite(seconds) || seconds < 0) return MAX_RETRY_WAIT_MS
  return Math.min(Math.ceil(seconds * 1000), MAX_RETRY_WAIT_MS)
}
