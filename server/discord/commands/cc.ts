// server/discord/commands/cc.ts
import crypto from 'node:crypto'
import type { H3Event } from 'h3'
import { getInteractionOption } from '../utils'

export async function handleCc(interaction: any, event: H3Event) {
  const target = Math.min(100, Math.max(1, getInteractionOption<number>(interaction, 'target') || 50))
  const desc = getInteractionOption<string>(interaction, 'desc') || '技能檢定'

  // 1D100
  const roll = crypto.randomInt(1, 101)

  // 判定逻辑（标准 COC 7th 规则 + 严格边界）
  let resultText = ''
  let emoji = '⚪'

  if (roll === 1 || roll <= Math.min(5, Math.floor(target * 0.05))) {
    // 0.05 或 绝对 1：大成功
    resultText = '✨ 大成功 (Critical Success)！'
    emoji = '🌟'
  } else if ((target < 50 && roll >= 96) || roll === 100) {
    // 目标小于50时 96-100 大失败，否则 100 必定大失败
    resultText = '💀 大失敗 (Critical Fumble)！'
    emoji = '💥'
  } else if (roll <= Math.floor(target / 5)) {
    resultText = '極限成功 (Extreme Success)'
    emoji = '🟢'
  } else if (roll <= Math.floor(target / 2)) {
    resultText = '困難成功 (Hard Success)'
    emoji = '🟢'
  } else if (roll <= target) {
    resultText = '常規成功 (Regular Success)'
    emoji = '🟢'
  } else {
    resultText = '失敗 (Failure)'
    emoji = '🔴'
  }

  const content = `🎯 **${desc}** 檢定 (目標值: \`${target}\`)\n` +
                  `* **骰點**: \`1D100 = ${roll}\`\n` +
                  `* **判定**: ${emoji} **${resultText}**`

  return {
    type: 4,
    data: { content }
  }
}