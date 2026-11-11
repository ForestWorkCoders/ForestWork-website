// server/api/auth/discord/login.get.ts
import { randomBytes } from 'node:crypto'
import { OAUTH_STATE_COOKIE, sanitizeRedirect } from '../../../utils/session'

export default defineEventHandler((event) => {
  const clientId = process.env.DISCORD_APPLICATION_ID
  const redirectUri = process.env.DISCORD_REDIRECT_URI

  if (!clientId || !redirectUri) {
    throw createError({ statusCode: 500, statusMessage: 'OAuth configuration missing.' })
  }

  // Where to go after login: ?redirect= (every login link passes it), else /
  const returnTo = sanitizeRedirect(getQuery(event).redirect)

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