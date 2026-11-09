// server/discord/commands/birthday.ts
import type { H3Event } from 'h3'
import { getInteractionOption } from '../utils'
import birthdayData from '../assets/birthday-book.json'

export async function handleBirthday(interaction: any, event: H3Event) {
  const month = getInteractionOption<number>(interaction, 'month')
  const day = getInteractionOption<number>(interaction, 'day')

  if (!month || !day || month < 1 || month > 12 || day < 1 || day > 31) {
    return {
      type: 4,
      data: { content: '⚠️ 請輸入正確的出生月份 (1~12) 與日期 (1~31)！' }
    }
  }

  // 格式化為 4 位字串 key: 例如 1月5日 -> "0105"
  const key = `${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`
  const profile = (birthdayData as Record<string, any>)[key]

  if (!profile) {
    return {
      type: 4,
      data: { content: `⚠️ 找不到【${month}月${day}日】的星象性格記錄（請確認該月份是否有這一天）！` }
    }
  }

  return {
    type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
    data: {
      embeds: [
        {
          title: `🎂 【${month}月${day}日】生日密碼 · ${profile.zodiac}`,
          description: `\n> *${profile.desc}*\n`,
          color: 0x4C7766, // 林間墨綠
          footer: {
            text: '林間小鎮 · 366天生日靈魂密碼',
            icon_url: 'https://i.imgur.com/cu2YAkn.png'
          }
        }
      ]
    }
  }
}