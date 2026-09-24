// server/discord/commands/tarot.ts
import crypto from 'node:crypto'
import type { H3Event } from 'h3'
import { getInteractionOption } from '../utils'
import { TAROT_DECK, type TarotCard } from '../assets/tarot-deck'

const ASSET_BASE_URL = 'https://forestwork.vercel.app/tarot'

/**
 * 塔羅專屬牌陣語義字典 (Domain-driven Spread Templates)
 * 好品味：按抽牌張數精準分配位象，杜絕語意污染
 */
const SPREAD_TEMPLATES: Record<number, readonly string[]> = {
    // 1 張：單牌神諭
    1: [
        '核心啟示 · 當下指引'
    ],
    // 2 張：二元對立牌陣 (Duality Spread)
    2: [
        '正位 · 當前局勢與挑戰',
        '逆位 · 潛在阻礙與隱藏因素'
    ],
    // 3 張：經典時序三牌陣 (Past-Present-Future)
    3: [
        '過去 · 起因與過往',
        '現在 · 當前局勢與挑戰',
        '未來 · 走向與終局啟示'
    ],
    // 4 張：四象元素牌陣 (Four Elements Spread)
    4: [
        '地象 · 現實與物質層面',
        '水象 · 情感與人際關係',
        '火象 · 行動與動力',
        '風象 · 思維與心智層面'
    ],
    // 5 張：五芒星/十字核心牌陣
    5: [
        '核心現狀 · 此時此刻',
        '過往根基 · 潛在影響',
        '當前阻礙 · 核心矛盾',
        '因應策略 · 突破契機',
        '發展趨勢 · 最終走向'
    ],
    // 6 張：六芒星/六方位牌陣
    6: [
        '核心現狀 · 此時此刻',
        '過往根基 · 潛在影響',
        '當前阻礙 · 核心矛盾',
        '因應策略 · 突破契機',
        '發展趨勢 · 最終走向',
        '外界影響 · 他人與環境'
    ],
    // 7 張：七星/七方位牌陣
    7: [
        '核心現狀 · 此時此刻',
        '過往根基 · 潛在影響',
        '當前阻礙 · 核心矛盾',
        '因應策略 · 突破契機',
        '發展趨勢 · 最終走向',
        '外界影響 · 他人與環境',
        '自我心態 · 內在心理與情緒'
    ],
    // 8 張：曼陀羅牌陣
    8: [
        '核心現狀 · 此時此刻',
        '過往根基 · 潛在影響',
        '當前阻礙 · 核心矛盾',
        '因應策略 · 突破契機',
        '發展趨勢 · 最終走向',
        '外界影響 · 他人與環境',
        '自我心態 · 內在心理與情緒',
        '潛在恐懼 · 隱藏的焦慮與不安'
    ],
    // 9 張：九宮格牌陣
    9: [
        '第一位 · 現狀 / 核心',
        '第二位 · 阻礙 / 助力',
        '第三位 · 根基 / 潛意識',
        '第四位 · 過往 / 近期事件',
        '第五位 · 冠冕 / 目標與希望',
        '第六位 · 未來 / 近期趨勢',
        '第七位 · 自我 / 心理心態',
        '第八位 · 環境 / 外界影響',
        '第九位 · 期盼 / 潛在恐懼'
    ],
    // 10 張：權威凱爾特十字牌陣 (Celtic Cross)
    10: [
        '第一位 · 現狀 / 核心',
        '第二位 · 阻礙 / 助力',
        '第三位 · 根基 / 潛意識',
        '第四位 · 過往 / 近期事件',
        '第五位 · 冠冕 / 目標與希望',
        '第六位 · 未來 / 近期趨勢',
        '第七位 · 自我 / 心理心態',
        '第八位 · 環境 / 外界影響',
        '第九位 · 期盼 / 潛在恐懼',
        '第十位 · 終局 / 最終啟示'
    ]
}

/**
 * 安全獲取牌位標籤：命中字典取專屬牌陣，未命中則平滑降級為通用位次
 */
function getPositionLabel(count: number, index: number): string {
    const specificSpread = SPREAD_TEMPLATES[count]
    return specificSpread?.[index] ?? `第 ${index + 1} 位 · 啟示`
}

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
    const rawCount = getInteractionOption<number>(interaction, 'count')

    // 入口歸一化防禦：嚴格收窄至 [1, 10]，預設 3 張
    const count = Math.min(10, Math.max(1, rawCount || 3))

    // 1. 無放回隨機抽牌
    const drawnCards = drawUniqueCards(TAROT_DECK, count)

    // 2. 映射 Embed 陣列
    const embeds = drawnCards.map((card, idx) => {
        const isUpright = crypto.randomInt(0, 2) === 1
        const orientationText = isUpright ? '正位 (Upright)' : '逆位 (Reversed)'
        const statusBadge = isUpright ? '🟢' : '🔴'
        const interpretation = isUpright ? card.upright : card.reversed

        // 正位原圖，逆位切換為倒立立繪
        const finalFile = isUpright ? card.file : card.file.replace('.png', '_rev.png')
        const imageUrl = `${ASSET_BASE_URL}/${finalFile}`

        // ★ 核心修復：精準派生該張數下的真實牌位標籤
        const posLabel = getPositionLabel(count, idx)

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
            title: `🎴 【${posLabel}】${card.name}`,
            color: isUpright ? 0x4C7766 : 0x8B3A3A, // 正位墨綠，逆位酒紅
            fields,
            thumbnail: {
                url: imageUrl
            },
            footer: isLast ? {
                text: `林間小鎮 · 命運塔羅 (${count} 牌陣) · 僅供心靈指引`,
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