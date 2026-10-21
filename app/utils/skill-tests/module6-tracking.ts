// app/utils/skill-tests/module6-tracking.ts
import type { SkillModuleInstance, SkillGameContext } from './types'

interface TrackingTarget {
  x: number
  y: number
  r: number
  targetR: number
  speed: number
  targetSpeed: number
  destX: number
  destY: number
}

export class Module6Tracking implements SkillModuleInstance {
  id = 6
  title = 'Smooth Tracking // 平滑跟槍測定'

  private context!: SkillGameContext
  private tickAccumulator = 0
  private mouseX = -9999
  private mouseY = -9999
  private isOnTarget = false

  private target: TrackingTarget = {
    x: 400,
    y: 300,
    r: 32,
    targetR: 32,
    speed: 260,
    targetSpeed: 260,
    destX: 400,
    destY: 300
  }

  init(context: SkillGameContext) {
    this.context = context
    this.tickAccumulator = 0
    this.mouseX = -9999
    this.mouseY = -9999
    this.isOnTarget = false

    this.target = {
      x: 400,
      y: 300,
      r: 32,
      targetR: 32,
      speed: 260,
      targetSpeed: 260,
      destX: 400,
      destY: 300
    }
    this.pickNextWaypoint()
  }

  private rand(min: number, max: number): number {
    return Math.random() * (max - min) + min
  }

  private pickNextWaypoint() {
    const t = this.target
    const pad = 60
    t.destX = this.rand(pad, 800 - pad)
    t.destY = this.rand(pad, 600 - pad)
    t.targetR = this.rand(20, 45)
    t.targetSpeed = this.rand(180, 420)
  }

  // ★ 核心契约：接收宿主换算后的归一化逻辑坐标
  onPointerMove(x: number, y: number) {
    this.mouseX = x
    this.mouseY = y
  }

  onPointerLeave() {
    this.mouseX = -9999
    this.mouseY = -9999
  }

  update(dt: number, now: number, elapsed: number) {
    const t = this.target

    // 1. 半径与速度插值过渡
    t.r += (t.targetR - t.r) * 3.0 * dt
    t.speed += (t.targetSpeed - t.speed) * 3.0 * dt

    // 2. 向量平移
    const dx = t.destX - t.x
    const dy = t.destY - t.y
    const dist = Math.hypot(dx, dy)
    const step = t.speed * dt

    if (dist <= step) {
      t.x = t.destX
      t.y = t.destY
      this.pickNextWaypoint()
    } else {
      t.x += (dx / dist) * step
      t.y += (dy / dist) * step
    }

    // 3. 几何判定
    const cursorDistSq = (this.mouseX - t.x) ** 2 + (this.mouseY - t.y) ** 2
    this.isOnTarget = cursorDistSq <= t.r * t.r

    // 4. 60Hz 独立时钟步长累加器 (每 16.6667ms 判定一次)
    const TICK_MS = 1000 / 60
    this.tickAccumulator += dt * 1000

    while (this.tickAccumulator >= TICK_MS) {
      if (this.isOnTarget) {
        // ★ 每个命中 Tick 奖励 4 分 (满分 14,400 分，无飘字粒子，无性能损耗)
        this.context.addScore(4)
      }
      this.tickAccumulator -= TICK_MS
    }
  }

  render(ctx: CanvasRenderingContext2D, now: number) {
    const t = this.target

    // 前 30 秒绘制导引参考虚线
    ctx.beginPath()
    ctx.moveTo(t.x, t.y)
    ctx.lineTo(t.destX, t.destY)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 6])
    ctx.stroke()
    ctx.setLineDash([])

    // 跟踪主圆环
    ctx.beginPath()
    ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2)
    ctx.fillStyle = this.isOnTarget ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.15)'
    ctx.fill()
    ctx.lineWidth = this.isOnTarget ? 3.5 : 2
    ctx.strokeStyle = this.isOnTarget ? '#22c55e' : '#ef4444'
    ctx.stroke()

    // 中心微型瞄准点
    ctx.beginPath()
    ctx.arc(t.x, t.y, 3, 0, Math.PI * 2)
    ctx.fillStyle = this.isOnTarget ? '#4ade80' : '#f87171'
    ctx.fill()

    // 绘制跟踪状态 HUD
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.font = 'bold 14px ui-monospace, monospace'
    ctx.fillStyle = this.isOnTarget ? '#22c55e' : '#ef4444'
    ctx.fillText(`TARGET_LOCK: ${this.isOnTarget ? 'LOCKED [ON]' : 'SEARCHING...'}`, 16, 16)
  }

  cleanup() {
    this.mouseX = -9999
    this.mouseY = -9999
  }
}