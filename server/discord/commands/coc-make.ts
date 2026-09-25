// server/discord/commands/coc-make.ts
import crypto from 'node:crypto'
import type { H3Event } from 'h3'
import { getInteractionOption } from '../utils'

// 純隨機數產生器
const d6 = () => crypto.randomInt(1, 7)
const rollSum = (n: number, add: number = 0) =>
  Array.from({ length: n }, () => d6()).reduce((a, b) => a + b, 0) + add

export async function handleCocMake(interaction: any, event: H3Event) {
  const isSecret = Boolean(getInteractionOption<boolean>(interaction, 'secret'))
  const callerId = interaction.member?.user?.id || interaction.user?.id

  // 1. 生成 3 組 7 項 3D6 (STR, CON, DEX, APP, POW) - 7選5
  const g1Raw = Array.from({ length: 3 }, () => Array.from({ length: 7 }, () => rollSum(3)))
  // 換算百分制 (x5)
  const g1Pct = g1Raw.map(group => group.map(v => v * 5))

  // 2. 生成 3 組 4 項 2D6+6 (SIZ, INT, EDU) - 4選3
  const g2Raw = Array.from({ length: 3 }, () => Array.from({ length: 4 }, () => rollSum(2, 6)))
  // 換算百分制 (x5)
  const g2Pct = g2Raw.map(group => group.map(v => v * 5))

  // 3. 幸運值 3D6 二選一
  const luckA_Raw = rollSum(3)
  const luckB_Raw = rollSum(3)
  const luckA_Pct = luckA_Raw * 5
  const luckB_Pct = luckB_Raw * 5

  const embed = {
    title: '🎲 CoC 7th 調查員屬性生成器',
    description: `<@${callerId}> 的調查員命運擲骰已就緒 (數值為 **百分制 (×5)** [原始骰點]):`,
    color: 0x3498DB,
    fields: [
      {
        name: '📌 1. [STR, CON, DEX, APP, POW] 選擇一組分配 (7選5):',
        value: 
          `選項 A: \`[${g1Pct[0]!.join(', ')}]\` *(3D6: ${g1Raw[0]!.join(', ')})*\n` +
          `選項 B: \`[${g1Pct[1]!.join(', ')}]\` *(3D6: ${g1Raw[1]!.join(', ')})*\n` +
          `選項 C: \`[${g1Pct[2]!.join(', ')}]\` *(3D6: ${g1Raw[2]!.join(', ')})*`,
        inline: false
      },
      {
        name: '📌 2. [SIZ, INT, EDU] 選擇一組分配 (4選3):',
        value: 
          `選項 A: \`[${g2Pct[0]!.join(', ')}]\` *(2D6+6: ${g2Raw[0]!.join(', ')})*\n` +
          `選項 B: \`[${g2Pct[1]!.join(', ')}]\` *(2D6+6: ${g2Raw[1]!.join(', ')})*\n` +
          `選項 C: \`[${g2Pct[2]!.join(', ')}]\` *(2D6+6: ${g2Raw[2]!.join(', ')})*`,
        inline: false
      },
      {
        name: '🍀 3. [LUCK] 幸運值二選一:',
        value: `候選 A: **\`${luckA_Pct}\`** *(點數 ${luckA_Raw})* ⎯ 候選 B: **\`${luckB_Pct}\`** *(點數 ${luckB_Raw})*`,
        inline: false
      }
    ],
    footer: {
      text: isSecret ? '林間小鎮 TRPG · 秘密車卡 (僅自己可見)' : '林間小鎮 TRPG · 調查員創角協議',
      icon_url: 'https://i.imgur.com/cu2YAkn.png'
    },
    timestamp: new Date().toISOString()
  }

  return {
    type: 4,
    data: {
      embeds: [embed],
      flags: isSecret ? 64 : undefined
    }
  }
}