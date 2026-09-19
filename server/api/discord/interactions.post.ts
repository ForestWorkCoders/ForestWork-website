import crypto from 'node:crypto'

export default defineEventHandler(async (event) => {
  // 1. 提取 Discord 头部
  const signature = getHeader(event, 'x-signature-ed25519')
  const timestamp = getHeader(event, 'x-signature-timestamp')
  const rawBody = await readRawBody(event) // 纯 UTF-8 字符串
  const publicKeyHex = process.env.DISCORD_PUBLIC_KEY

  if (!signature || !timestamp || !rawBody || !publicKeyHex) {
    throw createError({ statusCode: 401, statusMessage: 'Bad request signature' })
  }

  // 2. 构造 Node 原生 Ed25519 公钥 (对应 Python 的 VerifyKey)
  const publicKey = crypto.createPublicKey({
    key: Buffer.concat([
      // 标准 Ed25519 DER 前缀 (12 字节)
      Buffer.from('302a300506032b6570032100', 'hex'),
      Buffer.from(publicKeyHex, 'hex')
    ]),
    format: 'der',
    type: 'spki'
  })

  // 3. 密码学校验：纯原生验证 (timestamp + rawBody)
  const messageData = Buffer.from(timestamp + rawBody, 'utf-8')
  const signatureBuffer = Buffer.from(signature, 'hex')

  const isValid = crypto.verify(null, messageData, publicKey, signatureBuffer)

  if (!isValid) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid request signature' })
  }

  // 4. 解析数据并响应 PING
  const message = JSON.parse(rawBody)

  if (message.type === 1) {
    setHeader(event, 'content-type', 'application/json')
    return { type: 1 } // 对应 Python 的 JsonResponse({'type': 1})
  }

  // 兜底响应
  setHeader(event, 'content-type', 'application/json')
  return { type: 1 }
})