// app/utils/skill-tests/module9-cps.ts
import type { SkillModuleInstance, SkillGameContext, ModuleResultSummary } from './types'

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
  id = 9
  title = 'Chrono Tap // 10s 爆發點擊基準'
  readonly durationMs = 0 // 阶段制，不受 60s 倒计时强行截断
  isCompleted = false

  private context!: SkillGameContext
  private stageIndex = 0
  private status: CpsStatus = 'IDLE'
  private validClicks = 0
  private startTime = 0
  private readonly stageDurationMs = 10000
  private stageResults: StageResult[] = []

  private readonly circle = { x: 400, y: 300, r: 120 }
  private readonly nextBtn = { x: 280, y: 390, w: 240, h: 54 }
  private readonly finishBtn = { x: 280, y: 460, w: 240, h: 50 }

  init(context: SkillGameContext) {
    this.context = context
    this.stageResults = []
    this.isCompleted = false
    this.resetStage(0)
  }

  private resetStage(idx: number) {
    this.stageIndex = idx
    this.status = 'IDLE'
    this.validClicks = 0
    this.startTime = 0
  }

  onPointerDown(mx: number, my: number, now: number, button = 0) {
    // 1. 阶段完成过渡屏：点击 Next Stage 按钮
    if (this.status === 'STAGE_COMPLETE') {
      const btn = this.nextBtn
      if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
        this.resetStage(1) // 切换至 Stage 2
      }
      return
    }

    // 2. 最终总结算大屏：点击查看总评按钮
    if (this.status === 'FINISHED') {
      const btn = this.finishBtn
      if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
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
      // ★ 核心好品味：不传 x, y，消除飘字粒子压力，纯粹累加顶栏分数
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

  private concludeCurrentStage() {
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

  update(dt: number, now: number, elapsed: number) {
    if (this.status !== 'RUNNING') return

    const stageElapsed = now - this.startTime
    if (stageElapsed >= this.stageDurationMs) {
      this.concludeCurrentStage()
    }
  }

  render(ctx: CanvasRenderingContext2D, now: number, elapsed: number = 0) {
    // ==========================================
    // 视图 A：Stage 1 过渡结算卡片
    // ==========================================
    if (this.status === 'STAGE_COMPLETE') {
      const res = this.stageResults[0]
      if (!res) return

      ctx.textAlign = 'center'
      ctx.fillStyle = '#a1a1aa'
      ctx.font = '20px ui-monospace, monospace'
      ctx.fillText(`${res.stageName} 測定完成`, 400, 170)

      ctx.fillStyle = '#4ade80'
      ctx.font = 'bold 54px ui-monospace, monospace'
      ctx.fillText(`${res.cps} CPS`, 400, 250)

      ctx.fillStyle = '#e4e4e7'
      ctx.font = '18px ui-monospace, monospace'
      ctx.fillText(`有效點擊: ${res.clicks} 次 | 本段戰術分: ${res.score} PTS`, 400, 310)

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
      ctx.fillText('CHRONO TAP // 爆發點擊基準完成', 400, 90)

      const totalScore = this.stageResults.reduce((sum, r) => sum + r.score, 0)
      ctx.font = 'bold 26px ui-monospace, monospace'
      ctx.fillStyle = '#4ade80'
      ctx.fillText(`總獲得積分: ${totalScore} PTS`, 400, 140)

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

      // 绘制当前阶段微型倒计时
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
    ctx.fillText(cfg.name, 400, 70)

    ctx.fillStyle = '#e4e4e7'
    ctx.font = '15px ui-monospace, monospace'
    ctx.fillText(cfg.instruction, 400, 105)
  }

  getResultSummary(): ModuleResultSummary {
    const s1 = this.stageResults[0]
    const s2 = this.stageResults[1]
    const peakCps = Math.max(s1?.cps ?? 0, s2?.cps ?? 0)

    return {
      rating: peakCps >= 14 ? 'FLAWLESS ACE' : 'BURST CADENCE',
      metrics: [
        { value: `${s1?.cps ?? 0}`, label: 'STAGE 1 CPS', badge: 'SINGLE' },
        { value: `${s2?.cps ?? 0}`, label: 'STAGE 2 CPS', badge: 'BUTTERFLY' },
        { value: `${peakCps}`, label: 'PEAK CPS', badge: 'x1.50' },
        { value: `${(s1?.clicks ?? 0) + (s2?.clicks ?? 0)}`, label: 'TOTAL CLICKS' }
      ]
    }
  }

  cleanup() {
    this.stageResults = []
    this.isCompleted = false
  }
}