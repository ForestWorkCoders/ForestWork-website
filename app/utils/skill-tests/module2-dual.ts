// app/utils/skill-tests/module2-dual.ts
import type { SkillModuleInstance, SkillGameContext } from './types'

interface Player {
  x: number
  y: number
  w: number
  h: number
  speed: number
  invulnerableUntil: number
}

interface Obstacle {
  x: number
  y: number
  w: number
  h: number
  vx: number
  vy: number
  target: 'left' | 'right'
  color: string
}

export class Module2Dual implements SkillModuleInstance {
  id = 2
  title = 'Dual Controller // 雙軸協調測驗'

  private context!: SkillGameContext
  readonly durationMs = 60000

  private splitX = 400
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

  init(context: SkillGameContext) {
    this.context = context
    this.splitX = 400
    this.obstacles = []
    this.cleanupKeys()

    this.pLeft = { x: 185, y: 550, w: 30, h: 30, speed: 400, invulnerableUntil: 0 }
    this.pRight = { x: 755, y: 285, w: 30, h: 30, speed: 400, invulnerableUntil: 0 }

    const now = performance.now()
    this.nextVerticalSpawn = now
    this.nextHorizontalSpawn = now
  }

  private cleanupKeys() {
    this.keys.KeyA = false
    this.keys.KeyD = false
    this.keys.ArrowUp = false
    this.keys.ArrowDown = false
  }

  private rand(min: number, max: number): number {
    return Math.random() * (max - min) + min
  }

  private getSplitX(elapsed: number): number {
    if (elapsed < 15000) return 400
    if (elapsed > 45000) return 200
    const t = (elapsed - 15000) / 30000
    return 400 - t * 200
  }

  private getSpeedMultiplier(elapsedMs: number): number {
    const x = Math.min(Math.max(0, elapsedMs / this.durationMs), 1)
    return 1.0 + 2.0 * (x * x)
  }

  private checkAABB(r1: { x: number; y: number; w: number; h: number }, r2: Obstacle): boolean {
    return (
      r1.x < r2.x + r2.w &&
      r1.x + r1.w > r2.x &&
      r1.y < r2.y + r2.h &&
      r1.y + r1.h > r2.y
    )
  }

  private spawnHorizontalWave(now: number, elapsed: number, speedMultiplier: number) {
    const count = elapsed >= 45000 ? Math.floor(this.rand(2, 4)) : 1
    const spawnedY: number[] = []
    const MIN_Y_GAP = 65

    for (let c = 0; c < count; c++) {
      const w = this.rand(24, 38)
      const h = this.rand(24, 38)
      const maxY = 600 - h
      let chosenY: number | null = null

      for (let attempt = 0; attempt < 25; attempt++) {
        const edgeRoll = Math.random()
        let candidateY: number
        if (edgeRoll < 0.15) {
          candidateY = 0
        } else if (edgeRoll < 0.3) {
          candidateY = maxY
        } else {
          candidateY = this.rand(0, maxY)
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
          vx: this.rand(240, 330) * speedMultiplier,
          vy: 0,
          target: 'right',
          color: '#fb923c'
        })
      }
    }
  }

  private updateSpawners(now: number, elapsed: number) {
    const speedMultiplier = this.getSpeedMultiplier(elapsed)
    const progress = Math.min(Math.max(0, elapsed / this.durationMs), 1)

    // 纵向粉红方块 (左半区)
    if (now >= this.nextVerticalSpawn) {
      const w = this.rand(24, 38)
      const h = this.rand(24, 38)
      const maxX = Math.max(0, this.splitX - w)
      const baseSpeed = elapsed >= 30000 ? this.rand(180, 480) : this.rand(220, 300)

      const edgeRoll = Math.random()
      let spawnX: number
      if (edgeRoll < 0.15) {
        spawnX = 0
      } else if (edgeRoll < 0.3) {
        spawnX = maxX
      } else {
        spawnX = this.rand(0, maxX)
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
      this.nextVerticalSpawn = now + this.rand(700, 1100) / (1 + progress * 0.5)
    }

    // 横向橙色方块 (右半区)
    if (now >= this.nextHorizontalSpawn) {
      this.spawnHorizontalWave(now, elapsed, speedMultiplier)
      this.nextHorizontalSpawn = now + this.rand(750, 1150) / (1 + progress * 0.5)
    }
  }

  private updatePhysics(dt: number, now: number, elapsed: number) {
    this.splitX = this.getSplitX(elapsed)

    // 左玩家物理推进 (A / D)
    if (this.keys.KeyA) this.pLeft.x -= this.pLeft.speed * dt
    if (this.keys.KeyD) this.pLeft.x += this.pLeft.speed * dt
    this.pLeft.x = Math.max(0, Math.min(this.splitX - this.pLeft.w, this.pLeft.x))

    // 右玩家物理推进 (ArrowUp / ArrowDown)
    if (this.keys.ArrowUp) this.pRight.y -= this.pRight.speed * dt
    if (this.keys.ArrowDown) this.pRight.y += this.pRight.speed * dt
    this.pRight.y = Math.max(0, Math.min(600 - this.pRight.h, this.pRight.y))

    // 障碍物推进与碰撞裁决
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i]
      if (!obs) continue

      obs.x += obs.vx * dt
      obs.y += obs.vy * dt

      const targetPlayer = obs.target === 'left' ? this.pLeft : this.pRight

      // 碰撞检测
      if (now >= targetPlayer.invulnerableUntil && this.checkAABB(targetPlayer, obs)) {
        targetPlayer.invulnerableUntil = now + 2000
        this.context.addScore(-50, targetPlayer.x + 15, targetPlayer.y, '#ef4444')
        this.obstacles.splice(i, 1)
        continue
      }

      // 出界奖励
      if (obs.x > 800 + 40 || obs.y > 600 + 40) {
        const fx = Math.min(800 - 20, Math.max(20, obs.x))
        const fy = Math.min(600 - 20, Math.max(20, obs.y))
        this.context.addScore(25, fx, fy, '#4ade80')
        this.obstacles.splice(i, 1)
      }
    }
  }

  update(dt: number, now: number, elapsed: number) {
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
  ) {
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

  render(ctx: CanvasRenderingContext2D, now: number) {
    // 1. 动态分割虚线
    ctx.beginPath()
    ctx.moveTo(this.splitX, 0)
    ctx.lineTo(this.splitX, 600)
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

    // 4. 控制指南微型水印 (无干扰指引)
    ctx.fillStyle = '#71717a'
    ctx.font = '12px ui-monospace, monospace'
    ctx.textAlign = 'left'
    ctx.fillText('P1: [A / D]', 12, 588)
    ctx.textAlign = 'right'
    ctx.fillText('P2: [↑ / ↓]', 788, 588)
  }

  onKeyDown(code: string, e: KeyboardEvent) {
    if (code in this.keys) {
      this.keys[code as keyof typeof this.keys] = true
      e.preventDefault()
    }
  }

  onKeyUp(code: string, e: KeyboardEvent) {
    if (code in this.keys) {
      this.keys[code as keyof typeof this.keys] = false
      e.preventDefault()
    }
  }

  cleanup() {
    this.obstacles = []
    this.cleanupKeys()
  }
}