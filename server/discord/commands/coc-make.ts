// server/discord/commands/coc-make.ts
import crypto from 'node:crypto'
import type { H3Event } from 'h3'
import { getInteractionOption } from '../utils'

const d6 = () => crypto.randomInt(1, 7)
const rollSum = (n: number, add: number = 0) =>
    Array.from({ length: n }, () => d6()).reduce((a, b) => a + b, 0) + add


export function generateCocAttributes() {
    // 1. 生成 3 組 7 項 3D6 (供 STR, CON, DEX, APP, POW 分配，7選5)
    const g1Raw = Array.from({ length: 3 }, () => Array.from({ length: 7 }, () => rollSum(3)))
    const g1Pct = g1Raw.map(g => g.map(v => v * 5).sort((a, b) => b - a))

    // 2. 生成 3 組 4 項 2D6+6 (供 SIZ, INT, EDU 分配，4選3)
    const g2Raw = Array.from({ length: 3 }, () => Array.from({ length: 4 }, () => rollSum(2, 6)))
    const g2Pct = g2Raw.map(g => g.map(v => v * 5).sort((a, b) => b - a))

    // 3. 幸運值 3D6 二選一
    const luckA = rollSum(3) * 5
    const luckB = rollSum(3) * 5
    const bestLuck = Math.max(luckA, luckB)

    // ★ 核心好品味：以選項 A 為基準，自動生成一組最優推薦預分配純文字模板！
    // g1 取前 5 大數值，g2 取前 3 大數值
    const autoTemplate =
        `力量:${g1Pct[0]![0]} 體質:${g1Pct[0]![1]} 敏捷:${g1Pct[0]![2]} 外貌:${g1Pct[0]![3]} 意志:${g1Pct[0]![4]} ` + `智力:${g2Pct[0]![0]} 體型:${g2Pct[0]![1]} 教育:${g2Pct[0]![2]} 幸運:${bestLuck}`    // 空白速填模板（供不想用預設分配、想自行填入數字的玩家）   
    const blankTemplate = '力量: 體質: 敏捷: 外貌: 意志: 智力: 體型: 教育: 幸運:'
    return { g1Pct, g2Pct, luckA, luckB, autoTemplate, blankTemplate }
}

export async function handleCocMake(interaction: any, event: H3Event) {
    const isSecret = Boolean(getInteractionOption<boolean>(interaction, 'secret'))
    const callerId = interaction.member?.user?.id || interaction.user?.id
    const data = generateCocAttributes()
    const embed = {
        title: '🎲 CoC 7th 調查員屬性生成器', description: `<@${callerId}> 的調查員命運擲骰已就緒！數值均已換算為 **百分制 (×5)**：`,
        color: 0x3498DB,
        fields: [
            {
                name: '📌 1. [STR, CON, DEX, APP, POW] 候選池 (7選5，由大到小排序):',
                value:
                    `選項 A: \`[${data.g1Pct[0]!.join(', ')}]\`\n` +
                    `選項 B: \`[${data.g1Pct[1]!.join(', ')}]\`\n` +
                    `選項 C: \`[${data.g1Pct[2]!.join(', ')}]\``,
                inline: false
            },
            {
                name: '📌 2. [SIZ, INT, EDU] 候選池 (4選3，由大到小排序):',
                value:
                    `選項 A: \`[${data.g2Pct[0]!.join(', ')}]\`\n` +
                    `選項 B: \`[${data.g2Pct[1]!.join(', ')}]\`\n` +
                    `選項 C: \`[${data.g2Pct[2]!.join(', ')}]\``,
                inline: false
            },
            {
                name: '🍀 3. [LUCK] 幸運值二選一:',
                value: `候選 A: **\`${data.luckA}\`** ｜ 候選 B: **\`${data.luckB}\`**`,
                inline: false
            },
            {
                name: '📋 【一鍵複製】推薦分配模板 (基於選項 A 最優組合)',
                // ★ 核心殺手鐧：放進獨立程式碼塊，Discord 支援滑鼠一鍵複製！
                value: `\`\`\`text\n${data.autoTemplate}\n\`\`\`*提示：複製上方文字後，執行 \`/card create\` 直接貼入「基礎屬性八圍」欄位即可！*`,
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