// server/api/activities/auth.post.ts
import { serverSupabaseClient } from '#supabase/server'

interface AuthBody {
  code?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<AuthBody>(event)
  const code = String(body?.code || '').trim()

  if (!code) {
    throw createError({ statusCode: 400, statusMessage: 'Missing authorization code from Discord Activity SDK.' })
  }

  const clientId = process.env.DISCORD_CLIENT_ID || process.env.DISCORD_APPLICATION_ID
  const clientSecret = process.env.DISCORD_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw createError({ statusCode: 500, statusMessage: 'Server configuration error: missing Discord OAuth credentials.' })
  }

  // 1. 向 Discord 交换 access_token
  // 注意：对于 Embedded App SDK 生成的 code，不需要也不能传常规网页的 redirect_uri
  const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code
    })
  })

  if (!tokenRes.ok) {
    const errorText = await tokenRes.text()
    console.error('[-] Activity Token Exchange Failed:', errorText)
    throw createError({ statusCode: 401, statusMessage: `Discord token exchange rejected: ${errorText}` })
  }

  const tokenData = await tokenRes.json()

  // 2. 携带 token 抓取当前真实 Discord 用户画像
  const userRes = await fetch('https://discord.com/api/v10/users/@me', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  })

  if (!userRes.ok) {
    throw createError({ statusCode: 401, statusMessage: 'Failed to fetch Discord user profile.' })
  }

  const user = await userRes.json()

  // 3. 计算标准头像 URL
  const defaultAvatarIndex = Number((BigInt(user.id) >> BigInt(22)) % BigInt(6))
  const avatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
    : `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`

  const rawUsername = String(user.username || '').trim().toLowerCase()
  const rawNickname = user.global_name ? String(user.global_name).trim() : rawUsername

  // 4. 核心好品味：顺手无缝沉淀进全站公共名册 public.participant_data
  try {
    const supabase = await serverSupabaseClient(event)
    await supabase
      .schema('public')
      .from('participant_data')
      .upsert({
        discord_id: user.id as unknown as number, // 保持字符串纯度防精度截断
        discord_username: rawUsername,
        discord_nickname: rawNickname,
        profile_img: avatarUrl
      }, {
        onConflict: 'discord_id'
      })
  } catch (err: any) {
    console.warn('[Activity Auth] Participant名册写入跳过:', err.message)
  }

  // 5. 吐出纯净的操作员会话实体
  return {
    success: true,
    user: {
      id: String(user.id),
      username: rawUsername,
      global_name: rawNickname,
      avatar: avatarUrl
    }
  }
})