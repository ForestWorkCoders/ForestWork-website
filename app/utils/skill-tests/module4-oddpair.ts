// app/utils/skill-tests/module4-oddpair.ts
import type { SkillModuleInstance, SkillGameContext } from './types'

type ShapeType = 'circle' | 'square' | 'triangle' | 'rhombus' | 'pentagon' | 'star'

interface Trait {
  shape: ShapeType
  color: string
}

interface ShapeEntity {
  id: number
  isOdd: boolean
  primary: Trait
  secondary: Trait | null
  x: number
  y: number
  size: number
}

const BASE_COLORS = ['#38bdf8', '#f43f5e', '#4ade80', '#facc15', '#c084fc', '#fb923c']
const EXTENDED_COLORS = [...BASE_COLORS, '#2dd4bf', '#ec4899', '#a8a29e']

const DRAW_DISPATCH: Record<ShapeType, (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => void> = {
  circle: (ctx, x, y, r) => {
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
  },
  square: (ctx, x, y, r) => {
    ctx.beginPath()
    ctx.rect(x - r, y - r, r * 2, r * 2)
  },
  triangle: (ctx, x, y, r) => {
    ctx.beginPath()
    const h = r * 1.15
    ctx.moveTo(x, y - h)
    ctx.lineTo(x + r, y + h * 0.7)
    ctx.lineTo(x - r, y + h * 0.7)
    ctx.closePath()
  },
  rhombus: (ctx, x, y, r) => {
    ctx.beginPath()
    ctx.moveTo(x, y - r * 1.1)
    ctx.lineTo(x + r * 0.85, y)
    ctx.lineTo(x, y + r * 1.1)
    ctx.lineTo(x - r * 0.85, y)
    ctx.closePath()
  },
  pentagon: (ctx, x, y, r) => {
    ctx.beginPath()
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2
      const px = x + r * Math.cos(angle)
      const py = y + r * Math.sin(angle)
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
  },
  star: (ctx, x, y, r) => {
    ctx.beginPath()
    const innerR = r * 0.48
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI) / 5 - Math.PI / 2
      const currentR = i % 2 === 0 ? r : innerR
      const px = x + currentR * Math.cos(angle)
      const py = y + currentR * Math.sin(angle)
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
  }
}

export class Module4OddPair implements SkillModuleInstance {
  id = 4
  title = 'Odd Pair Out // 異類特徵辨識'

  private context!: SkillGameContext
  private level = 1
  private shapes: ShapeEntity[] = []

  init(context: SkillGameContext) {
    this.context = context
    this.level = 1
    this.shapes = []
    this.buildBoard(this.level)
  }

  private rand(min: number, max: number): number {
    return Math.random() * (max - min) + min
  }

