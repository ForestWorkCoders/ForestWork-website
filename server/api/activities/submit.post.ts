// server/api/activities/submit.post.ts
import { serverSupabaseServiceRole, serverSupabaseClient } from '#supabase/server'
import { unsealSessionData } from '../../utils/session'

interface SubmitBody {
  authTicket?: string // 来自 auth 接口的签名通行证
  moduleId?: number
  score?: number
  rating?: string
  metrics?: unknown[]
}

export default defineEventHandler(async (event) => {
  const body = await readBody<SubmitBody>(event)

  // 1. ★ 汲取 CTF 精华：从签名票据提取真实 Discord 身份，彻底杜绝客户端伪造 ID！
  let verifiedDiscordId: string | null = null

  if (body?.authTicket) {
    const session = unsealSessionData(body.authTicket)
    if (session?.id) {
      verifiedDiscordId = String(session.id)
    }
  }

  // 开发与沙盒降级兜底
  if (!verifiedDiscordId) {
    if (process.env.NODE_ENV !== 'production') {
      verifiedDiscordId = '10001'
    } else {
      throw createError({
        statusCode: 401,
        statusMessage: 'ACCESS_DENIED: Invalid or expired activity authorization ticket.'
      })
    }
  }

  // 2. ★ 汲取 CTF 精华：可选的 Discord 社群成员门禁校验（仅针对真实选手生效）[cite: 21]
  const guildId = process.env.DISCORD_GUILD_ID
  const botToken = process.env.DISCORD_BOT_TOKEN

  if (botToken && guildId && verifiedDiscordId !== '10001') {
    try {
      const memberRes = await fetch(
        `https://discord.com/api/v10/guilds/${guildId}/members/${verifiedDiscordId}`,
        {
          headers: {
            Authorization: `Bot ${botToken}`,
            'User-Agent': 'ForestWork-Activity-Mainframe/1.0'
          }
        }
      )

      if (memberRes.status === 404) {
        throw createError({
          statusCode: 403,
          statusMessage: '[-] ACCESS DENIED: Operator is not enlisted in ForestWork Discord headquarters.'
        })
      }
    } catch (err: any) {
      // 保证高可用：非 403 阻断性异常时记录警告并放行，防止 Discord API 抖动中断赛事[cite: 21]
      if (err.statusCode === 403) throw err
      console.warn('[-] Guild verification bypass due to network/API state:', err.message)
    }
  }

  // 3. 严格数据结构与物理边界校验
  const moduleId = Number(body?.moduleId)
  const score = Number(body?.score)
  const rating = typeof body?.rating === 'string' && body.rating.trim().length > 0
    ? body.rating.trim()
    : 'COMBAT READY'
  const metrics = Array.isArray(body?.metrics) ? body.metrics : []

  if (!Number.isInteger(moduleId) || moduleId < 1 || moduleId > 10) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid moduleId: Must be between 1 and 10.' })
  }

  if (!Number.isInteger(score) || score < 0 || score > 50000) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid score: Must be between 0 and 50000.' })
  }

  // 4. ★ 汲取 CTF 精华：使用 ServiceRole 执行特权写入，彻底免疫 RLS 拦截[cite: 27]
  const supabase = serverSupabaseServiceRole(event)

  const { data, error } = await supabase
    .schema('trpg')
    .from('skill_test_attempts')
    .insert({
      // 纯字符串转无损数字类型，防 18 位 Snowflake 被浮点数截断
      discord_id: verifiedDiscordId as unknown as number,
      module_id: moduleId,
      score,
      rating,
      metrics: metrics as any
    })
    .select('id, created_at')
    .single()

  if (error) {
    console.error('[-] Supabase Activity Insert Failed:', error.message)
    throw createError({ statusCode: 500, statusMessage: `Database error: ${error.message}` })
  }

  return {
    success: true,
    attemptId: data.id,
    submittedAt: data.created_at
  }
})