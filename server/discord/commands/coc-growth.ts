// server/discord/commands/en.ts
import crypto from 'node:crypto'
import type { H3Event } from 'h3'
import { getInteractionOption } from '../utils'

export async function handleCocGrowth(interaction: any, event: H3Event) {
  const skill = getInteractionOption<string>(interaction, 'skill')?.trim() || '未知技能'
  const currentVal = getInteractionOption<number>(interaction, 'value')

  if (!currentVal || currentVal < 1 || currentVal > 99) {
    return {
      type: 4,
      data: {
        content: '⚠️ 請輸入正確的當前技能數值 (1 ~ 99)！',
        flags: 64
      }
    }
  }

  // 1. 密碼學擲骰 1D100
  const dice = crypto.randomInt(1, 101)
  // CoC 7版規則：擲骰大於當前數值，或擲出 96~100 必定成功
  const isSuccess = dice > currentVal || dice > 95

  const callerId = interaction.member?.user?.id || interaction.user?.id

  if (isSuccess) {
    const growth = crypto.randomInt(1, 11) // 1D10
    const newVal = Math.min(99, currentVal + growth) // 規則上限封頂 99

    return {
      type: 4,
      data: {
        embeds: [
          {
            title: `📈 【技能成長成功】${skill}`,
            description: `<@${callerId}> 進行了 **${skill}** 幕間成長檢定：\n` +
              `🎲 1D100 = **${dice}** (${dice} > ${currentVal})\n\n` +
              `🎉 **檢定成功！** 技能增長 1D10 (+\`${growth}\`)\n` +
              `📊 技能數值由 \`${currentVal}\` 提升至 ➔ **\`${newVal}\`**` +
              (newVal === 99 ? ' *(已達人類極限 99)*' : ''),
            color: 0x4C7766, // 成功墨綠
            footer: {
              text: '林間小鎮 TRPG · CoC 7th 幕間成長結算',
              icon_url: 'https://i.imgur.com/cu2YAkn.png'
            },
            timestamp: new Date().toISOString()
          }
        ]
      }
    }
  }

  return {
    type: 4,
    data: {
      embeds: [
        {
          title: `📉 【技能成長失敗】${skill}`,
          description: `<@${callerId}> 進行了 **${skill}** 幕間成長檢定：\n` +
            `🎲 1D100 = **${dice}** (${dice} <= ${currentVal})\n\n` +
            `❌ **未獲得感悟**，技能維持原數值 **\`${currentVal}\`**。`,
          color: 0x8B3A3A, // 失敗酒紅
          footer: {
            text: '林間小鎮 TRPG · CoC 7th 幕間成長結算',
            icon_url: 'https://i.imgur.com/cu2YAkn.png'
          },
          timestamp: new Date().toISOString()
        }
      ]
    }
  }
}