  private shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const tempI = arr[i]
      const tempJ = arr[j]
      if (tempI !== undefined && tempJ !== undefined) {
        arr[i] = tempJ
        arr[j] = tempI
      }
    }
    return arr
  }

  private getActiveShapes(level: number): ShapeType[] {
    if (level <= 5) return ['circle', 'square', 'triangle']
    if (level < 10) return ['circle', 'square', 'triangle', 'rhombus']
    return ['circle', 'square', 'triangle', 'rhombus', 'pentagon', 'star']
  }

  private createRandomTrait(shapes: ShapeType[], colors: string[], excludeTrait: Trait | null = null): Trait {
    let s: ShapeType
    let c: string
    do {
      s = shapes[Math.floor(Math.random() * shapes.length)] || 'circle'
      c = colors[Math.floor(Math.random() * colors.length)] || '#38bdf8'
    } while (excludeTrait && s === excludeTrait.shape && c === excludeTrait.color)
    return { shape: s, color: c }
  }

  private buildBoard(level: number) {
    const pairCount = Math.min(level, 10)
    const totalShapes = pairCount * 2 + 1
    const shapes = this.getActiveShapes(level)
    const colors = level >= 10 ? EXTENDED_COLORS : BASE_COLORS
    const isComposite = level > 20

    const generateCompositeTrait = (exclude: { primary: Trait } | null = null) => {
      const primary = this.createRandomTrait(shapes, colors, exclude ? exclude.primary : null)
      const secondary = isComposite ? this.createRandomTrait(shapes, colors, primary) : null
      return { primary, secondary }
    }

    const targetTrait = generateCompositeTrait()
    const rawEntities: Array<{ primary: Trait; secondary: Trait | null; isOdd: boolean }> = [
      { ...targetTrait, isOdd: true }
    ]

    for (let i = 0; i < pairCount; i++) {
      const pairTrait = generateCompositeTrait(targetTrait)
      rawEntities.push({ ...pairTrait, isOdd: false })
      rawEntities.push({ ...pairTrait, isOdd: false })
    }

    this.shuffle(rawEntities)

    const cols = Math.ceil(Math.sqrt(totalShapes * (800 / 600)))
    const rows = Math.ceil(totalShapes / cols)
    const cellW = 800 / cols
    const cellH = 600 / rows
    const baseRadius = Math.max(20, Math.min(32, Math.min(cellW, cellH) * 0.28))

    const slots: Array<{ cx: number; cy: number }> = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        slots.push({ cx: c * cellW + cellW / 2, cy: r * cellH + cellH / 2 })
      }
    }
    this.shuffle(slots)

    this.shapes = rawEntities.map((ent, idx) => {
      const slot = slots[idx] || { cx: 400, cy: 300 }
      return {
        id: idx,
        isOdd: ent.isOdd,
        primary: ent.primary,
        secondary: ent.secondary,
        x: slot.cx + this.rand(-cellW * 0.2, cellW * 0.2),
        y: slot.cy + this.rand(-cellH * 0.2, cellH * 0.2),
        size: baseRadius
      }
    })
  }

  private drawEntity(ctx: CanvasRenderingContext2D, s: ShapeEntity) {
    const drawPrimary = DRAW_DISPATCH[s.primary.shape]
    if (drawPrimary) {
      drawPrimary(ctx, s.x, s.y, s.size)
      ctx.fillStyle = s.primary.color
      ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = '#ffffff'
      ctx.stroke()
    }

    if (s.secondary) {
      const drawSecondary = DRAW_DISPATCH[s.secondary.shape]
      if (drawSecondary) {
        drawSecondary(ctx, s.x, s.y, s.size * 0.48)
        ctx.fillStyle = s.secondary.color
        ctx.fill()
        ctx.lineWidth = 1.5
        ctx.strokeStyle = '#000000'
        ctx.stroke()
      }
    }
  }

  onPointerDown(mx: number, my: number, now: number) {
    for (let i = this.shapes.length - 1; i >= 0; i--) {
      const s = this.shapes[i]
      if (!s) continue

      const distSq = (mx - s.x) ** 2 + (my - s.y) ** 2
      if (distSq <= (s.size * 1.25) ** 2) {
        if (s.isOdd) {
          this.level++
          this.context.addScore(100, s.x, s.y, '#4ade80')
          this.buildBoard(this.level)
        } else {
          this.context.addScore(-50, s.x, s.y, '#ef4444')
        }
        return
      }
    }

    this.context.addScore(-50, mx, my, '#ef4444')
  }

  update(dt: number, now: number, elapsed: number) {}

  render(ctx: CanvasRenderingContext2D, now: number) {
    // 1. 绘制当前关卡水印
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.font = 'bold 14px ui-monospace, monospace'
    ctx.fillStyle = '#facc15'
    ctx.fillText(`CURRENT LEVEL: [ ${this.level} ]`, 16, 16)

    // 2. 绘制所有几何实体
    for (let i = 0; i < this.shapes.length; i++) {
      const s = this.shapes[i]
      if (!s) continue
      this.drawEntity(ctx, s)
    }
  }

  cleanup() {
    this.shapes = []
  }
}