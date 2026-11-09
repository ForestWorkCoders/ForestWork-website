// server/api/auth/discord/login.get.ts
import { randomBytes } from 'node:crypto'
import { OAUTH_STATE_COOKIE, sanitizeRedirect } from '../../../utils/session'

export default defineEventHandler((event) => {
  const clientId = process.env.DISCORD_APPLICATION_ID
  const redirectUri = process.env.DISCORD_REDIRECT_URI

  if (!clientId || !redirectUri) {
    throw createError({ statusCode: 500, statusMessage: 'OAuth configuration missing.' })
  }

  const query = getQuery(event)
  const referer = getHeader(event, 'referer')

  // ★ 核心好品味：優先取 query.redirect，缺省則從 Referer 提取 pathname，最後才兜底 /
  let targetPath = query.redirect
  if (!targetPath && referer) {
    try {
      targetPath = new URL(referer).pathname
    } catch {
      targetPath = '/'
    }
  }
  const returnTo = sanitizeRedirect(query.redirect)

  const authUrl = new URL('https://discord.com/oauth2/authorize')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', 'identify')

  // Random state, kept with the return path in a short-lived cookie; the callback must see the same value
  const state = randomBytes(16).toString('hex')
  setCookie(event, OAUTH_STATE_COOKIE, `${state}.${Buffer.from(returnTo).toString('base64url')}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10,
    path: '/api/auth/discord'
  })
  authUrl.searchParams.set('state', state)

  return sendRedirect(event, authUrl.toString())
})