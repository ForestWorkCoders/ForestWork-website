// server/discord/commands/roll.ts 完整重構版：
import crypto from 'node:crypto'
import type { H3Event } from 'h3'
import { getInteractionOption } from '../utils'
import { getSupabase } from '~~/server/utils/supabase'

/**
 * 斯巴達式 Discord 訊息發送小助手 (專供向指定子區投遞戰報)
 */
async function postDiscordMessage(channelId: string, content: string) {
  const token = process.env.DISCORD_BOT_TOKEN
  if (!token) return

  await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ content })
  }).catch((err) => console.error('[Discord Sync Error]:', err))
}

/**
 * 带有 Keep (kh/kl) / Drop (dh/dl) 修饰符的标准 Dice 词法解析器
 */
function evaluateDiceExpression(expression: string): { total: number; breakdown: string } {
  const clean = expression.replace(/\s+/g, '').toLowerCase()

  const termRegex = /([+-]?)(?:(?:(\d*)d(\d+)(?:(kh|kl|dh|dl|k|d)(\d*))?)|(\d+))/g
  let match: RegExpExecArray | null

  let total = 0
  const breakdownParts: string[] = []

  while ((match = termRegex.exec(clean)) !== null) {
    const [fullMatch, signStr, diceCountStr, diceFacesStr, modType, modCountStr, constantStr] = match
    if (!fullMatch) continue

    const sign = signStr === '-' ? -1 : 1
    const prefix = sign === -1 ? ' - ' : breakdownParts.length > 0 ? ' + ' : ''

    if (constantStr !== undefined) {
      const val = parseInt(constantStr, 10)
      total += sign * val
      breakdownParts.push(`${prefix}${val}`)
    } else if (diceFacesStr !== undefined) {
      const count = Math.min(50, Math.max(1, diceCountStr ? parseInt(diceCountStr, 10) : 1))
      const faces = Math.min(1000, Math.max(1, parseInt(diceFacesStr, 10)))

      const rawRolls: number[] = []
      for (let i = 0; i < count; i++) {
        rawRolls.push(crypto.randomInt(1, faces + 1))
      }

      const indexed = rawRolls.map((val, idx) => ({ idx, val }))
      let keptIndices = new Set<number>(indexed.map(item => item.idx))

      if (modType) {
        const modNum = modCountStr ? parseInt(modCountStr, 10) : 1
        const safeNum = Math.min(count, Math.max(1, modNum))

        if (modType === 'k' || modType === 'kh') {
          indexed.sort((a, b) => b.val - a.val)
          keptIndices = new Set(indexed.slice(0, safeNum).map(item => item.idx))
        } else if (modType === 'kl') {
          indexed.sort((a, b) => a.val - b.val)
          keptIndices = new Set(indexed.slice(0, safeNum).map(item => item.idx))
        } else if (modType === 'dl' || modType === 'd') {
          indexed.sort((a, b) => a.val - b.val)
          const dropIndices = new Set(indexed.slice(0, safeNum).map(item => item.idx))
          keptIndices = new Set(rawRolls.map((_, i) => i).filter(i => !dropIndices.has(i)))
        } else if (modType === 'dh') {
          indexed.sort((a, b) => b.val - a.val)
          const dropIndices = new Set(indexed.slice(0, safeNum).map(item => item.idx))
          keptIndices = new Set(rawRolls.map((_, i) => i).filter(i => !dropIndices.has(i)))
        }
      }

      let diceSum = 0
      const formattedRolls = rawRolls.map((val, i) => {
        if (keptIndices.has(i)) {
          diceSum += val
          return `**${val}**`
        }
        return `~~${val}~~`
      })

      total += sign * diceSum

      const modLabel = modType ? `${modType}${modCountStr || ''}` : ''
      breakdownParts.push(`${prefix}\`${count}d${faces}${modLabel}\` [${formattedRolls.join(', ')}]`)
    }
  }

  return {
    total,
    breakdown: breakdownParts.join('') || '0'
  }
}

export async function handleRollAdv(interaction: any, event: H3Event) {
  const exprInput = getInteractionOption<string>(interaction, 'expr')?.trim() || '1d100'
  const desc = getInteractionOption<string>(interaction, 'desc') || '擲骰'
  const isSecret = Boolean(getInteractionOption<boolean>(interaction, 'secret'))
  const channelType = interaction.channel?.type
  const currentChannelId = String(interaction.channel_id)
  const callerId = String(interaction.member?.user?.id || interaction.user?.id)

  let gmThreadId: string | null = null

  // ========================================================================
  // ★ 核心好品味：若在公開子區內，並發「登記玩家」與「取得 GM 暗骰子區 ID」
  // ========================================================================
  if (channelType === 11) {
    const supabase = getSupabase()
    const [roomRes] = await Promise.all([
      // 查詢當前子區是否屬於某個活躍跑團房間
      supabase
        .schema('trpg')
        .from('room_sessions')
        .select('gm_thread_id')
        .eq('main_thread_id', currentChannelId)
        .eq('status', 'ACTIVE')
        .maybeSingle(),
      // 記錄參團玩家身分
      supabase.rpc('record_room_player', {
        p_main_thread_id: currentChannelId,
        p_player_id: callerId
      })
    ])

    if (roomRes.data?.gm_thread_id) {
      gmThreadId = roomRes.data.gm_thread_id
    }
  }

  // ========================================================================
  // 情況 A：多組批量投擲 (如 "6 4d6k3")
  // ========================================================================
  const multiMatch = exprInput.match(/^(\d+)\s+([0-9a-zA-Z+\-\s]+)$/)

  if (multiMatch && multiMatch[1] && multiMatch[2]) {
    const repeatCount = Math.min(10, Math.max(1, parseInt(multiMatch[1], 10)))
    const subExpr = multiMatch[2]

    const results: string[] = []
    for (let i = 0; i < repeatCount; i++) {
      const { total, breakdown } = evaluateDiceExpression(subExpr)
      results.push(`* **#${i + 1}**: **\`${total}\`** ← \`${breakdown}\``)
    }

    const content = `🎲 **${desc}**：重複投擲 \`${repeatCount}\` 次 (\`${subExpr}\`)\n` + results.join('\n')

    // ★★★ 核心同步：若是暗骰且存在 GM 私密子區，推播完整戰報！★★★
    if (isSecret && gmThreadId) {
      await postDiscordMessage(
        gmThreadId,
        `🕵️ **【批量暗骰報告】** 來自主線 <#${currentChannelId}>\n> 調查員: <@${callerId}>\n> 備註: **${desc}**\n${results.join('\n')}`
      )
    }

    return {
      type: 4,
      data: {
        content,
        flags: isSecret ? 64 : undefined
      }
    }
  }

  // ========================================================================
  // 情況 B：單組常規投擲
  // ========================================================================
  const { total, breakdown } = evaluateDiceExpression(exprInput)

  const content = `🎲 **${desc}**：\`${exprInput}\`\n` +
    `* **明細**: ${breakdown}\n` +
    `* **最終結果**: **\`${total}\`**`

  // ★★★ 核心同步：若是暗骰且存在 GM 私密子區，推播完整戰報！★★★
  if (isSecret && gmThreadId) {
    await postDiscordMessage(
      gmThreadId,
      `🕵️ **【暗骰報告】** 來自主線 <#${currentChannelId}>\n> 調查員: <@${callerId}>\n> 檢定: **${desc}** (\`${exprInput}\`)\n> 明細: ${breakdown}\n> 結果: **\`${total}\`**`
    )
  }

  return {
    type: 4,
    data: {
      content,
      flags: isSecret ? 64 : undefined
    }
  }
}