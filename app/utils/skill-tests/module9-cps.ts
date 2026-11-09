// app/utils/skill-tests/module9-cps.ts
import {
  STAGE_WIDTH,
  STAGE_CENTER_X,
  STAGE_CENTER_Y,
  type SkillModuleInstance,
  type SkillGameContext,
  type ModuleResultSummary,
  type Circle,
  type Rect
} from './types'

type CpsStatus = 'IDLE' | 'RUNNING' | 'STAGE_COMPLETE' | 'FINISHED'

interface StageConfig {
  name: string
  shortName: string
  allowedButtons: number[]
  instruction: string
}

interface StageResult {
  stageName: string
  clicks: number
  cps: number
  score: number
}

// 纯函数辅助：标准点在矩形内判定 (消除重复手搓)
function isInsideRect(x: number, y: number, r: Rect): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h
}

const STAGES: StageConfig[] = [
  {
    name: 'Stage 1: 單鍵點擊 (僅限左鍵)',
    shortName: 'Stage 1 (左鍵)',
    allowedButtons: [0],
    instruction: '在圓圈內按【左鍵】啟動測試並瘋狂連點！'
  },
  {
    name: 'Stage 2: 蝴蝶點 (左右雙鍵交替)',
    shortName: 'Stage 2 (雙鍵蝴蝶點)',
    allowedButtons: [0, 2],
    instruction: '在圓圈內【左右鍵交替】啟動測試並瘋狂連點！'
  }
]

export class Module9Cps implements SkillModuleInstance {
  readonly id = 9
  readonly title = 'Chrono Tap // 10s 爆發點擊基準'
  readonly durationMs = 0 // 阶段制，不受 60s 倒计时截断
  isCompleted = false

  private context!: SkillGameContext
  private stageIndex = 0
  private status: CpsStatus = 'IDLE'
  private validClicks = 0
  private startTime = 0
  private readonly stageDurationMs = 10000
  private stageResults: StageResult[] = []

  // 1. 图元与包围盒正规化 (由视口物理常量推导，消灭魔数)
  private readonly circle: Circle = {
    x: STAGE_CENTER_X,
    y: STAGE_CENTER_Y,
    r: 120
  }
  private readonly nextBtn: Rect = {
    x: (STAGE_WIDTH - 240) / 2, // 280 (自动居中)
    y: 390,
    w: 240,
    h: 54
  }
  private readonly finishBtn: Rect = {
    x: (STAGE_WIDTH - 240) / 2,
    y: 460,
    w: 240,
    h: 50
  }

  init(context: SkillGameContext): void {
    this.context = context
    this.stageResults = []
    this.isCompleted = false
    this.resetStage(0)
  }

  private resetStage(idx: number): void {
    this.stageIndex = idx
    this.status = 'IDLE'
    this.validClicks = 0
    this.startTime = 0
  }

  onPointerDown(mx: number, my: number, now: number, button = 0): void {
    // 1. 阶段完成过渡屏：点击 Next Stage 按钮
    if (this.status === 'STAGE_COMPLETE') {
      if (isInsideRect(mx, my, this.nextBtn)) {
        this.resetStage(1) // 切换至 Stage 2
      }
      return
    }

    // 2. 最终总结算大屏：点击查看总评按钮
    if (this.status === 'FINISHED') {
      if (isInsideRect(mx, my, this.finishBtn)) {
        this.isCompleted = true // 触发宿主结算弹窗
      }
      return
    }

    // 3. 几何包围盒判定 (必须在圆圈内)
    const distSq = (mx - this.circle.x) ** 2 + (my - this.circle.y) ** 2
    if (distSq > this.circle.r ** 2) return

    // 4. 按键掩码有效性检查
    const cfg = STAGES[this.stageIndex]
    if (!cfg || !cfg.allowedButtons.includes(button)) return

    // 5. 首击即启动 (Cold Start)
    if (this.status === 'IDLE') {
      this.status = 'RUNNING'
      this.startTime = now
      this.validClicks = 1
      this.context.addScore(50)
      return
    }

    // 6. 运行中累加连点
    if (this.status === 'RUNNING') {
      if (now - this.startTime < this.stageDurationMs) {
        this.validClicks++
        this.context.addScore(50)
      }
    }
  }

