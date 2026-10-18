// server/api/giveaway/pull.post.ts
import { defineEventHandler, createError, readBody } from 'h3'

interface DiscordUser {
  id: string
  username: string
  global_name: string | null
  avatar: string | null
  bot?: boolean
}

// 核心：必须是 export default defineEventHandler，不要加括号调用，不要改名字！
// server/api/giveaway/pull.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const pollUrl = String(body?.pollUrl || '').trim()

  if (!pollUrl) {
    throw createError({ statusCode: 400, statusMessage: '缺少 Discord 消息链接' })
  }

  // 1. 好品味正则：同时提取 channelId、messageId 与末尾可选的 #选项编号 (例如 .../14786264606#2)
  const match = pollUrl.match(/channels\/\d+\/(\d+)\/(\d+)(?:[#?](?:answer=|opt=)?(\d+))?/)
  if (!match) {
    throw createError({ statusCode: 400, statusMessage: '非法的 Discord 消息链接格式' })
  }

  // 干净解构出三个物理坐标
  const [, channelId, messageId, urlAnswerId] = match

  // 2. 核心优雅管道：显式入参 > URL Hash 锚点 > 默认第 1 项
  const answerId = Number(body?.answerId) || Number(urlAnswerId) || 1

  const botToken = process.env.DISCORD_BOT_TOKEN
  if (!botToken) {
    throw createError({ statusCode: 500, statusMessage: '服务端未配置 DISCORD_BOT_TOKEN' })
  }

  // ========================================================================
  // 以下分页拉取逻辑保持原样，无需修改任何一行！
  // ========================================================================
  const votersMap = new Map<string, { id: string; name: string; avatarUrl?: string }>()
  let lastId: string | null = null
  let hasMore = true

  while (hasMore) {
    const endpoint = new URL(`https://discord.com/api/v10/channels/${channelId}/polls/${messageId}/answers/${answerId}`)
    endpoint.searchParams.set('limit', '100')
    if (lastId) endpoint.searchParams.set('after', lastId)

    const res = await fetch(endpoint.toString(), {
      headers: { Authorization: `Bot ${botToken}` }
    })

    if (!res.ok) {
      throw createError({ statusCode: res.status, statusMessage: `Discord API 报错: HTTP ${res.status}` })
    }

    const data = await res.json()
    const users: DiscordUser[] = data.users || []

    if (users.length === 0) break

    for (const u of users) {
      if (u.bot) continue
      const displayName = u.global_name || u.username
      const avatarUrl = u.avatar 
        ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=64` 
        : undefined
      votersMap.set(u.id, { id: u.id, name: displayName, avatarUrl })
    }

    if (users.length < 100) {
      hasMore = false
    } else {
      lastId = users[users.length - 1]!.id
    }
  }

  const candidates = Array.from(votersMap.values())
  if (candidates.length === 0) {
    throw createError({ statusCode: 400, statusMessage: `该投票选项 (#${answerId}) 没有任何玩家参与` })
  }

  return { candidates }
})