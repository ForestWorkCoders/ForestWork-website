import { verifyKey } from 'discord-interactions'

export default defineEventHandler(async (event) => {
  // 1. 严格提取安全凭证
  const signature = getHeader(event, 'x-signature-ed25519')
  const timestamp = getHeader(event, 'x-signature-timestamp')
  const rawBody = await readRawBody(event)

  const publicKey = process.env.DISCORD_PUBLIC_KEY

  if (!publicKey) {
    console.error('[Discord Error]: DISCORD_PUBLIC_KEY is not configured.')
    throw createError({ statusCode: 500, statusMessage: 'Missing Discord Public Key' })
  }

  if (!signature || !timestamp || !rawBody) {
    throw createError({ statusCode: 401, statusMessage: 'Missing signature headers or body' })
  }

  // 2. 密码学验签
  const isValid = verifyKey(rawBody, signature, timestamp, publicKey)
  if (!isValid) {
    console.warn('[Discord Error]: Signature verification failed.')
    throw createError({ statusCode: 401, statusMessage: 'Invalid request signature' })
  }

  // 3. 解析消息体
  const message = JSON.parse(rawBody)

  // 4. 处理 Discord PING 握手 (type: 1)
  if (message.type === 1) {
    // 显式锁死响应头，保证绝对是 application/json
    setHeader(event, 'content-type', 'application/json')
    // 直接返回纯净对象（Nitro 会精准将其序列化为 {"type":1}）
    return { type: 1 }
  }

  // 5. 其他交互（Link Unfurling / Components 等）
  setHeader(event, 'content-type', 'application/json')
  return {
    type: 4,
    data: {
      content: '林間小鎮賽事網頁'
    }
  }
})