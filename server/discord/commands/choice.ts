// server/discord/commands/choice.ts
import crypto from 'node:crypto'
import type { H3Event } from 'h3'
import { getInteractionOption, tokenizeChoices } from '../utils'

export async function handleChoice(interaction: any, event: H3Event) {
  const rawInput = getInteractionOption<string>(interaction, 'options') || ''
  const choices = tokenizeChoices(rawInput)

  // 卫语句：选项不足 2 个
  if (choices.length < 2) {
    return {
      type: 4,
      data: {
        content: '⚠️ **候選項不足**：請至少提供 2 個選項！\n' +
                 '* 範例 1 (逗號分隔): `/choice options: 海南雞飯, 叉燒雲吞麵, 漢堡包`\n' +
                 '* 範例 2 (引號空格): `/choice options: "Chili Crab" "Fried Rice" Laksa`'
      }
    }
  }

  // 密码学安全随机选择
  const selectedIdx = crypto.randomInt(0, choices.length)
  const picked = choices[selectedIdx]

  // 格式化候选项列表展示
  const listStr = choices.map((c, i) => `${i + 1}. \`${c}\``).join('  ')

  const content = `🎯 **隨機抉擇結果**：**\`${picked}\`**\n` +
                  `* **候選清單** (${choices.length} 項): ${listStr}`

  return {
    type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
    data: { content }
  }
}