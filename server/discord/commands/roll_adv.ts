// server/discord/commands/roll.ts 完整重構版：
import type { H3Event } from 'h3'
import { getInteractionOption } from '../utils'
import { recordRoomPlayer } from '../room-player'
import { evaluateDiceExpression, isDiceExpression } from '../dice'
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

export async function handleRollAdv(interaction: any, event: H3Event) {
  const exprInput = getInteractionOption<string>(interaction, 'expr')?.trim() || '1d100'
  const desc = getInteractionOption<string>(interaction, 'desc') || '擲骰'
  const isSecret = Boolean(getInteractionOption<boolean>(interaction, 'secret'))
  const channelType = interaction.channel?.type
  const currentChannelId = String(interaction.channel_id)
  const callerId = String(interaction.member?.user?.id || interaction.user?.id)

  // "6 4d6k3" = roll 4d6k3 six times; anything else is one expression
  const multiMatch = exprInput.match(/^(\d+)\s+([0-9a-zA-Z+\-\s]+)$/)
  const diceExpr = multiMatch?.[2] ?? exprInput

  // The parser skips what it can't read ("hello" would roll 0), so reject it first
  if (!isDiceExpression(diceExpr)) {
    return {
      type: 4,
      data: {
        content: `⚠️ 無法解讀骰子表達式 \`${exprInput}\`！格式如：\`1d100\`、\`2d6+3\`、\`4d6k3\` 或 \`6 4d6k3\`。`,
        flags: 64
      }
    }
  }

  let gmThreadId: string | null = null

  // ========================================================================
  // ★ 核心好品味：若在公開子區內，並發「登記玩家」與「取得 GM 暗骰子區 ID」
  // ========================================================================
  if (channelType === 11 || channelType === 12) {
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
      recordRoomPlayer(interaction)
    ])

    if (roomRes.data?.gm_thread_id) {
      gmThreadId = roomRes.data.gm_thread_id
    }
  }

  // ========================================================================
  // 情況 A：多組批量投擲 (如 "6 4d6k3")
  // ========================================================================
  if (multiMatch?.[1]) {
    const repeatCount = Math.min(10, Math.max(1, parseInt(multiMatch[1], 10)))

    const results: string[] = []
    for (let i = 0; i < repeatCount; i++) {
      const { total, breakdown } = evaluateDiceExpression(diceExpr)
      results.push(`* **#${i + 1}**: **\`${total}\`** ← ${breakdown}`)
    }

    const content = `🎲 **${desc}**：重複投擲 \`${repeatCount}\` 次 (\`${diceExpr}\`)\n` + results.join('\n')

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