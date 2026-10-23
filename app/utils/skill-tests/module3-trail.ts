// app/utils/skill-tests/module3-trail.ts
import {
  STAGE_WIDTH,
  STAGE_HEIGHT,
  type SkillModuleInstance,
  type SkillGameContext,
  type ModuleResultSummary,
  type Circle
} from './types'
import { rand } from './math'

// 1. 实体图元继承自标准 Circle (数据结构正交对齐)
interface NumberCircle extends Circle {
  id: number
}

export class Module3Trail implements SkillModuleInstance {
  readonly id = 3
  readonly title = 'Number Trail // 數字路徑追蹤'
  readonly durationMs = 60000
  isCompleted = false

  private context!: SkillGameContext
  private expectedNumber = 1
  private nextSpawnNumber = 1
  private readonly maxActiveCircles = 20
  private nextSpawnTime = 0
  private circles: NumberCircle[] = []

  // 2. 真实战术遥测数据 (彻底告别假数据)
  private clearedCount = 0
  private maxSequence = 0
  private orderErrors = 0
  private whiffs = 0

  init(context: SkillGameContext): void {
    this.context = context
    this.expectedNumber = 1
    this.nextSpawnNumber = 1
    this.circles = []
    this.clearedCount = 0
    this.maxSequence = 0
    this.orderErrors = 0
    this.whiffs = 0
    this.isCompleted = false

    const now = performance.now()
    this.nextSpawnTime = now

    const initialCount = Math.floor(rand(3, 6))
    for (let i = 0; i < initialCount; i++) {
      if (this.spawnSingleCircle(this.nextSpawnNumber)) {
        this.nextSpawnNumber++
      }
    }
  }

  private isPositionSafe(x: number, y: number): boolean {
    const MIN_DIST_SQ = 60 * 60 // 3600 (安全间隙)
    return this.circles.every(c => (x - c.x) ** 2 + (y - c.y) ** 2 >= MIN_DIST_SQ)
  }

  private spawnSingleCircle(num: number): boolean {
    const r = 26
    // ★ 核心好品味：使用视口物理常量与纯函数 rand，彻底消灭魔数
    for (let attempt = 0; attempt < 30; attempt++) {
      const x = rand(r + 20, STAGE_WIDTH - r - 20)
      const y = rand(r + 40, STAGE_HEIGHT - r - 20) // 预留顶部 HUD 空间

      if (this.isPositionSafe(x, y)) {
        this.circles.push({ id: num, x, y, r })
        return true
      }
    }
    return false
  }

  private getNextSpawnInterval(elapsed: number): number {
    const x = Math.min(Math.max(0, elapsed / this.durationMs), 1)
    const currentFreq = 1.3 + 4.5 * (x * x)
    return Math.max(180, 1000 / currentFreq)
  }

  private triggerSpawnWave(now: number, elapsed: number): void {
    const count = elapsed >= 20000 ? 2 : 1
    for (let i = 0; i < count; i++) {
      if (this.circles.length >= this.maxActiveCircles) break
      if (this.spawnSingleCircle(this.nextSpawnNumber)) {
        this.nextSpawnNumber++
      }
    }
    this.nextSpawnTime = now + this.getNextSpawnInterval(elapsed)
  }

  update(dt: number, now: number, elapsed: number): void {
    // ★ 核心生命周期修复：60 秒自然完赛切断
    if (elapsed >= this.durationMs) {
      this.isCompleted = true
      return
    }

    if (now >= this.nextSpawnTime) {
      this.triggerSpawnWave(now, elapsed)
    }
  }

  onPointerDown(mx: number, my: number, now: number): void {
    if (this.isCompleted) return

    const elapsed = now - (this.nextSpawnTime - this.getNextSpawnInterval(0))

    // 逆序查找命中
    for (let i = this.circles.length - 1; i >= 0; i--) {
      const c = this.circles[i]
      if (!c) continue

      const distSq = (mx - c.x) ** 2 + (my - c.y) ** 2
      if (distSq <= c.r * c.r) {
        if (c.id === this.expectedNumber) {
          // 正确命中：累加最高序列与命中数
          this.clearedCount++
          this.maxSequence = Math.max(this.maxSequence, c.id)

          const hitScore = c.id
          this.expectedNumber++
          this.circles.splice(i, 1)
          this.context.addScore(hitScore, c.x, c.y, '#4ade80')

          // 盘面全清立刻补发波次
          if (this.circles.length === 0) {
            this.triggerSpawnWave(now, elapsed)
          }
        } else {
          // ★ 核心遥测：顺序错误记录
          this.orderErrors++
          this.context.addScore(-50, c.x, c.y, '#ef4444')
        }
        return
      }
    }

    // ★ 核心遥测：点空失误记录
    this.whiffs++
    this.context.addScore(-50, mx, my, '#ef4444')
  }

  render(ctx: CanvasRenderingContext2D, now: number): void {
    // 1. 绘制当前目标提示水印
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.font = 'bold 14px ui-monospace, monospace'
    ctx.fillStyle = '#facc15'
    ctx.fillText(`NEXT TARGET: [ ${this.expectedNumber} ]`, 16, 16)

    // 2. 绘制数字圆圈
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = 'bold 20px ui-monospace, monospace'

    for (let i = 0; i < this.circles.length; i++) {
      const c = this.circles[i]
      if (!c) continue

      const isTarget = c.id === this.expectedNumber

      ctx.beginPath()
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2)
      ctx.fillStyle = isTarget ? '#1e293b' : '#27272a'
      ctx.fill()
      ctx.lineWidth = isTarget ? 3 : 1.5
      ctx.strokeStyle = isTarget ? '#38bdf8' : '#71717a'
      ctx.stroke()

      ctx.fillStyle = isTarget ? '#38bdf8' : '#e4e4e7'
      ctx.fillText(String(c.id), c.x, c.y)
    }
  }

  cleanup(): void {
    this.circles = []
    this.clearedCount = 0
    this.maxSequence = 0
    this.orderErrors = 0
    this.whiffs = 0
    this.isCompleted = false
  }

  // ★★★ 核心修复：100% 由对局真实认知链条推导产出 ★★★
  getResultSummary(): ModuleResultSummary {
    const totalAttempts = this.clearedCount + this.orderErrors + this.whiffs
    const accNum = totalAttempts > 0 ? (this.clearedCount / totalAttempts) * 100 : 100
    const accStr = `${accNum.toFixed(1)}%`

    const rating = (this.maxSequence >= 30 && accNum >= 90)
      ? 'FLAWLESS ACE'
      : (this.maxSequence >= 20 && accNum >= 80)
        ? 'COMBAT READY'
        : 'TACTICAL APEX'

    return {
      rating,
      metrics: [
        { value: `SEQ #${this.maxSequence}`, label: 'PEAK SEQUENCE', badge: this.maxSequence >= 28 ? 'x2.00' : 'APEX' },
        { value: accStr, label: 'ACCURACY' },
        { value: String(this.clearedCount), label: 'NODES CLEARED' },
        { value: String(this.orderErrors + this.whiffs), label: 'FAULT PENALTIES' }
      ]
    }
  }
}