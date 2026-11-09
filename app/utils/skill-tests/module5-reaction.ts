// app/utils/skill-tests/module5-reaction.ts
import {
  STAGE_WIDTH,
  STAGE_HEIGHT,
  STAGE_CENTER_X,
  STAGE_CENTER_Y,
  type SkillModuleInstance,
  type SkillGameContext,
  type ModuleResultSummary,
  type Point,
  type Rect
} from './types'
import { rand, shuffle } from './math'

type StageStatus = 'WAITING' | 'ACTIVE' | 'PENALTY_FREEZE' | 'STAGE_COMPLETE'

interface Stage3Data {
  scopeR: number
  dir: number
  speed: number
  radius: number
  x: number
  y: number
  spawnDelay: number
  isMoving: boolean
}

interface Stage4Data {
  signalTime: number
  targetIndex: number
  boxSize: number
  boxes: Point[]
}

interface Stage5Data {
  nonGreenColors: string[]
  currentColor: string
  nextColorTime: number
  isGreen: boolean
}

export class Module5Reaction implements SkillModuleInstance {
  readonly id = 5
  readonly title = '5-Stage Reaction // 綜合反應時基準'
  readonly durationMs = 0 // 阶段制，不受 60s 倒计时截断
  isCompleted = false

  private context!: SkillGameContext
  private stepIndex = 0
  private stageOrder = [0, 1, 2, 3, 4]
  private stageTimes = [0, 0, 0, 0, 0]
  private status: StageStatus = 'WAITING'
  private triggerTime = 0
  private lastReactionMs = 0
  private penaltyUntil = 0

  // 1. 真实遥测数据 (彻底告别假数据)
  private falseStarts = 0

  // 2. 交互图元结构收敛为标准 Rect
  private readonly nextBtn: Rect = {
    x: 280,
    y: 380,
    w: 240,
    h: 54
  }

  private s1SignalTime = 0
  private s2Data = { lightStartTime: 0, f1TotalLights: 0, signalTime: 0 }
  private s3Data: Stage3Data = { scopeR: 170, dir: 1, speed: 850, radius: 20, x: 0, y: STAGE_CENTER_Y, spawnDelay: 0, isMoving: false }
  private s4Data: Stage4Data = { signalTime: 0, targetIndex: 0, boxSize: 54, boxes: [] }
  private s5Data: Stage5Data = { nonGreenColors: ['#f43f5e', '#38bdf8', '#c084fc', '#fb923c', '#facc15'], currentColor: '#f43f5e', nextColorTime: 0, isGreen: false }

  private readonly STAGE_NAMES = [
    'Stage 1 (簡單紅綠燈)',
    'Stage 2 (F1 熄滅反應)',
    'Stage 3 (狙擊鏡架點)',
    'Stage 4 (視野全域突變)',
    'Stage 5 (綠燈選擇抑制)'
  ]

  init(context: SkillGameContext): void {
    this.context = context
    this.stepIndex = 0
    this.stageOrder = shuffle([0, 1, 2, 3, 4])
    this.stageTimes = [0, 0, 0, 0, 0]
    this.status = 'WAITING'
    this.falseStarts = 0
    this.isCompleted = false
    this.initCurrentStage(performance.now())
  }

  private getActiveStageId(): number {
    return this.stageOrder[this.stepIndex] ?? 0
  }

  private initCurrentStage(now: number): void {
    this.status = 'WAITING'
    this.triggerTime = 0
    const stageId = this.getActiveStageId()

    if (stageId === 0) {
      this.s1SignalTime = now + rand(1500, 4000)
    } else if (stageId === 1) {
      this.s2Data.lightStartTime = now
      this.s2Data.f1TotalLights = 0
      this.s2Data.signalTime = now + 4000 + rand(1000, 2500)
    } else if (stageId === 2) {
      const dir = Math.random() < 0.5 ? 1 : -1
      const scopeR = 170
      const radius = 20
      this.s3Data = {
        scopeR,
        dir,
        speed: 850,
        radius,
        x: dir === 1 ? (STAGE_CENTER_X - scopeR - radius) : (STAGE_CENTER_X + scopeR + radius),
        y: STAGE_CENTER_Y,
        spawnDelay: now + rand(1200, 2500),
        isMoving: false
      }
    } else if (stageId === 3) {
      const boxes: Point[] = []
      const boxSize = 54
      const cellW = 200
      const cellH = 150
      const pad = 12

      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          boxes.push({
            x: rand(c * cellW + pad, (c + 1) * cellW - boxSize - pad),
            y: rand(r * cellH + pad, (r + 1) * cellH - boxSize - pad)
          })
        }
      }

