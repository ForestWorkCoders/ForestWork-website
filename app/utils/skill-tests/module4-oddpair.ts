// app/utils/skill-tests/module4-oddpair.ts
import {
  STAGE_WIDTH,
  STAGE_HEIGHT,
  STAGE_CENTER_X,
  STAGE_CENTER_Y,
  type SkillModuleInstance,
  type SkillGameContext,
  type ModuleResultSummary,
  type Point
} from './types'
import { rand, shuffle } from './math'

type ShapeType = 'circle' | 'square' | 'triangle' | 'rhombus' | 'pentagon' | 'star'

interface Trait {
  shape: ShapeType
  color: string
}

// 1. 实体图元继承自标准 Point (消除结构散装手搓)
interface ShapeEntity extends Point {
  id: number
  isOdd: boolean
  primary: Trait
  secondary: Trait | null
  size: number
}

const BASE_COLORS = ['#38bdf8', '#f43f5e', '#4ade80', '#facc15', '#c084fc', '#fb923c']
const EXTENDED_COLORS = [...BASE_COLORS, '#2dd4bf', '#ec4899', '#a8a29e']

// 表驱动几何图元绘制器
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
  readonly id = 4
  readonly title = 'Odd Pair Out // 異類特徵辨識'
  readonly durationMs = 60000
  isCompleted = false

  private context!: SkillGameContext
  private level = 1
  private shapes: ShapeEntity[] = []

  // 2. 真实战术遥测数据 (彻底告别假数据)
  private correctFinds = 0
  private wrongClicks = 0
  private whiffs = 0
  private solveTimes: number[] = []
  private boardStartTime = 0

  init(context: SkillGameContext): void {
    this.context = context
    this.level = 1
    this.shapes = []
    this.correctFinds = 0
    this.wrongClicks = 0
    this.whiffs = 0
    this.solveTimes = []
    this.isCompleted = false
    this.boardStartTime = performance.now()

    this.buildBoard(this.level)
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

  private buildBoard(level: number): void {
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

    // ★ 核心好品味：使用通用 math.ts 洗牌
    shuffle(rawEntities)

    // ★ 核心好品味：使用视口物理常量计算网格
    const cols = Math.ceil(Math.sqrt(totalShapes * (STAGE_WIDTH / STAGE_HEIGHT)))
    const rows = Math.ceil(totalShapes / cols)
    const cellW = STAGE_WIDTH / cols
    const cellH = STAGE_HEIGHT / rows
    const baseRadius = Math.max(20, Math.min(32, Math.min(cellW, cellH) * 0.28))

    const slots: Point[] = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        slots.push({ x: c * cellW + cellW / 2, y: r * cellH + cellH / 2 })
      }
    }
    shuffle(slots)

    this.shapes = rawEntities.map((ent, idx) => {
      const slot = slots[idx] || { x: STAGE_CENTER_X, y: STAGE_CENTER_Y }
      return {
        id: idx,
        isOdd: ent.isOdd,
        primary: ent.primary,
        secondary: ent.secondary,
        x: slot.x + rand(-cellW * 0.2, cellW * 0.2),
        y: slot.y + rand(-cellH * 0.2, cellH * 0.2),
        size: baseRadius
      }
    })
  }

  private drawEntity(ctx: CanvasRenderingContext2D, s: ShapeEntity): void {
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

  // ★ 核心生命周期修复：60 秒自然完赛切断
  update(dt: number, now: number, elapsed: number): void {
    if (elapsed >= this.durationMs) {
      this.isCompleted = true
    }
  }

  onPointerDown(mx: number, my: number, now: number): void {
    if (this.isCompleted) return

    for (let i = this.shapes.length - 1; i >= 0; i--) {
      const s = this.shapes[i]
      if (!s) continue

      const distSq = (mx - s.x) ** 2 + (my - s.y) ** 2
      if (distSq <= (s.size * 1.25) ** 2) {
        if (s.isOdd) {
          // 正确命中异类：记录辨识耗时
          const solveMs = now - this.boardStartTime
          this.solveTimes.push(solveMs)
          this.boardStartTime = now

          this.correctFinds++
          this.level++
          this.context.addScore(100, s.x, s.y, '#4ade80')
          this.buildBoard(this.level)
        } else {
          // ★ 核心遥测：误击干扰项
          this.wrongClicks++
          this.context.addScore(-50, s.x, s.y, '#ef4444')
        }
        return
      }
    }

    // ★ 核心遥测：点空失误
    this.whiffs++
    this.context.addScore(-50, mx, my, '#ef4444')
  }

  render(ctx: CanvasRenderingContext2D, now: number): void {
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

  cleanup(): void {
    this.shapes = []
    this.correctFinds = 0
    this.wrongClicks = 0
    this.whiffs = 0
    this.solveTimes = []
    this.isCompleted = false
  }

  // ★★★ 核心修复：100% 由对局真实视觉识别数据计算产出 ★★★
  getResultSummary(): ModuleResultSummary {
    const totalClicks = this.correctFinds + this.wrongClicks + this.whiffs
    const accNum = totalClicks > 0 ? (this.correctFinds / totalClicks) * 100 : 100
    const accStr = `${accNum.toFixed(1)}%`

    const avgMs = this.solveTimes.length > 0
      ? Math.round(this.solveTimes.reduce((sum, v) => sum + v, 0) / this.solveTimes.length)
      : 0
    const avgScanStr = avgMs > 0 ? `${(avgMs / 1000).toFixed(2)}s` : '--'

    const rating = (this.level >= 22 && accNum >= 90)
      ? 'FLAWLESS ACE'
      : (this.level >= 14 && accNum >= 80)
        ? 'COMBAT READY'
        : 'TACTICAL APEX'

    return {
      rating,
      metrics: [
        { value: `LVL ${this.level}`, label: 'PEAK LEVEL', badge: this.level >= 20 ? 'x2.00' : 'APEX' },
        { value: accStr, label: 'ACCURACY' },
        { value: avgScanStr, label: 'AVG SCAN TIME' },
        { value: String(this.wrongClicks + this.whiffs), label: 'FAULT PENALTIES' }
      ]
    }
  }
}