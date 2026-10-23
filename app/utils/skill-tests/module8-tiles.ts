// app/utils/skill-tests/module8-tiles.ts
import {
  STAGE_WIDTH,
  STAGE_HEIGHT,
  STAGE_CENTER_X,
  type SkillModuleInstance,
  type SkillGameContext,
  type ModuleResultSummary,
  type Circle
} from './types'
import { randInt } from './math'

// 1. 实体图元继承自标准 Circle (消灭手搓 x, y, r)
interface BokehSpot extends Circle {
  a: number
}

export class Module8Tiles implements SkillModuleInstance {
  readonly id = 8
  readonly title = 'Piano Cadence // 四軌節奏測定'
  readonly durationMs = 60000
  isCompleted = false

  // 2. 舞台几何常量 (由全局视口常量推导，彻底消灭魔数)
  private readonly STAGE_W = 400
  private readonly STAGE_X = (STAGE_WIDTH - 400) / 2 // 200
  private readonly LANE_W = 100                      // 400 / 4
  private readonly ROW_H = STAGE_HEIGHT / 4          // 150

  // 3. 键位映射
  private readonly CODE_TO_LANE: Record<string, number> = {
    KeyD: 0,
    KeyF: 1,
    KeyJ: 2,
    KeyK: 3
  }
  private readonly LANE_KEYS = ['D', 'F', 'J', 'K']

  // 4. 静态散景光斑
  private readonly BOKEH_SPOTS: BokehSpot[] = [
    { x: 120, y: 150, r: 80, a: 0.25 },
    { x: 280, y: 320, r: 110, a: 0.35 },
    { x: 80, y: 480, r: 90, a: 0.20 },
    { x: 340, y: 550, r: 130, a: 0.40 },
    { x: 200, y: 80, r: 60, a: 0.15 }
  ]

  // 5. 运行时状态机与真实战术遥测
  private context!: SkillGameContext
  private tiles: number[] = []
  private correctHits = 0
  private mistakes = 0
  private currentStreak = 0
  private maxStreak = 0

  private isStarted = false
  private errorLane: number | null = null
  private errorUntil = 0

  init(context: SkillGameContext): void {
    this.context = context
    this.correctHits = 0
    this.mistakes = 0
    this.currentStreak = 0
    this.maxStreak = 0

    this.isStarted = false
    this.isCompleted = false
    this.errorLane = null
    this.errorUntil = 0

    // ★ 核心好品味：使用纯函数 randInt 初始化 5 行下潜方块队列
    this.tiles = []
    for (let i = 0; i < 5; i++) {
      this.tiles.push(randInt(0, 3))
    }
  }

  update(dt: number, now: number, elapsed: number): void {
    if (elapsed >= this.durationMs) {
      this.isCompleted = true
    }
  }

  render(ctx: CanvasRenderingContext2D, now: number, elapsed: number = 0): void {
    // 1. 绘制舞台浅青蓝天际渐变
    const bgGrad = ctx.createLinearGradient(this.STAGE_X, 0, this.STAGE_X, STAGE_HEIGHT)
    bgGrad.addColorStop(0, '#c7eafb')
    bgGrad.addColorStop(1, '#e2f4fd')
    ctx.fillStyle = bgGrad
    ctx.fillRect(this.STAGE_X, 0, this.STAGE_W, STAGE_HEIGHT)

    // 2. 绘制散景柔光斑
    for (const b of this.BOKEH_SPOTS) {
      const spotGrad = ctx.createRadialGradient(
        this.STAGE_X + b.x, b.y, 0,
        this.STAGE_X + b.x, b.y, b.r
      )
      spotGrad.addColorStop(0, `rgba(255, 255, 255, ${b.a})`)
      spotGrad.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = spotGrad
      ctx.beginPath()
      ctx.arc(this.STAGE_X + b.x, b.y, b.r, 0, Math.PI * 2)
      ctx.fill()
    }

    // 3. 绘制半透明白色轨道分割线
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.lineWidth = 1.5
    for (let i = 1; i < 4; i++) {
      const lx = this.STAGE_X + i * this.LANE_W
      ctx.beginPath()
      ctx.moveTo(lx, 0)
      ctx.lineTo(lx, STAGE_HEIGHT)
      ctx.stroke()
    }

    // 4. 绘制方块：底端目标行 (row 0) 高亮皇家蓝，上方预告行维持经典纯黑
    for (let row = 0; row < 4; row++) {
      const lane = this.tiles[row]
      if (lane === undefined) continue
      const tx = this.STAGE_X + lane * this.LANE_W
      const ty = STAGE_HEIGHT - (row + 1) * this.ROW_H

      if (row === 0) {
        ctx.fillStyle = '#1d4ed8' // 皇家蓝
        ctx.fillRect(tx, ty, this.LANE_W, this.ROW_H)

        // 目标蓝色方块内部发光边线
        ctx.strokeStyle = '#60a5fa'
        ctx.lineWidth = 2
        ctx.strokeRect(tx + 1, ty + 1, this.LANE_W - 2, this.ROW_H - 2)
      } else {
        ctx.fillStyle = '#000000' // 纯黑预告块
        ctx.fillRect(tx, ty, this.LANE_W, this.ROW_H)
      }
    }

    // 5. 按错纠错反馈 (瞬态红雾遮罩)
    if (this.errorLane !== null && now < this.errorUntil) {
      const errX = this.STAGE_X + this.errorLane * this.LANE_W
      const errY = STAGE_HEIGHT - this.ROW_H
      ctx.fillStyle = 'rgba(239, 68, 68, 0.7)'
      ctx.fillRect(errX, errY, this.LANE_W, this.ROW_H)
    }

    // 6. 舞台外侧暗色遮罩
    ctx.fillStyle = '#09090b'
    ctx.fillRect(0, 0, this.STAGE_X, STAGE_HEIGHT)
    ctx.fillRect(this.STAGE_X + this.STAGE_W, 0, this.STAGE_X, STAGE_HEIGHT)

    // 舞台边界外框
    ctx.strokeStyle = '#27272a'
    ctx.lineWidth = 2
    ctx.strokeRect(this.STAGE_X, 0, this.STAGE_W, STAGE_HEIGHT)

    // 7. 轨道底端键位水印 (DFJK)
    ctx.font = 'bold 24px ui-monospace, monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (let i = 0; i < 4; i++) {
      const cx = this.STAGE_X + i * this.LANE_W + this.LANE_W / 2
      ctx.fillStyle = (i === this.tiles[0]) ? '#38bdf8' : 'rgba(255, 255, 255, 0.25)'
      ctx.fillText(this.LANE_KEYS[i]!, cx, STAGE_HEIGHT - 24)
    }

