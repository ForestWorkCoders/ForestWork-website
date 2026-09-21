// server/discord/commands/roll.ts
import crypto from 'node:crypto'
import type { H3Event } from 'h3'
import { getInteractionOption } from '../utils'

export async function handleRoll(interaction: any, event: H3Event) {
  const count = Math.min(100, Math.max(1, getInteractionOption<number>(interaction, 'count') || 1))
  const faces = Math.min(10000, Math.max(1, getInteractionOption<number>(interaction, 'faces') || 100))
  const desc = getInteractionOption<string>(interaction, 'desc') || '擲骰'
  const keepMode = getInteractionOption<string>(interaction, 'keep')
  const keepCountRaw = getInteractionOption<number>(interaction, 'keep_count')

  // 1. 密码学级别随机掷骰
  const rolls: number[] = []
  for (let i = 0; i < count; i++) {
    rolls.push(crypto.randomInt(1, faces + 1))
  }

  // 2. 处理 Best / Worst 保留逻辑
  let selected = [...rolls]
  let keepText = ''

  if (keepMode && keepCountRaw && keepCountRaw > 0 && keepCountRaw < count) {
    const k = Math.min(count, keepCountRaw)
    if (keepMode === 'best') {
      selected.sort((a, b) => b - a) // 降序，取最大的 k 个
      selected = selected.slice(0, k)
      keepText = ` (取最佳 ${k} 個)`
    } else if (keepMode === 'worst') {
      selected.sort((a, b) => a - b) // 升序，取最小的 k 个
      selected = selected.slice(0, k)
      keepText = ` (取最差 ${k} 個)`
    }
  }

  const total = selected.reduce((sum, val) => sum + val, 0)
  const rollListStr = rolls.length <= 30 ? `[${rolls.join(', ')}]` : `[${rolls.slice(0, 30).join(', ')}... 共 ${rolls.length} 顆]`

  const content = `🎲 **${desc}**：\`${count}D${faces}\`${keepText}\n` +
                  `* **投擲明細**: \`${rollListStr}\`\n` +
                  `* **最終結果**: **\`${total}\`**`

  return {
    type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
    data: { content }
  }
}