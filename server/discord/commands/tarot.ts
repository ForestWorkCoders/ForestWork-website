// server/discord/commands/tarot.ts
import crypto from 'node:crypto'
import type { H3Event } from 'h3'
import { getInteractionOption } from '../utils'
import { TAROT_DECK, TAROT_SPREADS, DEFAULT_SPREAD, type TarotCard } from '../assets/tarot-deck'

const ASSET_BASE_URL = 'https://forestwork.vercel.app/tarot'

/**
 * 密碼學安全無放回抽樣 (Fisher-Yates 局部置換)
 */
function drawUniqueCards(deck: readonly TarotCard[], count: number): TarotCard[] {
    const pool = [...deck]
    const drawn: TarotCard[] = []
    for (let i = 0; i < count; i++) {
        const pickIndex = crypto.randomInt(i, pool.length)
        const temp = pool[i]!
        pool[i] = pool[pickIndex]!
        pool[pickIndex] = temp
        drawn.push(pool[i]!)
    }
    return drawn
}

export async function handleTarot(interaction: any, event: H3Event) {
  const question = getInteractionOption<string>(interaction, 'question')?.trim()
  const spreadKey = getInteractionOption<string>(interaction, 'spread') || 'holy_triangle'
  
  // ★ 1. 安全命中字典，未命中則回退為聖三角
  const spread = (spreadKey ? TAROT_SPREADS[spreadKey] : undefined) ?? DEFAULT_SPREAD

  // 2. 密碼學無放回抽樣
  const drawnCards = drawUniqueCards(TAROT_DECK, spread.count)

  // 3. 映射 Embed 陣列
  const embeds = drawnCards.map((card, idx) => {
    const isUpright = crypto.randomInt(0, 2) === 1
    const orientationText = isUpright ? '正位 (Upright)' : '逆位 (Reversed)'
    const statusBadge = isUpright ? '🟢' : '🔴'
    const interpretation = isUpright ? card.upright : card.reversed
    
    const finalFile = isUpright ? card.file : card.file.replace('.png', '_rev.png')
    const imageUrl = `${ASSET_BASE_URL}/${finalFile}`

    const posLabel = spread.positions[idx]!

    const fields = []
    if (idx === 0 && question) {
      fields.push({
        name: '❓ 閣下的疑問',
        value: `*「${question}」*`,
        inline: false
      })
    }

    fields.push(
      {
        name: `${statusBadge} 狀態`,
        value: `**${orientationText}**`,
        inline: true
      },
      {
        name: '📜 啟示釋義',
        value: interpretation,
        inline: false
      }
    )

    const isLast = idx === spread.count - 1

    return {
      title: `🎴 【${posLabel}】`,
      description: idx === 0 ? `> *${spread.description}* \n ### ${card.name}` : `### ${card.name}`,
      color: isUpright ? 0x4C7766 : 0x8B3A3A,
      fields,
      thumbnail: { url: imageUrl },
      footer: isLast ? {
        text: `林間小鎮 · 命運塔羅 (${spread.name})`,
        icon_url: ''
      } : undefined,
      timestamp: isLast ? new Date().toISOString() : undefined
    }
  })

  return {
    type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
    data: { embeds }
  }
}