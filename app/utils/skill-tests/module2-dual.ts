// app/utils/skill-tests/module2-dual.ts
import {
  STAGE_WIDTH,
  STAGE_HEIGHT,
  STAGE_CENTER_X,
  type SkillModuleInstance,
  type SkillGameContext,
  type ModuleResultSummary,
  type Rect
} from './types'
import { rand, checkAABB } from './math'

// 1. 实体图元统一继承自标准 Rect (消灭重复字段手搓)
interface Player extends Rect {
  speed: number
  invulnerableUntil: number
}

interface Obstacle extends Rect {
  vx: number
  vy: number
  target: 'left' | 'right'
  color: string
}

export class Module2Dual implements SkillModuleInstance {
  readonly id = 2
  readonly title = 'Dual Controller // 雙軸協調測驗'
  readonly durationMs = 60000
  isCompleted = false

  private context!: SkillGameContext
  private splitX = STAGE_CENTER_X

  private keys = {
    KeyA: false,
    KeyD: false,
    ArrowUp: false,
    ArrowDown: false
  }

  private pLeft: Player = {
    x: 185,
    y: 550,
    w: 30,
    h: 30,
    speed: 400,
    invulnerableUntil: 0
  }

  private pRight: Player = {
    x: 755,
    y: 285,
    w: 30,
    h: 30,
    speed: 400,
    invulnerableUntil: 0
  }

  private nextVerticalSpawn = 0
  private nextHorizontalSpawn = 0
  private obstacles: Obstacle[] = []

  // 2. 真实战术遥测数据 (彻底补齐结算指标)
  private dodged = 0
  private hitsTaken = 0
  private currentStreak = 0
  private maxStreak = 0

  init(context: SkillGameContext): void {
    this.context = context
    this.splitX = STAGE_CENTER_X
    this.obstacles = []
    this.cleanupKeys()

    this.dodged = 0
    this.hitsTaken = 0
    this.currentStreak = 0
    this.maxStreak = 0
    this.isCompleted = false

    this.pLeft = { x: 185, y: 550, w: 30, h: 30, speed: 400, invulnerableUntil: 0 }
    this.pRight = { x: 755, y: 285, w: 30, h: 30, speed: 400, invulnerableUntil: 0 }

    const now = performance.now()
    this.nextVerticalSpawn = now
    this.nextHorizontalSpawn = now
  }

  private cleanupKeys(): void {
    this.keys.KeyA = false
    this.keys.KeyD = false
    this.keys.ArrowUp = false
    this.keys.ArrowDown = false
  }

  private getSplitX(elapsed: number): number {
    if (elapsed < 15000) return STAGE_CENTER_X
    if (elapsed > 45000) return 200
    const t = (elapsed - 15000) / 30000
    return STAGE_CENTER_X - t * 200
  }

  private getSpeedMultiplier(elapsedMs: number): number {
    const x = Math.min(Math.max(0, elapsedMs / this.durationMs), 1)
    return 1.0 + 2.0 * (x * x)
  }

  private spawnHorizontalWave(now: number, elapsed: number, speedMultiplier: number): void {
    const count = elapsed >= 45000 ? Math.floor(rand(2, 4)) : 1
    const spawnedY: number[] = []
    const MIN_Y_GAP = 65

    for (let c = 0; c < count; c++) {
      const w = rand(24, 38)
      const h = rand(24, 38)
      const maxY = STAGE_HEIGHT - h
      let chosenY: number | null = null

      for (let attempt = 0; attempt < 25; attempt++) {
        const edgeRoll = Math.random()
        let candidateY: number
        if (edgeRoll < 0.15) {
          candidateY = 0
        } else if (edgeRoll < 0.3) {
          candidateY = maxY
        } else {
          candidateY = rand(0, maxY)
        }

        const isOverlap = spawnedY.some(y => Math.abs(y - candidateY) < MIN_Y_GAP)
        if (!isOverlap) {
          chosenY = candidateY
          break
        }
      }

      if (chosenY !== null) {
        spawnedY.push(chosenY)
        this.obstacles.push({
          x: this.splitX,
          y: chosenY,
          w,
          h,
          vx: rand(240, 330) * speedMultiplier,
          vy: 0,
          target: 'right',
          color: '#fb923c'
        })
      }
    }
  }

