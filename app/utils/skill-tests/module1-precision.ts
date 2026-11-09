// app/utils/skill-tests/module1-precision.ts
import type { SkillModuleInstance, SkillGameContext } from './types'

interface Circle {
  x: number
  y: number
  spawnTime: number
  duration: number
}

export class Module1Precision implements SkillModuleInstance {
  id = 1
  title = 'Circle Precision // 准度測驗'

  private context!: SkillGameContext
  private circles: Circle[] = []
  private nextSpawnTime = 0
  private readonly durationMs = 60000

  init(context: SkillGameContext) {
    this.context = context
    this.circles = []
    this.nextSpawnTime = performance.now()
  }

  private rand(min: number, max: number) {
    return Math.random() * (max - min) + min
  }

  private isPositionSafe(x: number, y: number): boolean {
    const MIN_DIST_SQ = 100 * 100
    return this.circles.every(c => (x - c.x) ** 2 + (y - c.y) ** 2 >= MIN_DIST_SQ)
  }

  private getNextInterval(elapsedMs: number): number {
    const x = Math.min(Math.max(0, elapsedMs / this.durationMs), 1)
    const currentFreq = 0.5 + (3.5 - 0.5) * (x * x)
    return Math.max(250, 1000 / currentFreq)
  }

  private spawnCircle(now: number) {
    const maxRadius = 50
    for (let attempt = 0; attempt < 30; attempt++) {
      const x = this.rand(maxRadius, 800 - maxRadius)
      const y = this.rand(maxRadius, 600 - maxRadius)
      if (this.isPositionSafe(x, y)) {
        this.circles.push({ x, y, spawnTime: now, duration: this.rand(2000, 10000) })
        return
      }
    }
  }

  update(dt: number, now: number, elapsed: number) {
    if (now >= this.nextSpawnTime) {
      this.spawnCircle(now)
      this.nextSpawnTime = now + this.getNextInterval(elapsed)
    }

    // ★ 修复 1：提取局部常量 + 卫语句，消灭连续裸读与 undefined 报错
    for (let i = this.circles.length - 1; i >= 0; i--) {
      const c = this.circles[i]
      if (!c) continue // 卫语句：将 c 精准收窄为确定性 Circle

      if ((now - c.spawnTime) / c.duration >= 1) {
        this.circles.splice(i, 1)
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, now: number) {
    for (const c of this.circles) {
      const t = (now - c.spawnTime) / c.duration
      const radius = Math.max(0.5, 50 * t)

      ctx.beginPath()
      ctx.arc(c.x, c.y, radius, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(239, 68, 68, ${0.4 + 0.4 * (1 - t)})`
      ctx.fill()
      ctx.lineWidth = 1.5
      ctx.strokeStyle = '#f87171'
      ctx.stroke()
    }
  }

  onPointerDown(mx: number, my: number, now: number) {
    // ★ 修复 2：加入卫语句收窄，彻底消除 'c' is possibly 'undefined'
    for (let i = this.circles.length - 1; i >= 0; i--) {
      const c = this.circles[i]
      if (!c) continue // 卫语句：消除 undefined 联合

      const t = (now - c.spawnTime) / c.duration
      const currentRadius = 50 * t
      const hitRadius = Math.max(currentRadius, 8)

      if ((mx - c.x) ** 2 + (my - c.y) ** 2 <= hitRadius ** 2) {
        const hitScore = Math.round(150 * (1 - Math.min(t, 1)))
        this.circles.splice(i, 1)
        this.context.addScore(hitScore, mx, my, '#4ade80')
        return
      }
    }

    // 空击惩罚
    this.context.addScore(-50, mx, my, '#ef4444')
  }

  cleanup() {
    this.circles = []
  }
}