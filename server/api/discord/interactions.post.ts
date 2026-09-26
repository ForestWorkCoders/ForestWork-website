import crypto from 'node:crypto'
import { commandRegistry } from '../../discord/commands'
import { buildPagerResponse } from '../../discord/commands/demo-pager'
import { handleCardCommand, handleCardCreateModal, handleCardBioModal } from '../../discord/commands/card'
import { renderCurseLeaderboardPayload } from '../../discord/commands/leaderboard'
import { handleLinerBattleCommand, handleLinerBattleButton, handleLinerBattleModal } from '../../discord/commands/linerbattle'
import { handleGiveQuasoContextMenu } from '../../discord/commands/quaso'
import { renderQuasoLeaderboardPayload } from '../../discord/commands/leaderboard'

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
    const commandType = message.data?.type || 1
    const commandName = message.data.name
    setHeader(event, 'content-type', 'application/json')

    try {
      if (commandType === 1) {
        if (commandName === 'card') {
          const responsePayload = await handleCardCommand(message, event)
          console.log(`[Discord Card Response Delivered]: Type -> ${responsePayload?.type}`)
          return responsePayload
        }

        if (commandName === 'lb') {
          const responsePayload = await handleLinerBattleCommand(message, event)
          console.log(`[Discord Card Response Delivered]: Type -> ${responsePayload?.type}`)
          return responsePayload
        }
      }

      if (commandType === 2) {
        if (commandName === '🥐 送 1 個 Quaso') {
          return await handleGiveQuasoContextMenu(message, event)
        }
      }

      const handler = commandRegistry[commandName]
      if (handler) {
        return await handler(message, event)
      }
      console.warn(`[Discord Warning]: 未註冊的指令名稱 -> ${commandName}`)
      return {
        type: 4,
        data: { content: `⚠️ 系統未註冊指令：\`/${commandName}\``, flags: 64 }
      }
    } catch (err: any) {
      // ★ 黑色飛行記錄儀：把致命錯誤當場抓住並打進 Vercel 日誌！
      console.error(`[Discord Fatal Error in /${commandName}]:`, err?.stack || err?.message || err)
      return {
        type: 4,
        data: {
          content: `💥 執行 \`/${commandName}\` 時後端拋出異常：\`${err?.message || '內部錯誤'}\`\n請檢查 Vercel 運行日誌。`,
          flags: 64 // 僅觸發者可見，不污染群聊
        }
      }
    }
  }

  if (message.type === 3) {
    const customId = message.data?.custom_id || ''
    const clickerId = String(message.member?.user?.id || message.user?.id || '')
    setHeader(event, 'content-type', 'application/json')

    if (customId.startsWith('lb_accept:') || customId.startsWith('lb_input:') || customId.startsWith('lb_cancel:')) {
      return await handleLinerBattleButton(message, event)
    }

    // 匹配 pager 翻页事件: "pager:nav:<pageNumber>"
    if (customId.startsWith('pager:nav:')) {
      const targetPage = parseInt(customId.split(':')[2] || '1', 10)

      // 好品味：返回 type: 7 (UPDATE_MESSAGE)，在原地就地更新消息！
      return {
        type: 7,
        data: buildPagerResponse(targetPage)
      }
    }

    if (customId.startsWith('curse_switch_mode:') || customId.startsWith('curse_switch_year:')) {
      const selectedValue = message.data?.values?.[0] || ''
      let targetYear: number
      let targetMode: 'count' | 'ratio'

      if (customId.startsWith('curse_switch_mode:')) {
        // 操作者變更了「模式」➔ 從 custom_id 提取既有的年份
        targetYear = parseInt(customId.replace('curse_switch_mode:', ''), 10) || new Date().getFullYear()
        targetMode = (selectedValue === 'ratio' ? 'ratio' : 'count')
      } else {
        // 操作者變更了「年份」➔ 從 custom_id 提取既有的模式
        const preservedMode = customId.replace('curse_switch_year:', '')
        targetMode = (preservedMode === 'ratio' ? 'ratio' : 'count')
        targetYear = parseInt(selectedValue, 10) || new Date().getFullYear()
      }

      // 執行核心渲染純函數
      const payload = await renderCurseLeaderboardPayload(targetYear, targetMode, clickerId)

      // 原地刷新卡片 (type: 7 UPDATE_MESSAGE)
      return {
        type: 7,
        data: payload
      }
    }

    if (customId === 'leaderboard_quaso_switch') {
      const selectedMode = (message.data?.values?.[0] || 'received') as 'received' | 'sent'
      const clickerId = String(message.member?.user?.id || message.user?.id || '')
      const payload = await renderQuasoLeaderboardPayload(selectedMode, clickerId)
      return { type: 7, data: payload }
    }

    return {
      type: 4,
      data: { content: '未知的交互組件。', flags: 64 }
    }
  }

  if (message.type === 5) {
    const customId = message.data?.custom_id
    if (customId === 'trpg_card_create_modal') {
      return await handleCardCreateModal(message, event)
    }
    if (customId.startsWith('trpg_bio_modal:')) {
      return await handleCardBioModal(message, event)
    }
    if (customId.startsWith('lb_modal:')) {
      return await handleLinerBattleModal(message, event)
    }
    return { type: 4, data: { content: '未處理的交互類型' } }
  }

  return { type: 1 }
})