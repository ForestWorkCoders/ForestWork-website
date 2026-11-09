// server/utils/session.ts
import crypto from 'node:crypto'

export interface UserSession {
  id: string // Discord Snowflake ID (如 '311484597248720907')
  username: string
  global_name: string | null
  avatar: string | null
}

const SESSION_COOKIE_NAME = 'fw_session'

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
export function sealSessionData(user: UserSession): string {
  const payload = Buffer.from(JSON.stringify(user)).toString('base64url')
  const signature = crypto
    .createHmac('sha256', getSecretKey())
    .update(payload)
    .digest('base64url')
  return `${payload}.${signature}`
}

export function sanitizeRedirect(target?: unknown): string {
  if (typeof target !== 'string' || !target) {
    return '/'
  }
  const trimmed = target.trim()
  // 必须以单个 / 开头，且严禁以 // 开头（防止 //evil.com 协议相对外链）
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed
  }
  return '/'
}

/**
 * 验证签名并还原 Session 数据（如被篡改立即返回 null）
 */
export function unsealSessionData(cookieValue?: string): UserSession | null {
  if (!cookieValue || !cookieValue.includes('.')) return null
  const [payload, signature] = cookieValue.split('.')
  if (!payload || !signature) return null

  const expectedSignature = crypto
    .createHmac('sha256', getSecretKey())
    .update(payload)
    .digest('base64url')

  // 时序安全比较，彻底杜绝计时攻击
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return null
  }

  try {
    const rawJson = Buffer.from(payload, 'base64url').toString('utf-8')
    return JSON.parse(rawJson) as UserSession
  } catch {
    return null
  }
}

export { SESSION_COOKIE_NAME }