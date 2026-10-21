// app/utils/skill-tests/module3-trail.ts
import type { SkillModuleInstance, SkillGameContext } from './types'

interface NumberCircle {
  id: number
  x: number
  y: number
  r: number
}

export class Module3Trail implements SkillModuleInstance {
  id = 3
  title = 'Number Trail // 數字路徑追蹤'

  private context!: SkillGameContext
  private readonly durationMs = 60000

  private expectedNumber = 1
  private nextSpawnNumber = 1
  private readonly maxActiveCircles = 20
  private nextSpawnTime = 0
  private circles: NumberCircle[] = []

  init(context: SkillGameContext) {
    this.context = context
    this.expectedNumber = 1
    this.nextSpawnNumber = 1
    this.circles = []

    const now = performance.now()
    this.nextSpawnTime = now

    const initialCount = Math.floor(this.rand(3, 6))
    for (let i = 0; i < initialCount; i++) {
      if (this.spawnSingleCircle(this.nextSpawnNumber)) {
        this.nextSpawnNumber++
      }
    }
  }

  private rand(min: number, max: number): number {
    return Math.random() * (max - min) + min
  }

  private isPositionSafe(x: number, y: number): boolean {
    const MIN_DIST_SQ = 60 * 60 // 3600 (安全间隙)
    return this.circles.every(c => (x - c.x) ** 2 + (y - c.y) ** 2 >= MIN_DIST_SQ)
  }

  private spawnSingleCircle(num: number): boolean {
    const r = 26
    for (let attempt = 0; attempt < 30; attempt++) {
      const x = this.rand(r + 20, 800 - r - 20)
      const y = this.rand(r + 40, 600 - r - 20) // 预留顶部 HUD 空间

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

  private triggerSpawnWave(now: number, elapsed: number) {
    const count = elapsed >= 20000 ? 2 : 1
    for (let i = 0; i < count; i++) {
      if (this.circles.length >= this.maxActiveCircles) break
      if (this.spawnSingleCircle(this.nextSpawnNumber)) {
        this.nextSpawnNumber++
      }
    }
    this.nextSpawnTime = now + this.getNextSpawnInterval(elapsed)
  }

  update(dt: number, now: number, elapsed: number) {
    if (now >= this.nextSpawnTime) {
      this.triggerSpawnWave(now, elapsed)
    }
  }

  onPointerDown(mx: number, my: number, now: number) {
    const elapsed = now - (this.nextSpawnTime - this.getNextSpawnInterval(0))

    // 逆序查找命中
    for (let i = this.circles.length - 1; i >= 0; i--) {
      const c = this.circles[i]
      if (!c) continue

      const distSq = (mx - c.x) ** 2 + (my - c.y) ** 2
      if (distSq <= c.r * c.r) {
        if (c.id === this.expectedNumber) {
          // 正确命中
          const hitScore = c.id
          this.expectedNumber++
          this.circles.splice(i, 1)
          this.context.addScore(hitScore, c.x, c.y, '#4ade80')

          // 盘面全清立刻补发波次
          if (this.circles.length === 0) {
            this.triggerSpawnWave(now, elapsed)
          }
        } else {
          // 顺序错误惩罚
          this.context.addScore(-50, c.x, c.y, '#ef4444')
        }
        return
      }
    }

    // 点空惩罚
    this.context.addScore(-50, mx, my, '#ef4444')
  }

  render(ctx: CanvasRenderingContext2D, now: number) {
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

  cleanup() {
    this.circles = []
  }
}