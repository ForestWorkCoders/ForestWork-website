// server/discord/commands/tarot.ts
import crypto from 'node:crypto'
import type { H3Event } from 'h3'
import { getInteractionOption } from '../utils'
import { TAROT_DECK, TAROT_SPREADS, type TarotCard } from '../assets/tarot-deck'

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
  const rawSpread = getInteractionOption<number>(interaction, 'spread') 
                 ?? getInteractionOption<number>(interaction, 'count')

  // ★ 1. 强制归一化收窄在 [1, 10]，未选默认 3
  const count = Math.min(10, Math.max(1, rawSpread || 3))
  const spreadMeta = TAROT_SPREADS[count]!

  // 2. 密码学无放回抽牌
  const drawnCards = drawUniqueCards(TAROT_DECK, count)

  // 3. 映射为对应数量的 Embeds (每个 Embed 对应一张牌面与位置)
  const embeds = drawnCards.map((card, idx) => {
    const isUpright = crypto.randomInt(0, 2) === 1
    const orientationText = isUpright ? '正位 (Upright)' : '逆位 (Reversed)'
    const statusBadge = isUpright ? '🟢' : '🔴'
    const interpretation = isUpright ? card.upright : card.reversed
    
    // 正位原图，逆位倒立
    const finalFile = isUpright ? card.file : card.file.replace('.png', '_rev.png')
    const imageUrl = `${ASSET_BASE_URL}/${finalFile}`

    // ★ 零分支：直接索引确定存在的牌位语义
    const posLabel = spreadMeta.positions[idx]!

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

    const isLast = idx === count - 1

    return {
      title: `🎴 【${posLabel}】`,
      description: `${card.name}`,
      color: isUpright ? 0x4C7766 : 0x8B3A3A,
      fields,
      thumbnail: { url: imageUrl },
      footer: isLast ? {
        text: `林間小鎮 · 命運塔羅 (${spreadMeta.displayName})`,
        icon_url: 'https://i.imgur.com/Xsd3m27.png'
      } : undefined,
      timestamp: isLast ? new Date().toISOString() : undefined
    }
  })

  return {
    type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
    data: { embeds }
  }
}