  private updateSpawners(now: number, elapsed: number): void {
    const speedMultiplier = this.getSpeedMultiplier(elapsed)
    const progress = Math.min(Math.max(0, elapsed / this.durationMs), 1)

    // 纵向粉红方块 (左半区)
    if (now >= this.nextVerticalSpawn) {
      const w = rand(24, 38)
      const h = rand(24, 38)
      const maxX = Math.max(0, this.splitX - w)
      const baseSpeed = elapsed >= 30000 ? rand(180, 480) : rand(220, 300)

      const edgeRoll = Math.random()
      let spawnX: number
      if (edgeRoll < 0.15) {
        spawnX = 0
      } else if (edgeRoll < 0.3) {
        spawnX = maxX
      } else {
        spawnX = rand(0, maxX)
      }

      this.obstacles.push({
        x: spawnX,
        y: -h,
        w,
        h,
        vx: 0,
        vy: baseSpeed * speedMultiplier,
        target: 'left',
        color: '#f472b6'
      })
      this.nextVerticalSpawn = now + rand(700, 1100) / (1 + progress * 0.5)
    }

    // 横向橙色方块 (右半区)
    if (now >= this.nextHorizontalSpawn) {
      this.spawnHorizontalWave(now, elapsed, speedMultiplier)
      this.nextHorizontalSpawn = now + rand(750, 1150) / (1 + progress * 0.5)
    }
  }

  private updatePhysics(dt: number, now: number, elapsed: number): void {
    this.splitX = this.getSplitX(elapsed)

    // 左玩家物理推进 (A / D)
    if (this.keys.KeyA) this.pLeft.x -= this.pLeft.speed * dt
    if (this.keys.KeyD) this.pLeft.x += this.pLeft.speed * dt
    this.pLeft.x = Math.max(0, Math.min(this.splitX - this.pLeft.w, this.pLeft.x))

    // 右玩家物理推进 (ArrowUp / ArrowDown)
    if (this.keys.ArrowUp) this.pRight.y -= this.pRight.speed * dt
    if (this.keys.ArrowDown) this.pRight.y += this.pRight.speed * dt
    this.pRight.y = Math.max(0, Math.min(STAGE_HEIGHT - this.pRight.h, this.pRight.y))

    // 障碍物推进与碰撞裁决
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i]
      if (!obs) continue

      obs.x += obs.vx * dt
      obs.y += obs.vy * dt

      const targetPlayer = obs.target === 'left' ? this.pLeft : this.pRight

      // ★ 核心好品味：调用通用 checkAABB 判定碰撞
      if (now >= targetPlayer.invulnerableUntil && checkAABB(targetPlayer, obs)) {
        targetPlayer.invulnerableUntil = now + 2000
        this.hitsTaken++
        this.currentStreak = 0

        this.context.addScore(-50, targetPlayer.x + 15, targetPlayer.y, '#ef4444')
        this.obstacles.splice(i, 1)
        continue
      }

