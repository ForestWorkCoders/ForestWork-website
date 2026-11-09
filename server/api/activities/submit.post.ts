// server/api/activities/submit.post.ts
import { serverSupabaseServiceRole} from '#supabase/server'
import { unsealSessionData } from '../../utils/session'

interface SubmitBody {
  authTicket?: string // signed by /api/activities/auth
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

  // 2. 边界合规性核验
  if (!Number.isInteger(moduleId) || moduleId < 1 || moduleId > 10) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid moduleId: Must be between 1 and 10.' })
  }

  if (!Number.isInteger(score) || score < 0 || score > 50000) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid score: Must be between 0 and 50000.' })
  }

  // 3. The player is whoever the signed ticket says, never an ID from the body.
  //    Outside production, a missing or bad ticket falls back to the 10001 sandbox player.
  const session = unsealSessionData(body?.authTicket)
  let rawDiscordId = session?.id ? String(session.id) : ''

  if (!/^\d{17,20}$/.test(rawDiscordId)) {
    if (process.env.NODE_ENV === 'production') {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized: valid activity ticket required.' })
    }
    rawDiscordId = '10001'
  }

  // 4. ★ 核心加固：使用 ServiceRole 执行特权写入，彻底免疫任何 RLS 意外拦截！[cite: 27]
  const supabase = serverSupabaseServiceRole(event)

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
    console.error('[-] Supabase Insert Failed:', error.message)
    throw createError({ statusCode: 500, statusMessage: `Database Insert Failed: ${error.message}` })
  }

  return {
    success: true,
    attemptId: data.id,
    submittedAt: data.created_at
  }
})