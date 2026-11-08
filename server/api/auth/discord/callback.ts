// server/api/auth/discord/callback.get.ts
import { createClient } from '@supabase/supabase-js'
import { sealSessionData, SESSION_COOKIE_NAME } from '../../../utils/session'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const code = String(query.code || '').trim()

  if (!code) {
    throw createError({ statusCode: 400, statusMessage: 'Missing authorization code from Discord callback.' })
  }

  // 1. 换取 Token 并抓取 Discord 真实画像
  const clientId = (process.env.DISCORD_APPLICATION_ID || '').trim().replace(/^["']|["']$/g, '')
  const clientSecret = (process.env.DISCORD_CLIENT_SECRET || '').trim().replace(/^["']|["']$/g, '')
  const redirectUri = (process.env.DISCORD_REDIRECT_URI || '').trim().replace(/^["']|["']$/g, '')

  if (!clientId || !clientSecret || !redirectUri) {
    throw createError({
      statusCode: 500,
      statusMessage: `FATAL: Missing environment variables! clientId=${!!clientId}, clientSecret=${!!clientSecret}, redirectUri=${!!redirectUri}`
    })
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${basicAuth}`
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri
    })
  })

  if (!tokenRes.ok) {
    const errorText = await tokenRes.text()
    // 拋出 HTTP 錯誤，Nuxt 會直接在瀏覽器呈現詳細報錯面板
    throw createError({
      statusCode: tokenRes.status,
      statusMessage: `Discord OAuth Rejected: ${errorText}`
    })
  }

  const tokenData = await tokenRes.json()

  const userRes = await fetch('https://discord.com/api/v10/users/@me', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  })

  if (!userRes.ok) {
    const userErr = await userRes.text()
    throw createError({
      statusCode: userRes.status,
      statusMessage: `Discord Profile Fetch Failed: ${userErr}`
    })
  }

  const user = await userRes.json()

  // 2. 构造 Discord 永久 CDN 头像地址 (或 default avatar)
  const defaultAvatarIndex = Number((BigInt(user.id) >> BigInt(22)) % BigInt(6))

  const avatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
    : `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`

  // 3. ★ 核心好品味：无状态客户端直连，就地 UPSERT 进全站公用的 participant_data！
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  await supabase
    .schema('public')
    .from('participant_data')
    .upsert({
      discord_id: user.id, // bigint
      discord_username: user.global_name || user.username,
      profile_img: avatarUrl
    }, {
      onConflict: 'discord_id'
    })

  // 4. 签发轻量 HttpOnly Cookie
  const sessionToken = sealSessionData({
    id: user.id,
    username: user.username,
    global_name: user.global_name,
    avatar: avatarUrl
  })

  setCookie(event, SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 天
    path: '/'
  })

  const returnTo = sanitizeRedirect(query.state)
  return sendRedirect(event, returnTo)
})