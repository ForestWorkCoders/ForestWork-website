// server/utils/session.ts
import crypto from 'node:crypto'
import type { H3Event } from 'h3'
import { getCookie, getRequestHeader } from 'h3'

export interface UserSession {
  id: string // Discord Snowflake ID (如 '311484597248720907')
  username: string
  global_name: string | null
  avatar: string | null
}

const SESSION_COOKIE_NAME = 'fw_session'

// Lifetimes in seconds
export const WEB_SESSION_TTL = 60 * 60 * 24 * 30
export const ACTIVITY_TICKET_TTL = 60 * 60 * 12

function getSecretKey(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret) {
    throw new Error('Missing SESSION_SECRET environment variable')
  }
  return secret
}

/**
 * 签发带有 HMAC-SHA256 防篡改签名的 Session 字符串
 */
export function sealSessionData(user: UserSession, ttlSeconds: number): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds
  const payload = Buffer.from(JSON.stringify({ ...user, exp })).toString('base64url')
  const signature = crypto
    .createHmac('sha256', getSecretKey())
    .update(payload)
    .digest('base64url')
  return `${payload}.${signature}`
}

// Only paths on this site are allowed after login. Let the URL parser decide, the way a browser
// would: "//evil.com", "/\evil.com", "/<tab>/evil.com" and absolute URLs all resolve to another origin.
const LOCAL_ORIGIN = 'http://local.invalid'

export function sanitizeRedirect(target?: unknown): string {
  if (typeof target !== 'string') return '/'
  try {
    const url = new URL(target.trim(), LOCAL_ORIGIN)
    const path = url.pathname + url.search + url.hash
    // Check the result as well: "/..//evil.com" normalises to "//evil.com"
    return url.origin === LOCAL_ORIGIN && new URL(path, LOCAL_ORIGIN).origin === LOCAL_ORIGIN ? path : '/'
  } catch {
    return '/'
  }
}

/**
 * 验证签名并还原 Session 数据（如被篡改立即返回 null）
 */
export function unsealSessionData(cookieValue?: unknown): UserSession | null {
  // The activity ticket comes from a JSON body, so it may not be a string at all
  if (typeof cookieValue !== 'string') return null
  const [payload, signature] = cookieValue.split('.')
  if (!payload || !signature) return null

  const given = Buffer.from(signature)
  const expected = Buffer.from(
    crypto.createHmac('sha256', getSecretKey()).update(payload).digest('base64url'),
  )

  // timingSafeEqual throws on a length mismatch; the length is public, so check it first
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
    return null
  }

  try {
    const rawJson = Buffer.from(payload, 'base64url').toString('utf-8')
    const data = JSON.parse(rawJson) as Partial<UserSession> & { exp?: unknown }
    // Tokens without an expiry (issued before expiry was added) are rejected
    if (!data || typeof data.exp !== 'number' || data.exp <= Math.floor(Date.now() / 1000)) return null
    return {
      id: data.id as string,
      username: data.username as string,
      global_name: data.global_name ?? null,
      avatar: data.avatar ?? null,
    }
  } catch {
    return null
  }
}

/**
 * Signed-in user from the session cookie, or from an "Authorization: Bearer <token>" header
 */
export function getSessionUser(event: H3Event): UserSession | null {
  const fromCookie = unsealSessionData(getCookie(event, SESSION_COOKIE_NAME))
  if (fromCookie) return fromCookie
  const match = /^bearer\s+(\S+)\s*$/i.exec(getRequestHeader(event, 'authorization') ?? '')
  return match ? unsealSessionData(match[1]) : null
}

// Short-lived cookie holding the OAuth state value and the return path between login and callback
const OAUTH_STATE_COOKIE = 'fw_oauth_state'

export { SESSION_COOKIE_NAME, OAUTH_STATE_COOKIE }