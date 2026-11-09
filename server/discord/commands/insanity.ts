// server/discord/commands/insanity.ts
import crypto from 'node:crypto'
import type { H3Event } from 'h3'
import { getInteractionOption } from '../utils'
import rawInsanityData from '../assets/insanity.json'

type InsanityMode = 'full' | 'phobia' | 'mania'

// ★ 好品味 1：在数据入口第一道防线确立强类型索引签名，彻底消灭 TS7053 隱式 any
const insanityData = rawInsanityData as Record<InsanityMode, Record<string, string>>

interface ModeMeta {
  title: string
  dMax: number
  table: Record<string, string>
}

const MODES: Record<InsanityMode, ModeMeta> = {
  full: {
    title: '短期 / 長期瘋狂症狀',
    dMax: 10,
    table: insanityData.full
  },
  phobia: {
    title: '隨機恐懼症',
    dMax: 100,
    table: insanityData.phobia
  },
  mania: {
    title: '隨機狂熱症',
    dMax: 100,
    table: insanityData.mania
  }
}

export async function handleInsanity(interaction: any, event: H3Event) {
  const modeKey = (getInteractionOption<string>(interaction, 'type') || 'full') as InsanityMode
  const mode = MODES[modeKey] || MODES.full

  // 1. 主擲骰 (1D10 或 1D100)
  const dice = crypto.randomInt(1, mode.dMax + 1)
  const resultText = mode.table[dice] || '未定義症狀內容'

  const fields = [
    {
      name: `🎲 檢定擲骰 (1D${mode.dMax})`,
      value: `骰出點數：**${dice}**`,
      inline: true
    },
    {
      name: '📜 症狀描述',
      value: `> ${resultText}`,
      inline: false
    }
  ]

  // ★ 好品味 2：連鎖伴生抽取，直接享有完整的索引簽名，代碼乾淨清爽
  if (modeKey === 'full') {
    if (dice === 9) {
      const subDice = crypto.randomInt(1, 101)
      const phobiaText = insanityData.phobia[subDice] || '未知恐懼症'
      fields.push({
        name: '⚡ 伴生恐懼症抽取 (自動連環 1D100)',
        value: `🎲 1D100 = \`${subDice}\` ⎯ **${phobiaText}**`,
        inline: false
      })
    } else if (dice === 10) {
      const subDice = crypto.randomInt(1, 101)
      const maniaText = insanityData.mania[subDice] || '未知狂熱症'
      fields.push({
        name: '⚡ 伴生狂熱症抽取 (自動連環 1D100)',
        value: `🎲 1D100 = \`${subDice}\` ⎯ **${maniaText}**`,
        inline: false
      })
    }
  }

  return {
    type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
    data: {
      embeds: [
        {
          title: `🧠 《理智崩潰》· ${mode.title}`,
          description: `<@${interaction.member?.user?.id || interaction.user?.id}> 的精神防線已然失守...`,
          color: 0x8B0000,
          fields,
          footer: {
            text: '林間小鎮 TRPG · 守秘人理智結算系統',
            icon_url: 'https://i.imgur.com/cu2YAkn.png'
          },
          timestamp: new Date().toISOString()
        }
      ]
    }
  }
}