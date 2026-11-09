// server/api/auth/logout.post.ts
import { SESSION_COOKIE_NAME } from '../../utils/session'

// POST only, and only from our own pages: a link, <img> or another site's form can't log a visitor out.
export default defineEventHandler((event) => {
  const site = getHeader(event, 'sec-fetch-site')
  const origin = getHeader(event, 'origin')
  const originHost = URL.canParse(origin || '') ? new URL(origin!).host : ''
  const sameOrigin = site ? site === 'same-origin' : originHost === getRequestHost(event)

  if (!sameOrigin) {
    throw createError({ statusCode: 403, statusMessage: 'Cross-site logout refused' })
  }

  deleteCookie(event, SESSION_COOKIE_NAME, { path: '/' })
  return { ok: true }
})