  private concludeCurrentStage(): void {
    const cps = Number((this.validClicks / 10).toFixed(2))
    const score = this.validClicks * 50

    const currentCfg = STAGES[this.stageIndex]
    this.stageResults.push({
      stageName: currentCfg?.shortName ?? `Stage ${this.stageIndex + 1}`,
      clicks: this.validClicks,
      cps,
      score
    })

    if (this.stageIndex === 0) {
      this.status = 'STAGE_COMPLETE'
    } else {
      this.status = 'FINISHED'
    }
  }

  update(dt: number, now: number, elapsed: number): void {
    if (this.status !== 'RUNNING') return

    const stageElapsed = now - this.startTime
    if (stageElapsed >= this.stageDurationMs) {
      this.concludeCurrentStage()
    }
  }

  render(ctx: CanvasRenderingContext2D, now: number, elapsed: number = 0): void {
    // ==========================================
    // 视图 A：Stage 1 过渡结算卡片
    // ==========================================
    if (this.status === 'STAGE_COMPLETE') {
      const res = this.stageResults[0]
      if (!res) return

      ctx.textAlign = 'center'
      ctx.fillStyle = '#a1a1aa'
      ctx.font = '20px ui-monospace, monospace'
      ctx.fillText(`${res.stageName} 測定完成`, STAGE_CENTER_X, 170)

      ctx.fillStyle = '#4ade80'
      ctx.font = 'bold 54px ui-monospace, monospace'
      ctx.fillText(`${res.cps} CPS`, STAGE_CENTER_X, 250)

      ctx.fillStyle = '#e4e4e7'
      ctx.font = '18px ui-monospace, monospace'
      ctx.fillText(`有效點擊: ${res.clicks} 次 | 本段戰術分: ${res.score} PTS`, STAGE_CENTER_X, 310)

      const btn = this.nextBtn
      ctx.fillStyle = '#2563eb'
      ctx.fillRect(btn.x, btn.y, btn.w, btn.h)
      ctx.strokeStyle = '#60a5fa'
      ctx.lineWidth = 2
      ctx.strokeRect(btn.x, btn.y, btn.w, btn.h)

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 18px ui-monospace, monospace'
      ctx.fillText('進入蝴蝶點測試 (Stage 2) →', btn.x + btn.w / 2, btn.y + btn.h / 2 + 6)
      return
    }

    // ==========================================
    // 视图 B：Stage 2 终局结算汇总大屏
    // ==========================================
    if (this.status === 'FINISHED') {
      ctx.textAlign = 'center'
      ctx.fillStyle = '#f4f4f5'
      ctx.font = '28px ui-monospace, monospace'
      ctx.fillText('CHRONO TAP // 爆發點擊基準完成', STAGE_CENTER_X, 90)

      const totalScore = this.stageResults.reduce((sum, r) => sum + r.score, 0)
      ctx.font = 'bold 26px ui-monospace, monospace'
      ctx.fillStyle = '#4ade80'
      ctx.fillText(`總獲得積分: ${totalScore} PTS`, STAGE_CENTER_X, 140)

      ctx.textAlign = 'left'
      const startY = 210
      for (let i = 0; i < this.stageResults.length; i++) {
        const r = this.stageResults[i]
        if (!r) continue
        const y = startY + i * 75

        ctx.fillStyle = '#facc15'
        ctx.font = 'bold 18px ui-monospace, monospace'
        ctx.fillText(r.stageName, 180, y)

        ctx.font = '16px ui-monospace, monospace'
        ctx.fillStyle = '#e4e4e7'
        ctx.fillText(`有效點擊: ${r.clicks} 次`, 180, y + 26)
        ctx.fillText(`速度: ${r.cps} CPS`, 380, y + 26)

        ctx.fillStyle = '#38bdf8'
        ctx.fillText(`+${r.score} 分`, 560, y + 26)
      }

      // 确认关闭按钮
      const btn = this.finishBtn
      ctx.fillStyle = '#059669'
      ctx.fillRect(btn.x, btn.y, btn.w, btn.h)
      ctx.strokeStyle = '#34d399'
      ctx.lineWidth = 2
      ctx.strokeRect(btn.x, btn.y, btn.w, btn.h)

      ctx.textAlign = 'center'
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 16px ui-monospace, monospace'
      ctx.fillText('結算總評成績 // SUBMIT', btn.x + btn.w / 2, btn.y + btn.h / 2 + 6)
      return
    }

    // ==========================================
    // 视图 C：正常测试运行画面 (IDLE / RUNNING)
    // ==========================================
    const c = this.circle
    const cfg = STAGES[this.stageIndex]
    if (!cfg) return
    const isRunning = this.status === 'RUNNING'

    // 绘制点击大圆
    ctx.beginPath()
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2)
    ctx.fillStyle = isRunning ? 'rgba(56, 189, 248, 0.12)' : 'rgba(39, 39, 42, 0.6)'
    ctx.fill()
    ctx.lineWidth = isRunning ? 4 : 2.5
    ctx.strokeStyle = isRunning ? '#38bdf8' : '#71717a'
    ctx.stroke()

