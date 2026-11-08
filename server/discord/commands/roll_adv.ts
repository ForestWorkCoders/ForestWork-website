// server/discord/commands/roll.ts
import crypto from 'node:crypto'
import type { H3Event } from 'h3'
import { getInteractionOption } from '../utils'

/**
 * 带有 Keep (kh/kl) / Drop (dh/dl) 修饰符的标准 Dice 词法解析器
 */
function evaluateDiceExpression(expression: string): { total: number; breakdown: string } {
  const clean = expression.replace(/\s+/g, '').toLowerCase()

  // 正则匹配项：[+/-]? ( [count]d[faces][modifier] | [constant] )
  const termRegex = /([+-]?)(?:(?:(\d*)d(\d+)(?:(kh|kl|dh|dl|k|d)(\d*))?)|(\d+))/g
  let match: RegExpExecArray | null

  let total = 0
  const breakdownParts: string[] = []

  while ((match = termRegex.exec(clean)) !== null) {
    const [fullMatch, signStr, diceCountStr, diceFacesStr, modType, modCountStr, constantStr] = match
    if (!fullMatch) continue

    const sign = signStr === '-' ? -1 : 1
    const prefix = sign === -1 ? ' - ' : breakdownParts.length > 0 ? ' + ' : ''

    if (constantStr !== undefined) {
      // 1. 常量项 (如 +5 或 -2)
      const val = parseInt(constantStr, 10)
      total += sign * val
      breakdownParts.push(`${prefix}${val}`)
    } else if (diceFacesStr !== undefined) {
      // 2. 骰子项 (如 4d6k3, 2d20kl, 1d100)
      const count = Math.min(50, Math.max(1, diceCountStr ? parseInt(diceCountStr, 10) : 1))
      const faces = Math.min(1000, Math.max(1, parseInt(diceFacesStr, 10)))

      // 物理摇骰
      const rawRolls: number[] = []
      for (let i = 0; i < count; i++) {
        rawRolls.push(crypto.randomInt(1, faces + 1))
      }

      // 解析 Keep / Drop 命中索引
      const indexed = rawRolls.map((val, idx) => ({ idx, val }))
      let keptIndices = new Set<number>(indexed.map(item => item.idx))

      if (modType) {
        const modNum = modCountStr ? parseInt(modCountStr, 10) : 1
        const safeNum = Math.min(count, Math.max(1, modNum))

        if (modType === 'k' || modType === 'kh') {
          // 保留最高 N 颗
          indexed.sort((a, b) => b.val - a.val)
          keptIndices = new Set(indexed.slice(0, safeNum).map(item => item.idx))
        } else if (modType === 'kl') {
          // 保留最低 N 颗
          indexed.sort((a, b) => a.val - b.val)
          keptIndices = new Set(indexed.slice(0, safeNum).map(item => item.idx))
        } else if (modType === 'dl' || modType === 'd') {
          // 丢弃最低 N 颗
          indexed.sort((a, b) => a.val - b.val)
          const dropIndices = new Set(indexed.slice(0, safeNum).map(item => item.idx))
          keptIndices = new Set(rawRolls.map((_, i) => i).filter(i => !dropIndices.has(i)))
        } else if (modType === 'dh') {
          // 丢弃最高 N 颗
          indexed.sort((a, b) => b.val - a.val)
          const dropIndices = new Set(indexed.slice(0, safeNum).map(item => item.idx))
          keptIndices = new Set(rawRolls.map((_, i) => i).filter(i => !dropIndices.has(i)))
        }
      }

      // 统计命中点数之和与明细格式化（这里的作用域严格闭合）
      // 统计命中点数之和与明细格式化
      let diceSum = 0
      const formattedRolls = rawRolls.map((val, i) => {
        if (keptIndices.has(i)) {
          diceSum += val
          return `**${val}**` // 保留的点数：加粗强调
        }
        return `~~${val}~~`   // 丢弃的点数：删除线划掉
      })

      total += sign * diceSum

      const modLabel = modType ? `${modType}${modCountStr || ''}` : ''
      // 让 count + faces + modLabel 保持代码等宽字体，点数列表在外面使用 Markdown 表现层
      breakdownParts.push(`${prefix}\`${count}d${faces}${modLabel}\` [${formattedRolls.join(', ')}]`)
    }
  }

  // 函数顶层确定性返回：类型严格吻合 { total: number; breakdown: string }
  return {
    total,
    breakdown: breakdownParts.join('') || '0'
  }
}

export async function handleRollAdv(interaction: any, event: H3Event) {
  const exprInput = getInteractionOption<string>(interaction, 'expr')?.trim() || '1d100'
  const desc = getInteractionOption<string>(interaction, 'desc') || '擲骰'

  // 多组批量投掷：如 "6 4d6k3"
  const multiMatch = exprInput.match(/^(\d+)\s+([0-9a-zA-Z+\-\s]+)$/)
  
  if (multiMatch && multiMatch[1] && multiMatch[2]) {
    const repeatCount = Math.min(10, Math.max(1, parseInt(multiMatch[1], 10)))
    const subExpr = multiMatch[2]

    const results: string[] = []
    for (let i = 0; i < repeatCount; i++) {
      const { total, breakdown } = evaluateDiceExpression(subExpr)
      results.push(`* **#${i + 1}**: **\`${total}\`** ← \`${breakdown}\``)
    }

    return {
      type: 4,
      data: {
        content: `🎲 **${desc}**：重複投擲 \`${repeatCount}\` 次 (\`${subExpr}\`)\n` + results.join('\n')
      }
    }
  }

  // 单组投掷
  const { total, breakdown } = evaluateDiceExpression(exprInput)

  const content = `🎲 **${desc}**：\`${exprInput}\`\n` +
                  `* **明細**: ${breakdown}\n` +
                  `* **最終結果**: **\`${total}\`**`

  return {
    type: 4,
    data: { content }
  }
}