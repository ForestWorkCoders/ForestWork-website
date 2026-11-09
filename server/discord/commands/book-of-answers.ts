// server/discord/commands/book-of-answers.ts
import crypto from 'node:crypto'
import type { H3Event } from 'h3'
import { getInteractionOption } from '../utils'
import { BOOK_OF_ANSWERS } from '../assets/book-of-answers'

export async function handleBookOfAnswers(interaction: any, event: H3Event) {
  // 可选入参：用户心中的疑问 (方便记录在 Embed 卡片上增强仪式感)
  const question = getInteractionOption<string>(interaction, 'question')?.trim()

  // 密码学安全随机索引
  const randomIndex = crypto.randomInt(0, BOOK_OF_ANSWERS.length)
  const answer = BOOK_OF_ANSWERS[randomIndex]

  // 组装极具玄学质感的 Embed 卡片
  const fields = []
  if (question) {
    fields.push({
      name: '❓ 閣下的疑問',
      value: `*「${question}」*`,
      inline: false
    })
  }

  return {
    type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
    data: {
      embeds: [
        {
          title: '📖 《解答之書》為你揭示的答案',
          description: `\n# ✨ **${answer}** ✨\n`,
          color: 0x4C7766, // 品牌墨绿
          fields,
          footer: {
            text: '心誠則靈 · 僅供娛樂與決策參考',
            icon_url: 'https://i.imgur.com/Yo9GBYQ.png'
          },
          timestamp: new Date().toISOString()
        }
      ]
    }
  }
}