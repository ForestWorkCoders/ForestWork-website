// server/discord/dice.ts
// Dice expressions shared by the Discord commands (/roll_adv, /sc).
import crypto from 'node:crypto'

// One term: dice with an optional keep/drop modifier (2d6, d100, 4d6k3), or a plain number
const TERM = String.raw`(?:\d*d\d+(?:(?:kh|kl|dh|dl|k|d)\d*)?|\d+)`
const WHOLE_EXPRESSION = new RegExp(`^[+-]?${TERM}(?:[+-]${TERM})*$`)

/**
 * True when the whole text is a dice expression: terms joined by + or -.
 * evaluateDiceExpression itself skips what it can't read, so callers that
 * must not guess (a SAN loss) check with this first.
 */
export function isDiceExpression(expression: string): boolean {
  return WHOLE_EXPRESSION.test(expression.replace(/\s+/g, '').toLowerCase())
}

/**
 * 带有 Keep (kh/kl) / Drop (dh/dl) 修饰符的标准 Dice 词法解析器
 */
export function evaluateDiceExpression(expression: string): { total: number; breakdown: string } {
  const clean = expression.replace(/\s+/g, '').toLowerCase()

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
      const val = parseInt(constantStr, 10)
      total += sign * val
      breakdownParts.push(`${prefix}${val}`)
    } else if (diceFacesStr !== undefined) {
      const count = Math.min(50, Math.max(1, diceCountStr ? parseInt(diceCountStr, 10) : 1))
      const faces = Math.min(1000, Math.max(1, parseInt(diceFacesStr, 10)))

      const rawRolls: number[] = []
      for (let i = 0; i < count; i++) {
        rawRolls.push(crypto.randomInt(1, faces + 1))
      }

      const indexed = rawRolls.map((val, idx) => ({ idx, val }))
      let keptIndices = new Set<number>(indexed.map(item => item.idx))

      if (modType) {
        const modNum = modCountStr ? parseInt(modCountStr, 10) : 1
        const safeNum = Math.min(count, Math.max(1, modNum))

        if (modType === 'k' || modType === 'kh') {
          indexed.sort((a, b) => b.val - a.val)
          keptIndices = new Set(indexed.slice(0, safeNum).map(item => item.idx))
        } else if (modType === 'kl') {
          indexed.sort((a, b) => a.val - b.val)
          keptIndices = new Set(indexed.slice(0, safeNum).map(item => item.idx))
        } else if (modType === 'dl' || modType === 'd') {
          indexed.sort((a, b) => a.val - b.val)
          const dropIndices = new Set(indexed.slice(0, safeNum).map(item => item.idx))
          keptIndices = new Set(rawRolls.map((_, i) => i).filter(i => !dropIndices.has(i)))
        } else if (modType === 'dh') {
          indexed.sort((a, b) => b.val - a.val)
          const dropIndices = new Set(indexed.slice(0, safeNum).map(item => item.idx))
          keptIndices = new Set(rawRolls.map((_, i) => i).filter(i => !dropIndices.has(i)))
        }
      }

      let diceSum = 0
      const formattedRolls = rawRolls.map((val, i) => {
        if (keptIndices.has(i)) {
          diceSum += val
          return `**${val}**`
        }
        return `~~${val}~~`
      })

      total += sign * diceSum

      const modLabel = modType ? `${modType}${modCountStr || ''}` : ''
      breakdownParts.push(`${prefix}\`${count}d${faces}${modLabel}\` [${formattedRolls.join(', ')}]`)
    }
  }

  return {
    total,
    breakdown: breakdownParts.join('') || '0'
  }
}
