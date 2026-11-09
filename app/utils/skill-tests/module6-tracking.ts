// app/utils/skill-tests/module6-tracking.ts
import {
  STAGE_WIDTH,
  STAGE_HEIGHT,
  STAGE_CENTER_X,
  STAGE_CENTER_Y,
  type SkillModuleInstance,
  type SkillGameContext,
  type ModuleResultSummary,
  type Circle
} from './types'
import { rand } from './math'

// 1. 实体图元继承自标准 Circle (消灭重复声明 x, y, r)
interface TrackingTarget extends Circle {
  targetR: number
  speed: number
  targetSpeed: number
  destX: number
  destY: number
}

export class Module6Tracking implements SkillModuleInstance {
  readonly id = 6
  readonly title = 'Smooth Tracking // 平滑跟槍測定'
  readonly durationMs = 60000
  isCompleted = false

  private context!: SkillGameContext
  private tickAccumulator = 0
  private mouseX = -9999
  private mouseY = -9999
  private isOnTarget = false

  // 2. 真实 60Hz 战术跟枪遥测数据 (彻底消灭假数据)
  private totalTicks = 0
  private lockedTicks = 0
  private currentStreakTicks = 0
  private maxStreakTicks = 0
  private lostLocks = 0
  private wasOnTarget = false

  private target: TrackingTarget = {
    x: STAGE_CENTER_X,
    y: STAGE_CENTER_Y,
    r: 32,
    targetR: 32,
    speed: 260,
    targetSpeed: 260,
    destX: STAGE_CENTER_X,
    destY: STAGE_CENTER_Y
  }

  init(context: SkillGameContext): void {
    this.context = context
    this.tickAccumulator = 0
    this.mouseX = -9999
    this.mouseY = -9999
    this.isOnTarget = false
    this.wasOnTarget = false

    this.totalTicks = 0
    this.lockedTicks = 0
    this.currentStreakTicks = 0
    this.maxStreakTicks = 0
    this.lostLocks = 0
    this.isCompleted = false

    this.target = {
      x: STAGE_CENTER_X,
      y: STAGE_CENTER_Y,
      r: 32,
      targetR: 32,
      speed: 260,
      targetSpeed: 260,
      destX: STAGE_CENTER_X,
      destY: STAGE_CENTER_Y
    }
    this.pickNextWaypoint()
  }

  private pickNextWaypoint(): void {
    const t = this.target
    const pad = 60
    // ★ 核心好品味：使用视口物理常量与纯函数 rand
    t.destX = rand(pad, STAGE_WIDTH - pad)
    t.destY = rand(pad, STAGE_HEIGHT - pad)
    t.targetR = rand(20, 45)
    t.targetSpeed = rand(180, 420)
  }

  onPointerMove(x: number, y: number): void {
    this.mouseX = x
    this.mouseY = y
  }

  onPointerLeave(): void {
    this.mouseX = -9999
    this.mouseY = -9999
  }

  update(dt: number, now: number, elapsed: number): void {
    // ★ 核心生命周期修复：60 秒自然完赛切断
    if (elapsed >= this.durationMs) {
      this.isCompleted = true
      return
    }

    const t = this.target

    // 1. 半径与速度平滑插值过渡
    t.r += (t.targetR - t.r) * 3.0 * dt
    t.speed += (t.targetSpeed - t.speed) * 3.0 * dt

    // 2. 向量平移物理推进
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

    // 4. 60Hz 独立时钟步长累加器 (严格每 16.6667ms 裁决一次)
    const TICK_MS = 1000 / 60
    this.tickAccumulator += dt * 1000

    while (this.tickAccumulator >= TICK_MS) {
      this.totalTicks++

      if (this.isOnTarget) {
        this.lockedTicks++
        this.currentStreakTicks++
        this.maxStreakTicks = Math.max(this.maxStreakTicks, this.currentStreakTicks)
        this.context.addScore(4)
      } else {
        // ★ 核心遥测：捕获由锁定变为脱靶的边沿跳变，记录脱锁次数
        if (this.wasOnTarget) {
          this.lostLocks++
        }
        this.currentStreakTicks = 0
      }

      this.wasOnTarget = this.isOnTarget
      this.tickAccumulator -= TICK_MS
    }
  }

  render(ctx: CanvasRenderingContext2D, now: number, elapsed: number = 0): void {
    const t = this.target

    // 前 30 秒绘制导引虚线，30.0s 瞬间隐形
    if (elapsed < 30000) {
      ctx.beginPath()
      ctx.moveTo(t.x, t.y)
      ctx.lineTo(t.destX, t.destY)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 6])
      ctx.stroke()
      ctx.setLineDash([])
    }

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

  cleanup(): void {
    this.mouseX = -9999
    this.mouseY = -9999
    this.totalTicks = 0
    this.lockedTicks = 0
    this.currentStreakTicks = 0
    this.maxStreakTicks = 0
    this.lostLocks = 0
    this.isCompleted = false
  }

  // ★★★ 核心修复：100% 由 60Hz 独立物理时钟真实咬合数据推导产出 ★★★
  getResultSummary(): ModuleResultSummary {
    const accNum = this.totalTicks > 0 ? (this.lockedTicks / this.totalTicks) * 100 : 0
    const accStr = `${accNum.toFixed(1)}%`
    const maxStreakSec = `${(this.maxStreakTicks / 60).toFixed(1)}s`

    const rating = (accNum >= 80 && this.maxStreakTicks >= 240)
      ? 'FLAWLESS ACE'
      : (accNum >= 55)
        ? 'COMBAT READY'
        : 'TACTICAL LOCK'

    return {
      rating,
      metrics: [
        { value: accStr, label: 'SMOOTH ACC', badge: accNum >= 85 ? 'x2.00' : accNum >= 75 ? 'x1.85' : 'LOCK' },
        { value: maxStreakSec, label: 'MAX STREAK', badge: this.maxStreakTicks >= 180 ? 'PEAK' : undefined },
        { value: '60Hz', label: 'TICK CADENCE' },
        { value: String(this.lostLocks), label: 'LOST LOCKS' }
      ]
    }
  }
}