      // 出界奖励与避障记录
      if (obs.x > STAGE_WIDTH + 40 || obs.y > STAGE_HEIGHT + 40) {
        this.dodged++
        this.currentStreak++
        this.maxStreak = Math.max(this.maxStreak, this.currentStreak)

        const fx = Math.min(STAGE_WIDTH - 20, Math.max(20, obs.x))
        const fy = Math.min(STAGE_HEIGHT - 20, Math.max(20, obs.y))
        this.context.addScore(25, fx, fy, '#4ade80')
        this.obstacles.splice(i, 1)
      }
    }
  }

  update(dt: number, now: number, elapsed: number): void {
    if (elapsed >= this.durationMs) {
      this.isCompleted = true
      return
    }

    this.updateSpawners(now, elapsed)
    this.updatePhysics(dt, now, elapsed)
  }

  private drawTriangle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    direction: 'up' | 'left',
    isInvulnerable: boolean,
    now: number
  ): void {
    if (isInvulnerable && Math.floor(now / 100) % 2 === 0) return

    ctx.beginPath()
    if (direction === 'up') {
      ctx.moveTo(x + w / 2, y)
      ctx.lineTo(x, y + h)
      ctx.lineTo(x + w, y + h)
    } else {
      ctx.moveTo(x, y + h / 2)
      ctx.lineTo(x + w, y)
      ctx.lineTo(x + w, y + h)
    }
    ctx.closePath()
    ctx.fillStyle = isInvulnerable ? '#fbbf24' : '#38bdf8'
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = '#e0f2fe'
    ctx.stroke()
  }

  render(ctx: CanvasRenderingContext2D, now: number): void {
    // 1. 动态分割虚线
    ctx.beginPath()
    ctx.moveTo(this.splitX, 0)
    ctx.lineTo(this.splitX, STAGE_HEIGHT)
    ctx.lineWidth = 3
    ctx.strokeStyle = '#52525b'
    ctx.setLineDash([8, 8])
    ctx.stroke()
    ctx.setLineDash([])

    // 2. 绘制玩家
    this.drawTriangle(
      ctx,
      this.pLeft.x,
      this.pLeft.y,
      this.pLeft.w,
      this.pLeft.h,
      'up',
      now < this.pLeft.invulnerableUntil,
      now
    )
    this.drawTriangle(
      ctx,
      this.pRight.x,
      this.pRight.y,
      this.pRight.w,
      this.pRight.h,
      'left',
      now < this.pRight.invulnerableUntil,
      now
    )

    // 3. 绘制障碍方块
    for (let i = 0; i < this.obstacles.length; i++) {
      const obs = this.obstacles[i]
      if (!obs) continue
      ctx.fillStyle = obs.color
      ctx.fillRect(obs.x, obs.y, obs.w, obs.h)
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1
      ctx.strokeRect(obs.x, obs.y, obs.w, obs.h)
    }

    // 4. 控制指南微型水印
    ctx.fillStyle = '#71717a'
    ctx.font = '12px ui-monospace, monospace'
    ctx.textAlign = 'left'
    ctx.fillText('P1: [A / D]', 12, STAGE_HEIGHT - 12)
    ctx.textAlign = 'right'
    ctx.fillText('P2: [↑ / ↓]', STAGE_WIDTH - 12, STAGE_HEIGHT - 12)
  }

  onKeyDown(code: string, e: KeyboardEvent): void {
    if (code in this.keys) {
      this.keys[code as keyof typeof this.keys] = true
      e.preventDefault()
    }
  }

  onKeyUp(code: string, e: KeyboardEvent): void {
    if (code in this.keys) {
      this.keys[code as keyof typeof this.keys] = false
      e.preventDefault()
    }
  }

  cleanup(): void {
    this.obstacles = []
    this.cleanupKeys()
    this.dodged = 0
    this.hitsTaken = 0
    this.currentStreak = 0
    this.maxStreak = 0
    this.isCompleted = false
  }

  // ★★★ 核心修复：100% 由对局真实数据计算产出，彻底告别假数据 ★★★
  getResultSummary(): ModuleResultSummary {
    const totalEvents = this.dodged + this.hitsTaken
    const evasionNum = totalEvents > 0 ? (this.dodged / totalEvents) * 100 : 100
    const evasionStr = `${evasionNum.toFixed(1)}%`

    const rating = (evasionNum >= 95 && this.dodged >= 70)
      ? 'FLAWLESS ACE'
      : (evasionNum >= 82 && this.dodged >= 45)
        ? 'COMBAT READY'
        : 'TACTICAL APEX'

    return {
      rating,
      metrics: [
        { value: evasionStr, label: 'EVASION RATE', badge: evasionNum >= 95 ? 'x2.00' : 'APEX' },
        { value: String(this.dodged), label: 'OBSTACLES DODGED' },
        { value: String(this.maxStreak), label: 'PEAK STREAK' },
        { value: String(this.hitsTaken), label: 'COLLISIONS' }
      ]
    }
  }
}