      this.s4Data = {
        signalTime: now + rand(1500, 3500),
        targetIndex: Math.floor(rand(0, 16)),
        boxSize,
        boxes
      }
    } else if (stageId === 4) {
      const nonGreen = ['#f43f5e', '#38bdf8', '#c084fc', '#fb923c', '#facc15']
      this.s5Data = {
        nonGreenColors: nonGreen,
        currentColor: nonGreen[Math.floor(rand(0, nonGreen.length))] || '#f43f5e',
        nextColorTime: now + rand(1000, 3000),
        isGreen: false
      }
    }
  }

  private triggerEarlyMistake(now: number): void {
    // ★ 核心遥测：准确记录抢跑失误
    this.falseStarts++
    this.status = 'PENALTY_FREEZE'
    this.penaltyUntil = now + 1000
    this.context.addScore(-250, STAGE_CENTER_X, STAGE_CENTER_Y, '#ef4444')
  }

  onPointerDown(mx: number, my: number, now: number): void {
    if (this.status === 'PENALTY_FREEZE' || this.isCompleted) return

    if (this.status === 'WAITING') {
      this.triggerEarlyMistake(now)
      return
    }

    if (this.status === 'ACTIVE') {
      const reactionMs = Math.round(now - this.triggerTime)
      const stageId = this.getActiveStageId()
      this.stageTimes[stageId] = reactionMs
      this.lastReactionMs = reactionMs

      const stageScore = Math.max(0, Math.round(3000 - reactionMs * 6))
      this.context.addScore(stageScore, STAGE_CENTER_X, 200, '#a855f7')

      this.status = 'STAGE_COMPLETE'
      return
    }

    if (this.status === 'STAGE_COMPLETE') {
      const btn = this.nextBtn
      const hitBtn = mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h

      if (hitBtn) {
        if (this.stepIndex < 4) {
          this.stepIndex++
          this.initCurrentStage(now)
        } else {
          this.isCompleted = true
        }
      }
    }
  }

  update(dt: number, now: number, elapsed: number): void {
    if (this.status === 'PENALTY_FREEZE') {
      if (now >= this.penaltyUntil) {
        this.initCurrentStage(now)
      }
      return
    }

    if (this.status === 'STAGE_COMPLETE' || this.isCompleted) return

    const stageId = this.getActiveStageId()

    if (stageId === 0) {
      if (this.status === 'WAITING' && now >= this.s1SignalTime) {
        this.status = 'ACTIVE'
        this.triggerTime = now
      }
    } else if (stageId === 1) {
      const elapsedLight = now - this.s2Data.lightStartTime
      this.s2Data.f1TotalLights = Math.min(5, Math.floor(elapsedLight / 800))
      if (this.status === 'WAITING' && now >= this.s2Data.signalTime) {
        this.status = 'ACTIVE'
        this.triggerTime = now
      }
    } else if (stageId === 2) {
      const d = this.s3Data
      if (!d.isMoving && now >= d.spawnDelay) {
        d.isMoving = true
      }
      if (d.isMoving) {
        d.x += d.dir * d.speed * dt
        const crossed = d.dir === 1 ? d.x >= STAGE_CENTER_X : d.x <= STAGE_CENTER_X
        if (this.status === 'WAITING' && crossed) {
          this.status = 'ACTIVE'
          this.triggerTime = now
        }
        const outOfScope = d.dir === 1 ? d.x > STAGE_CENTER_X + d.scopeR + d.radius : d.x < STAGE_CENTER_X - d.scopeR - d.radius
        if (outOfScope && this.status === 'ACTIVE') {
          this.triggerEarlyMistake(now)
        }
      }
    } else if (stageId === 3) {
      if (this.status === 'WAITING' && now >= this.s4Data.signalTime) {
        this.status = 'ACTIVE'
        this.triggerTime = now
      }
    } else if (stageId === 4) {
      const d = this.s5Data
      if (this.status === 'WAITING' && now >= d.nextColorTime) {
        if (Math.random() < 0.35) {
          d.isGreen = true
          d.currentColor = '#22c55e'
          this.status = 'ACTIVE'
          this.triggerTime = now
        } else {
          d.currentColor = d.nonGreenColors[Math.floor(rand(0, d.nonGreenColors.length))] || '#f43f5e'
          d.nextColorTime = now + rand(1000, 3000)
        }
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, now: number): void {
    if (this.status === 'PENALTY_FREEZE') {
      ctx.fillStyle = '#ef4444'
      ctx.font = 'bold 36px ui-monospace, monospace'
      ctx.textAlign = 'center'
      ctx.fillText('搶跑 / 提前點擊！', STAGE_CENTER_X, 280)
      ctx.font = '20px ui-monospace, monospace'
      ctx.fillStyle = '#fca5a5'
      ctx.fillText('階段重置中，請等待信號...', STAGE_CENTER_X, 330)
      return
    }

    if (this.status === 'STAGE_COMPLETE') {
      const stageId = this.getActiveStageId()
      ctx.textAlign = 'center'

      ctx.fillStyle = '#a1a1aa'
      ctx.font = '20px ui-monospace, monospace'
      ctx.fillText(`${this.STAGE_NAMES[stageId] ?? ''} 測定完成`, STAGE_CENTER_X, 180)

      ctx.fillStyle = '#a855f7'
      ctx.font = 'bold 56px ui-monospace, monospace'
      ctx.fillText(`${this.lastReactionMs} ms`, STAGE_CENTER_X, 260)

      const btn = this.nextBtn
      ctx.fillStyle = '#2563eb'
      ctx.fillRect(btn.x, btn.y, btn.w, btn.h)
      ctx.strokeStyle = '#60a5fa'
      ctx.lineWidth = 2
      ctx.strokeRect(btn.x, btn.y, btn.w, btn.h)

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 18px ui-monospace, monospace'
      const isLast = this.stepIndex === 4
      ctx.fillText(isLast ? '查看總評成績' : '下一關 (Next Level)', btn.x + btn.w / 2, btn.y + btn.h / 2 + 6)
      return
    }

    const stageId = this.getActiveStageId()

    // 绘制顶端微型进度指示
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.font = 'bold 14px ui-monospace, monospace'
    ctx.fillStyle = '#a855f7'
    ctx.fillText(`STAGE: [ ${this.stepIndex + 1} / 5 ] // ${this.STAGE_NAMES[stageId]}`, 16, 16)

    if (stageId === 0) {
      const isGreen = this.status === 'ACTIVE'
      ctx.fillStyle = isGreen ? '#22c55e' : '#ef4444'
      ctx.beginPath()
      ctx.arc(STAGE_CENTER_X, STAGE_CENTER_Y, 90, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#f4f4f5'
      ctx.font = '24px ui-monospace, monospace'
      ctx.textAlign = 'center'
      ctx.fillText(isGreen ? '立即點擊！' : '等待變綠...', STAGE_CENTER_X, 450)
    } else if (stageId === 1) {
      const lightsActive = this.status === 'ACTIVE'
      ctx.textAlign = 'center'
      ctx.font = '24px ui-monospace, monospace'
      ctx.fillStyle = '#f4f4f5'
      ctx.fillText(lightsActive ? '熄滅！點擊！' : '等待紅燈全熄滅...', STAGE_CENTER_X, 140)

      const startX = 200
      const gapX = 100
      const cy = STAGE_CENTER_Y
      const rowOffsetY = 40
      const lampRadius = 26

      for (let i = 0; i < 5; i++) {
        const cx = startX + i * gapX
        const isLit = !lightsActive && i < this.s2Data.f1TotalLights
        const lampColor = isLit ? '#ef4444' : '#27272a'

        for (const dy of [-rowOffsetY, rowOffsetY]) {
          ctx.beginPath()
          ctx.arc(cx, cy + dy, lampRadius, 0, Math.PI * 2)
          ctx.fillStyle = lampColor
          ctx.fill()
          ctx.lineWidth = 3
          ctx.strokeStyle = '#52525b'
          ctx.stroke()
        }
      }
    } else if (stageId === 2) {
      const cx = STAGE_CENTER_X
      const cy = STAGE_CENTER_Y
      const scopeR = this.s3Data.scopeR

      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, scopeR, 0, Math.PI * 2)
      ctx.clip()

      ctx.fillStyle = '#0f172a'
      ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT)

      if (this.s3Data.isMoving) {
        ctx.beginPath()
        ctx.arc(this.s3Data.x, this.s3Data.y, this.s3Data.radius, 0, Math.PI * 2)
        ctx.fillStyle = '#38bdf8'
        ctx.fill()
        ctx.lineWidth = 2
        ctx.strokeStyle = '#ffffff'
        ctx.stroke()
      }

      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(cx, cy - scopeR)
      ctx.lineTo(cx, cy + scopeR)
      ctx.moveTo(cx - scopeR, cy)
      ctx.lineTo(cx + scopeR, cy)
      ctx.stroke()
      ctx.restore()

      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, STAGE_WIDTH, STAGE_HEIGHT)
      ctx.arc(cx, cy, scopeR, 0, Math.PI * 2, true)
      ctx.fillStyle = '#050505'
      ctx.fill()

      ctx.beginPath()
      ctx.arc(cx, cy, scopeR, 0, Math.PI * 2)
      ctx.lineWidth = 6
      ctx.strokeStyle = '#27272a'
      ctx.stroke()
      ctx.restore()

      ctx.fillStyle = '#f4f4f5'
      ctx.font = '22px ui-monospace, monospace'
      ctx.textAlign = 'center'
      ctx.fillText('目標越過中線瞬間點擊！', cx, 60)
    } else if (stageId === 3) {
      for (let i = 0; i < this.s4Data.boxes.length; i++) {
        const b = this.s4Data.boxes[i]
        if (!b) continue
        const isTarget = this.status === 'ACTIVE' && i === this.s4Data.targetIndex

        ctx.fillStyle = isTarget ? '#facc15' : '#27272a'
        ctx.fillRect(b.x, b.y, this.s4Data.boxSize, this.s4Data.boxSize)
        ctx.strokeStyle = isTarget ? '#ffffff' : '#52525b'
        ctx.lineWidth = 2
        ctx.strokeRect(b.x, b.y, this.s4Data.boxSize, this.s4Data.boxSize)
      }

      ctx.fillStyle = '#f4f4f5'
      ctx.font = '22px ui-monospace, monospace'
      ctx.textAlign = 'center'
      ctx.fillText('全視野任意方塊變黃瞬間點擊！', STAGE_CENTER_X, 40)
    } else if (stageId === 4) {
      ctx.beginPath()
      ctx.arc(STAGE_CENTER_X, STAGE_CENTER_Y, 90, 0, Math.PI * 2)
      ctx.fillStyle = this.s5Data.currentColor
      ctx.fill()

      ctx.fillStyle = '#f4f4f5'
      ctx.font = '22px ui-monospace, monospace'
      ctx.textAlign = 'center'
      ctx.fillText(this.s5Data.isGreen ? '綠燈已出現！點擊！' : '只有變綠才准點！', STAGE_CENTER_X, 450)
    }
  }

  cleanup(): void {
    this.s4Data.boxes = []
    this.falseStarts = 0
    this.isCompleted = false
  }

  // ★★★ 核心修复：100% 由对局真实反应毫秒数与违规抢跑次数推导产出 ★★★
  getResultSummary(): ModuleResultSummary {
    const validTimes = this.stageTimes.filter(t => t > 0)
    const avgMs = validTimes.length > 0
      ? Math.round(validTimes.reduce((a, b) => a + b, 0) / validTimes.length)
      : 0
    const bestMs = validTimes.length > 0 ? Math.min(...validTimes) : 0

    const rating = (avgMs > 0 && avgMs <= 180 && this.falseStarts === 0)
      ? 'FLAWLESS ACE'
      : (avgMs > 0 && avgMs <= 240)
        ? 'COMBAT READY'
        : 'REFLEX COMPLIANT'

    return {
      rating,
      metrics: [
        { value: avgMs > 0 ? `${avgMs}ms` : '--', label: 'AVG REFLEX', badge: avgMs > 0 && avgMs <= 180 ? 'x2.00' : 'x1.20' },
        { value: bestMs > 0 ? `${bestMs}ms` : '--', label: 'PEAK TTK', badge: 'BEST' },
        { value: `${validTimes.length}/5`, label: 'STAGES ACED' },
        { value: String(this.falseStarts), label: 'FALSE STARTS' }
      ]
    }
  }
}