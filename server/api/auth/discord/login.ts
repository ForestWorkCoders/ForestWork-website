// server/api/auth/discord/login.get.ts
export default defineEventHandler((event) => {
  const clientId = process.env.DISCORD_APPLICATION_ID
  const redirectUri = process.env.DISCORD_REDIRECT_URI

  if (!clientId || !redirectUri) {
    throw createError({ statusCode: 500, statusMessage: 'OAuth configuration missing.' })
  }

  const query = getQuery(event)
  const returnTo = sanitizeRedirect(query.redirect)

  const authUrl = new URL('https://discord.com/oauth2/authorize')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', 'identify')

  authUrl.searchParams.set('state', returnTo)

  return sendRedirect(event, authUrl.toString())
})