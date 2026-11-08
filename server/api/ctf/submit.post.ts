// server/api/ctf/submit.post.ts
import { createHash } from 'node:crypto'
import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '../../../types/database.types'
import { unsealSessionData, SESSION_COOKIE_NAME } from '../../utils/session'

export default defineEventHandler(async (event) => {
  // 1. ★ 核心好品味：从无状态签名的 Cookie 提取真实登录会话
  const cookieValue = getCookie(event, SESSION_COOKIE_NAME)
  const session = unsealSessionData(cookieValue)

  if (!session) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required. Please login with Discord first.'
    })
  }

  // 获取真实 Discord 64 位整数 Snowflake ID
  const accountId = session.id as unknown as number

  const body = await readBody(event)
  const rawFlag = String(body.flag || '').trim()

  if (!rawFlag) {
    return { success: false, message: 'Missing flag payload.' }
  }

  // 2. 将输入的 Flag 进行 SHA-256 哈希计算
  const flagHash = createHash('sha256').update(rawFlag).digest('hex')

  const supabase = await serverSupabaseClient<Database>(event)

  // 3. 校验题目哈希
  const { data: challenge, error: challengeError } = await supabase
    .schema('ctf')
    .from('challenges')
    .select('id, title, is_active')
    .eq('flag_hash', flagHash)
    .single()

  if (challengeError || !challenge || !challenge.is_active) {
    return { success: false, message: 'Invalid token sequence. Access rejected.' }
  }

  // 4. 检查是否重复提交过
  const { data: existingSolve } = await supabase
    .schema('ctf')
    .from('solves')
    .select('id')
    .eq('account_id', accountId)
    .eq('challenge_id', challenge.id)
    .maybeSingle()

  if (existingSolve) {
    return { success: false, message: `Challenge [${challenge.id}] was already solved by this operator.` }
  }

  // 5. 写入真实的解题记录（由经过验签的 accountId 背书）
  const { error: insertError } = await supabase
    .schema('ctf')
    .from('solves')
    .insert({
      account_id: accountId,
      challenge_id: challenge.id
    })

  if (insertError) {
    throw createError({ statusCode: 500, statusMessage: insertError.message })
  }

  return {
    success: true,
    message: `ACCEPTED! [${challenge.id}] solved. Points awarded to ${session.global_name || session.username}.`
  }
})