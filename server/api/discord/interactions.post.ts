import crypto from 'node:crypto'
import { commandRegistry } from '../../discord/commands'
import { buildPagerResponse } from '../../discord/commands/demo-pager'

export default defineEventHandler(async (event) => {
  const signature = getHeader(event, 'x-signature-ed25519')
  const timestamp = getHeader(event, 'x-signature-timestamp')
  const rawBody = await readRawBody(event)
  const publicKeyHex = process.env.DISCORD_PUBLIC_KEY

  if (!signature || !timestamp || !rawBody || !publicKeyHex) {
    throw createError({ statusCode: 401, statusMessage: 'Bad request signature' })
  }

  const publicKey = crypto.createPublicKey({
    key: Buffer.concat([
      Buffer.from('302a300506032b6570032100', 'hex'),
      Buffer.from(publicKeyHex, 'hex')
    ]),
    format: 'der',
    type: 'spki'
  })

  const isValid = crypto.verify(
    null,
    Buffer.from(timestamp + rawBody, 'utf-8'),
    publicKey,
    Buffer.from(signature, 'hex')
  )

  if (!isValid) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid request signature' })
  }

  const message = JSON.parse(rawBody)

  // 1. PING 握手响应
  if (message.type === 1) {
    setHeader(event, 'content-type', 'application/json')
    return { type: 1 }
  }

  // 2. 核心：处理 Slash Commands (type: 2 = APPLICATION_COMMAND)
  if (message.type === 2) {
    const commandName = message.data.name
    setHeader(event, 'content-type', 'application/json')

    const handler = commandRegistry[commandName]
    if (!handler) {
      return {
        type: 4,
        data: { content: `⚠️ 未知的指令: /${commandName}` }
      }
    }

    return await handler(message, event)
  }

  if (message.type === 3) {
    const customId = message.data?.custom_id || ''
    setHeader(event, 'content-type', 'application/json')

    // 匹配 pager 翻页事件: "pager:nav:<pageNumber>"
    if (customId.startsWith('pager:nav:')) {
      const targetPage = parseInt(customId.split(':')[2] || '1', 10)

      // 好品味：返回 type: 7 (UPDATE_MESSAGE)，在原地就地更新消息！
      return {
        type: 7,
        data: buildPagerResponse(targetPage)
      }
    }

    return {
      type: 4,
      data: { content: '未知的交互組件。', flags: 64 }
    }
  }

  return { type: 1 }
})