    // 圆心数字 / 提示
    ctx.textAlign = 'center'
    if (isRunning) {
      ctx.fillStyle = '#38bdf8'
      ctx.font = 'bold 64px ui-monospace, monospace'
      ctx.fillText(String(this.validClicks), c.x, c.y + 22)

      const leftSec = Math.max(0, (this.stageDurationMs - (now - this.startTime)) / 1000).toFixed(1)
      ctx.font = 'bold 16px ui-monospace, monospace'
      ctx.fillStyle = '#facc15'
      ctx.fillText(`REMAINING: ${leftSec}s`, c.x, c.y + 70)
    } else {
      ctx.fillStyle = '#f4f4f5'
      ctx.font = 'bold 26px ui-monospace, monospace'
      ctx.fillText('首擊啟動', c.x, c.y - 12)
      ctx.font = '16px ui-monospace, monospace'
      ctx.fillStyle = '#a1a1aa'
      ctx.fillText('CLICK TO ENGAGE', c.x, c.y + 24)
    }

    // 顶部战术指引
    ctx.fillStyle = '#facc15'
    ctx.font = '20px ui-monospace, monospace'
    ctx.fillText(cfg.name, STAGE_CENTER_X, 70)

    ctx.fillStyle = '#e4e4e7'
    ctx.font = '15px ui-monospace, monospace'
    ctx.fillText(cfg.instruction, STAGE_CENTER_X, 105)
  }

  // ★ 核心修复：彻底清空所有状态机变量，拒绝脏内存污染！
  cleanup(): void {
    this.stageResults = []
    this.stageIndex = 0
    this.validClicks = 0
    this.startTime = 0
    this.status = 'IDLE'
    this.isCompleted = false
  }

  // ★★★ 核心修复：100% 由对局双阶段真实 CPS 严密派生 ★★★
  getResultSummary(): ModuleResultSummary {
    const s1 = this.stageResults[0]
    const s2 = this.stageResults[1]
    const peakCps = Math.max(s1?.cps ?? 0, s2?.cps ?? 0)
    const totalClicks = (s1?.clicks ?? 0) + (s2?.clicks ?? 0)

    const rating = peakCps >= 15
      ? 'FLAWLESS ACE'
      : peakCps >= 10
        ? 'BURST CADENCE'
        : 'STANDARD CADENCE'

    return {
      rating,
      metrics: [
        { value: `${s1?.cps ?? 0}`, label: 'STAGE 1 CPS', badge: (s1?.cps ?? 0) >= 10 ? 'SINGLE' : undefined },
        { value: `${s2?.cps ?? 0}`, label: 'STAGE 2 CPS', badge: (s2?.cps ?? 0) >= 14 ? 'BUTTERFLY' : undefined },
        { value: `${peakCps}`, label: 'PEAK CPS', badge: peakCps >= 15 ? 'x2.00' : 'PEAK' },
        { value: String(totalClicks), label: 'TOTAL CLICKS' }
      ]
    }
  }
}