    // 8. 冷启动前置提示
    if (!this.isStarted) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
      ctx.fillRect(this.STAGE_X, 0, this.STAGE_W, STAGE_HEIGHT)

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 22px ui-monospace, monospace'
      ctx.fillText('按底端藍色鍵啟動', STAGE_CENTER_X, STAGE_HEIGHT / 2 - 14)
      ctx.font = 'bold 15px ui-monospace, monospace'
      ctx.fillStyle = '#93c5fd'
      ctx.fillText('[ D ]  [ F ]  [ J ]  [ K ]', STAGE_CENTER_X, STAGE_HEIGHT / 2 + 22)
    }
  }

  onKeyDown(code: string, e: KeyboardEvent): void {
    if (e.repeat || this.isCompleted) return

    const lane = this.CODE_TO_LANE[code]
    if (lane === undefined) return
    e.preventDefault()

    const now = performance.now()
    this.isStarted = true

    // 判定是否命中当前底部目标 tiles[0]
    if (lane === this.tiles[0]) {
      this.correctHits++
      this.currentStreak++
      this.maxStreak = Math.max(this.maxStreak, this.currentStreak)

      const tx = this.STAGE_X + lane * this.LANE_W + this.LANE_W / 2
      const ty = STAGE_HEIGHT - this.ROW_H / 2
      this.context.addScore(30, tx, ty, '#10b981')

      // 滚动出队并注入新块
      this.tiles.shift()
      this.tiles.push(randInt(0, 3))
      this.errorLane = null
    } else {
      // 击错惩罚：扣 60 分并闪红，重置连击
      this.mistakes++
      this.currentStreak = 0
      this.errorLane = lane
      this.errorUntil = now + 160

      const errX = this.STAGE_X + lane * this.LANE_W + this.LANE_W / 2
      const errY = STAGE_HEIGHT - this.ROW_H / 2
      this.context.addScore(-60, errX, errY, '#ef4444')
    }
  }

  // 鼠标/触控单点应急点击底端方块 (消灭 450 魔数)
  onPointerDown(x: number, y: number): void {
    const bottomLineY = STAGE_HEIGHT - this.ROW_H
    if (this.isCompleted || y < bottomLineY || x < this.STAGE_X || x > this.STAGE_X + this.STAGE_W) return

    const lane = Math.floor((x - this.STAGE_X) / this.LANE_W)
    if (lane >= 0 && lane <= 3) {
      const pseudoCode = ['KeyD', 'KeyF', 'KeyJ', 'KeyK'][lane]!
      this.onKeyDown(pseudoCode, { repeat: false, preventDefault: () => {} } as KeyboardEvent)
    }
  }

  cleanup(): void {
    this.tiles = []
    this.correctHits = 0
    this.mistakes = 0
    this.currentStreak = 0
    this.maxStreak = 0
    this.isStarted = false
    this.isCompleted = false
  }

  // ★★★ 核心好品味：100% 由对局真实击键与连击推导产出 ★★★
  getResultSummary(): ModuleResultSummary {
    const total = this.correctHits + this.mistakes
    const accNum = total > 0 ? (this.correctHits / total) * 100 : 100
    const accStr = `${accNum.toFixed(1)}%`
    const kps = (this.correctHits / 60).toFixed(2)
    const scoreVal = Math.max(0, this.correctHits * 30 - this.mistakes * 60)

    const rating = (scoreVal >= 12000 && accNum >= 95)
      ? 'FLAWLESS ACE'
      : (scoreVal >= 8000 && accNum >= 85)
        ? 'COMBAT READY'
        : 'STANDARD CADENCE'

    return {
      rating,
      metrics: [
        { value: `${kps} KPS`, label: 'STRIKE RATE', badge: Number(kps) >= 6.0 ? 'x2.00' : 'PEAK' },
        { value: accStr, label: 'ACCURACY' },
        { value: String(this.maxStreak), label: 'PEAK STREAK' },
        { value: String(this.mistakes), label: 'WHIFFS' }
      ]
    }
  }
}