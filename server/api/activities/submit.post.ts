// server/api/activities/submit.post.ts
import { serverSupabaseClient } from '#supabase/server'

interface SubmitBody {
  discordId?: string
  moduleId?: number
  score?: number
  rating?: string
  metrics?: unknown[]
}

export default defineEventHandler(async (event) => {
  const body = await readBody<SubmitBody>(event)

  // 1. 严格防御性提取
  const moduleId = Number(body?.moduleId)
  const score = Number(body?.score)
  const rating = typeof body?.rating === 'string' && body.rating.trim().length > 0
    ? body.rating.trim()
    : 'COMBAT READY'
  const metrics = Array.isArray(body?.metrics) ? body.metrics : []

  // 2. 边界合规性核验 (与数据库 CHECK 约束严格对齐)
  if (!Number.isInteger(moduleId) || moduleId < 1 || moduleId > 10) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid moduleId: Must be between 1 and 10.' })
  }

  if (!Number.isInteger(score) || score < 0 || score > 50000) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid score: Must be between 0 and 50000.' })
  }

  // 3. 选手身份提取与防护 (支持本地调试兜底)
  let rawDiscordId = String(body?.discordId || '').trim()
  if (!/^\d{17,20}\$/.test(rawDiscordId)) {
    if (process.env.NODE_ENV !== 'production') {
      rawDiscordId = '10001' // 开发环境沙盒测试账号
    } else {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized: Valid Discord Snowflake required.' })
    }
  }

  // 4. 写入 Supabase trpg.skill_test_attempts
  const supabase = await serverSupabaseClient(event)
  const { data, error } = await supabase
    .schema('trpg')
    .from('skill_test_attempts')
    .insert({
      discord_id: rawDiscordId as unknown as number,
      module_id: moduleId,
      score,
      rating,
      metrics: metrics as any
    })
    .select('id, created_at')
    .single()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: `Database Insert Failed: ${error.message}` })
  }

  return {
    success: true,
    attemptId: data.id,
    submittedAt: data.created_at
  }
})