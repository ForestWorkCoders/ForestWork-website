<!-- app/pages/activities/skill-test.vue -->
<script setup lang="ts">
import { DiscordSDK } from '@discord/embedded-app-sdk'
import type { SkillModuleInstance, FloatingText, ModuleResultSummary } from '~/utils/skill-tests/types'
import { Module1Precision } from '~/utils/skill-tests/module1-precision'
import { Module2Dual } from '~/utils/skill-tests/module2-dual'
import { Module3Trail } from '~/utils/skill-tests/module3-trail'
import { Module4OddPair } from '~/utils/skill-tests/module4-oddpair'
import { Module5Reaction } from '~/utils/skill-tests/module5-reaction'
import { Module6Tracking } from '~/utils/skill-tests/module6-tracking'
import { Module9Cps } from '~/utils/skill-tests/module9-cps'

definePageMeta({
  layout: false,
  middleware: [
    (to) => {
      if (import.meta.dev || to.query.debug === '114514') return
      const hasFrameId = typeof to.query.frame_id === 'string' && to.query.frame_id.length > 0
      const isDiscordHost = import.meta.client && window.location.hostname.includes('discordsays.com')
      if (!hasFrameId && !isDiscordHost) {
        throw createError({ statusCode: 404, statusMessage: 'Page Not Found', fatal: true })
      }
    }
  ]
})


const currentDiscordId = ref<string>('10001')
const currentOperatorDisplay = ref<string>('CONNECTING...')

async function initDiscordSdkAsync() {
  try {
    const rawClientId = (useRuntimeConfig().public as Record<string, unknown>).discordClientId
    const clientId = typeof rawClientId === 'string' && rawClientId.trim().length > 0
      ? rawClientId.trim()
      : '311484597248720907'

    // ★★★ 核心加固：物理同步 frame_id，彻底封杀 'frame_id query param is not defined' ★★★
    if (import.meta.client) {
      const searchParams = new URLSearchParams(window.location.search)
      const route = useRoute()

      // 如果 window.location.search 丢失，但 Vue Router 的 route.query 里有 frame_id：
      if (!searchParams.has('frame_id') && route.query.frame_id) {
        const restoredUrl = new URL(window.location.href)
        for (const [k, v] of Object.entries(route.query)) {
          if (typeof v === 'string') restoredUrl.searchParams.set(k, v)
        }
        // 瞬间同步回浏览器原生地址栏，满足 DiscordSDK 构造函数的物理预期！
        window.history.replaceState(null, '', restoredUrl.toString())
      }

      // 如果两者全都没有，说明这根本不是 Discord 客户端环境（例如独立浏览器直接打开）
      const finalSearchParams = new URLSearchParams(window.location.search)
      if (!finalSearchParams.has('frame_id') && !window.location.hostname.includes('discordsays.com')) {
        throw new Error('ENV_STANDALONE: Non-Discord environment')
      }
    }

    // 此时 window.location.search 中 100% 存在 frame_id，构造函数安全通过！
    const discordSdk = new DiscordSDK(clientId)

    // 后续握手与静默授权保持不变...
    await Promise.race([
      discordSdk.ready(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('SDK_TIMEOUT: Discord ready() took > 8s')), 8000))
    ])

    const { code } = await discordSdk.commands.authorize({
      client_id: clientId,
      response_type: 'code',
      state: '',
      prompt: 'none',
      scope: ['identify']
    })

    if (!code) throw new Error('AUTH_EMPTY: Discord did not return code')

    const authRes = await $fetch<{
      success: boolean
      user: { id: string; username: string; global_name: string; avatar: string }
    }>('/api/activities/auth', {
      method: 'POST',
      body: { code }
    })

    if (authRes.success && authRes.user) {
      currentDiscordId.value = authRes.user.id
      currentOperatorDisplay.value = authRes.user.global_name || authRes.user.username
      console.log(`[Activity Auth] 選手就位: ${currentOperatorDisplay.value} (${authRes.user.id})`)
      fetchLeaderboardAndPbs(currentSlot.value.moduleId ?? 1)
    }
  } catch (err: any) {
    const errMsg = err?.data?.statusMessage || err?.message || 'UNKNOWN_ERROR'
    console.error('[Activity Auth Error]:', err)

    currentDiscordId.value = '10001'
    currentOperatorDisplay.value = `SANDBOX (${errMsg})`
  }
}

// 真实天梯榜单数据 (替换死板的 MOCK_LEADERBOARD)
interface ApiLeaderboardItem {
  global_rank: number
  discord_id: string
  operator_name: string
  avatar_url: string
  score: number
  rating: string
  created_at: string
}

const liveLeaderboard = ref<ApiLeaderboardItem[]>([])
const isLeaderboardLoading = ref(false)

async function fetchLeaderboardAndPbs(targetModuleId: number) {
  isLeaderboardLoading.value = true
  try {
    const res = await $fetch<{
      success: boolean
      leaderboard: ApiLeaderboardItem[]
      personalBests: Record<number, number>
    }>('/api/activities/leaderboard', {
      params: {
        moduleId: targetModuleId,
        discordId: currentDiscordId.value
      }
    })

    if (res.success) {
      liveLeaderboard.value = res.leaderboard

      // 动态水合大厅 10 个槽位的真实 PB 分数
      for (const slot of TRIAL_SLOTS.value) {
        if (slot.moduleId && res.personalBests[slot.moduleId] !== undefined) {
          slot.bestScore = Number(res.personalBests[slot.moduleId]).toLocaleString()
        }
      }
    }
  } catch (err) {
    console.warn('[Leaderboard] 真实数据拉取降级:', err)
  } finally {
    isLeaderboardLoading.value = false
  }
}

// ==========================================
// 1. 核心视图状态机 (三态单一事实源)
// ==========================================
const viewMode = ref<'hub' | 'briefing' | 'playing'>('hub')

interface TrialSlot {
  id: number
  index: string
  title: string
  code: string
  category: string
  status: 'ready' | 'locked'
  moduleId?: number
  bestScore: number | string
  accentColor: string
}

const settlementTab = ref<'summary' | 'ranking'>('summary')

const activeSummary = computed<ModuleResultSummary>(() => {
  if (activeModule.getResultSummary) {
    return activeModule.getResultSummary()
  }

  return {
    rating: score.value >= 12000 ? 'FLAWLESS ACE' : score.value >= 8000 ? 'COMBAT READY' : 'STANDARD CADENCE',
    metrics: [
      { value: '100%', label: 'ACCURACY', badge: 'x2.00' },
      { value: `${(remainingTime.value).toFixed(1)}s`, label: 'PACE' },
      { value: `${score.value}`, label: 'SCORE' },
      { value: '0', label: 'PENALTIES' }
    ]
  }
})

// 分享/复制战绩动作
function shareScore() {
  const text = `[ForestWork // Skill Sandbox]\nOperator Score: ${score.value.toLocaleString()} PTS in ${currentSlot.value.title}!\nCombat Rating: ${activeSummary.value.rating}`
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text)
    alert('戰報已成功複製至剪貼板！')
  }
}

const TRIAL_SLOTS = ref<TrialSlot[]>([
  { id: 1, index: '01', title: 'PRECISION', code: 'MOD_AIM_01', category: 'TARGET ACQUISITION', status: 'ready', moduleId: 1, bestScore: '---', accentColor: '#10B981' },
  { id: 2, index: '02', title: 'DUAL AXIS', code: 'MOD_CTRL_02', category: 'MOTOR COORDINATION', status: 'ready', moduleId: 2, bestScore: '---', accentColor: '#38BDF8' },
  { id: 3, index: '03', title: 'TRAIL LINK', code: 'MOD_SCAN_03', category: 'COGNITIVE SEQUENCE', status: 'ready', moduleId: 3, bestScore: '---', accentColor: '#FACC15' },
  { id: 4, index: '04', title: 'ODD PAIR', code: 'MOD_PERC_04', category: 'ANOMALY DETECTION', status: 'ready', moduleId: 4, bestScore: '---', accentColor: '#F43F5E' },
  { id: 5, index: '05', title: 'REACTION', code: 'MOD_REACT_05', category: 'REFLEX KINETICS', status: 'ready', moduleId: 5, bestScore: '---', accentColor: '#A855F7' },
  { id: 6, index: '06', title: 'APEX TRACK', code: 'MOD_TRACK_06', category: 'DYNAMIC PURSUIT', status: 'ready', moduleId: 6, bestScore: '---', accentColor: '#EC4899' },
  { id: 7, index: '07', title: 'BUFFER FLUSH', code: 'SYS_LOCK_07', category: 'MEMORY CAPACITY', status: 'locked', bestScore: '---', accentColor: '#52525B' },
  { id: 8, index: '08', title: 'RAPID STRAFE', code: 'SYS_LOCK_08', category: 'SPATIAL AGILITY', status: 'locked', bestScore: '---', accentColor: '#52525B' },
  { id: 9, index: '09', title: 'CHRONO TAP', code: 'MOD_CPS_09', category: 'TEMPORAL CADENCE', status: 'ready', moduleId: 9, bestScore: '---', accentColor: '#06B6D4' },
  { id: 10, index: '10', title: 'OVERCLOCK', code: 'SYS_LOCK_10', category: 'LIMITER BREAKTHROUGH', status: 'locked', bestScore: '---', accentColor: '#52525B' }
])

// ==========================================
// 2. 三列战术简报数据契约 (VALORANT 3-COLUMNS BRIEFING)
// ==========================================
interface BriefingStep {
  tag: string
  title: string
  icon: string
  headline: string
  description: string
}

interface ModuleBriefing {
  overview: string
  columns: [BriefingStep, BriefingStep, BriefingStep]
}

const MODULE_BRIEFINGS: Record<number, ModuleBriefing> = {
  1: {
    overview: '測試操作員在極限時間內的視線捕捉與像素級單點定位能力。',
    columns: [
      { tag: 'PHASE 01', title: 'WATCH THE TARGET', icon: '🎯', headline: '鎖定擴散圓心', description: '紅色目標圓圈將以二次方頻率隨機生成，半徑將隨時間推移持續膨脹。' },
      { tag: 'PHASE 02', title: 'TAKE THE SHOT', icon: '⚡', headline: '首選高速點擊', description: '在圓圈自然淘汰前精準單擊命中。越早擊破得分越高，空擊將嚴厲懲罰 -50 分。' },
      { tag: 'PHASE 03', title: 'BEAT THE CLOCK', icon: '⏱️', headline: '60 秒極限衝分', description: '限時 60.0 秒。消滅所有漏點目標，爭取突破 12,000+ 選手級戰術標尺。' }
    ]
  },
  2: {
    overview: '測試操作員左右腦獨立處理多維物理軌跡與雙軸規避的協調能力。',
    columns: [
      { tag: 'PHASE 01', title: 'SECTOR SPLIT', icon: '◫', headline: '注意動態中線', description: '中央虛線將隨戰況由 400px 向左側推移至 200px，大幅壓縮左側安全縱深。' },
      { tag: 'PHASE 02', title: 'DUAL AXIS CTRL', icon: '🎮', headline: '雙軸獨立推進', description: '左手使用 [A / D] 橫向規避縱落方塊；右手使用 [↑ / ↓] 縱向規避橫掃障礙。' },
      { tag: 'PHASE 03', title: 'SURVIVE & GAIN', icon: '🛡️', headline: '出界獲取戰術分', description: '障礙物成功出界每枚 +25 分；若遭碰撞將扣除 50 分並提供 2000ms 無敵閃爍。' }
    ]
  },
  3: {
    overview: '測試操作員在動態雜湊盤面中的視覺搜索寬度與數字序列反應。',
    columns: [
      { tag: 'PHASE 01', title: 'SCAN SEQUENCE', icon: '🔍', headline: '全局識別數字', description: '盤面上將隨機散布亂序數字圓圈，當前首要目標將以高亮亮藍色外環標註。' },
      { tag: 'PHASE 02', title: 'ASCENDING TAP', icon: '🔢', headline: '嚴格按序點擊', description: '必須嚴格按照 1, 2, 3, 4... 升序點選。點錯次序或點空皆會被扣除 50 分。' },
      { tag: 'PHASE 03', title: 'CLEAR THE BOARD', icon: '⚡', headline: '清盤即刻刷新', description: '每命中一次目標遞增，徹底清空棋盤將立刻觸發下一波補給連擊。' }
    ]
  },
  4: {
    overview: '測試操作員在大量成對幾何特徵干擾下的認知抑制與落單辨識。',
    columns: [
      { tag: 'PHASE 01', title: 'TRAIT MATRIX', icon: '🧩', headline: '觀察正交特徵', description: '棋盤將動態解鎖圓、方、三角、菱形等多種幾何形狀與高飽和度色彩對比。' },
      { tag: 'PHASE 02', title: 'FIND THE ODD', icon: '👁️', headline: '揪出唯一異類', description: '所有干擾形狀皆兩兩成對出現，唯獨 1 枚落單目標，迅速定位並點擊它。' },
      { tag: 'PHASE 03', title: 'LEVEL ESCALATE', icon: '🏆', headline: '闖關階梯攀升', description: '每次命中 +100 分並進入下一關，20 關後解鎖內外雙重特徵嵌套！' }
    ]
  },
  5: {
    overview: '融合紅綠燈、F1雙排起步燈、狙擊架點等 5 大賽事生理反應時基准。',
    columns: [
      { tag: 'PHASE 01', title: 'READ SIGNALS', icon: '🚦', headline: '經歷 5 大階段', description: '隨機打亂並經歷 5 種截然不同的視覺突變（起步燈、架點橫穿、視野色變）。' },
      { tag: 'PHASE 02', title: 'REFLEX TRIGGER', icon: '⚡', headline: '信號觸發瞬間點擊', description: '只有在信號給出（綠燈/全熄滅/過線）瞬間按下左鍵，嚴禁任何提前搶跑！' },
      { tag: 'PHASE 03', title: 'NO TIME LIMIT', icon: '⏱️', headline: '純毫秒精準判定', description: '解除 60s 倒計時，每毫秒皆算分；搶跑罰 -250 分，5 關打完後提交總評。' }
    ]
  },
  6: {
    overview: '考驗鼠標準星對多維平滑加速目標的連續物理吸附率。',
    columns: [
      { tag: 'PHASE 01', title: 'VECTOR TRACE', icon: '📈', headline: '前 30 秒參考導引', description: '前 30 秒將繪製目標隨機航向虛線，輔助操作員掌握目標插值運動規律。' },
      { tag: 'PHASE 02', title: 'HOLD ON TARGET', icon: '🎯', headline: '準星深度鎖定', description: '將鼠標指針死死吸附在圓圈中心，30 秒後虛線自動隱形，進入盲跟態！' },
      { tag: 'PHASE 03', title: '60HZ ACCUMULATE', icon: '⚙️', headline: '幀級連續算分', description: '每鎖定 1 幀（16.6ms）累加 4 分，對局結束後生成高精度平滑跟槍命中率。' }
    ]
  },
  9: {
    overview: '專為選手設計的 10 秒短時神經衝動與左右雙鍵極限 CPS 爆發測試。',
    columns: [
      { tag: 'PHASE 01', title: 'TWO ROUNDS', icon: '⚔️', headline: '單鍵與蝴蝶點', description: '包含 Stage 1 左鍵單擊 10 秒，以及 Stage 2 左右雙鍵蝴蝶點連擊 10 秒。' },
      { tag: 'PHASE 02', title: 'BURST CADENCE', icon: '🖱️', headline: '圓內冷啟動連點', description: '在圓圈內按下首擊瞬間啟動 10.0s 倒計時，右鍵選單已由系統硬件級屏蔽。' },
      { tag: 'PHASE 03', title: 'MAX CPS SCORE', icon: '🔥', headline: '挑戰峰值頻率', description: '純粹依據點擊總數給分，打完兩關後解鎖個人點擊速率（CPS）總評。' }
    ]
  }
}

// 默认兜底简报
const DEFAULT_BRIEFING: ModuleBriefing = {
  overview: '機密戰術模塊整備中，請按照前線指引完成該科目評定。',
  columns: [
    { tag: 'PHASE 01', title: 'OBSERVE SCENARIO', icon: '📋', headline: '審視戰術現場', description: '進入測驗靶場後，迅速辨析環境中的動態目標與障礙邊界。' },
    { tag: 'PHASE 02', title: 'EXECUTE TACTICS', icon: '⚡', headline: '實施精準打擊', description: '遵循操作指南使用鼠標或鍵盤實施最高效率的戰術交互。' },
    { tag: 'PHASE 03', title: 'MISSION COMPLETE', icon: '🎯', headline: '達成評定指標', description: '在規定限度內最大化戰術積分，刷新天梯個人歷史最佳戰績。' }
  ]
}

const currentSlot = ref<TrialSlot>(TRIAL_SLOTS.value[0]!)
const currentBriefing = computed<ModuleBriefing>(() => {
  return MODULE_BRIEFINGS[currentSlot.value.moduleId ?? 1] ?? DEFAULT_BRIEFING
})

// ==========================================
// 3. 游戏引擎与运行时
// ==========================================
const canvasRef = ref<HTMLCanvasElement | null>(null)
const score = ref(0)
const remainingTime = ref(60.0)
const isFinished = ref(false)
const isScoreboardOpen = ref(false)
const scoreboardSlot = ref<TrialSlot>(TRIAL_SLOTS.value[0]!)

const defaultModule = new Module1Precision()
const modules: Record<number, SkillModuleInstance> = {
  1: defaultModule,
  2: new Module2Dual(),
  3: new Module3Trail(),
  4: new Module4OddPair(),
  5: new Module5Reaction(),
  6: new Module6Tracking(),
  9: new Module9Cps()
}

let activeModule: SkillModuleInstance = defaultModule
let animationFrameId: number
let startTime = 0
let lastTime = 0
const floatingTexts: FloatingText[] = []

function addScore(delta: number, x?: number, y?: number, color = '#10b981') {
  score.value += delta
  if (x !== undefined && y !== undefined) {
    floatingTexts.push({
      x,
      y,
      text: delta > 0 ? `+${delta}` : `${delta}`,
      color,
      startTime: performance.now(),
      duration: 750
    })
  }
}

function handlePointerDown(e: MouseEvent) {
  if (!canvasRef.value || isFinished.value) return
  const rect = canvasRef.value.getBoundingClientRect()
  activeModule.onPointerDown?.(
    (e.clientX - rect.left) * (800 / rect.width),
    (e.clientY - rect.top) * (600 / rect.height),
    performance.now(),
    e.button
  )
}

function handlePointerMove(e: MouseEvent) {
  if (!canvasRef.value || isFinished.value) return
  const rect = canvasRef.value.getBoundingClientRect()
  activeModule.onPointerMove?.(
    (e.clientX - rect.left) * (800 / rect.width),
    (e.clientY - rect.top) * (600 / rect.height)
  )
}

function handlePointerLeave() {
  activeModule.onPointerLeave?.()
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.code === 'Escape') {
    if (isScoreboardOpen.value) {
      closeScoreboard()
      return
    }
    if (viewMode.value === 'briefing') {
      viewMode.value = 'hub'
      return
    }
    if (viewMode.value === 'playing') {
      exitToHub()
      return
    }
  }

  if (viewMode.value === 'playing' && !isScoreboardOpen.value) {
    activeModule.onKeyDown?.(e.code, e)
  }
}

function handleKeyUp(e: KeyboardEvent) {
  if (viewMode.value === 'playing' && !isScoreboardOpen.value) {
    activeModule.onKeyUp?.(e.code, e)
  }
}

function tick(now: number) {
  const dt = Math.min((now - lastTime) / 1000, 0.1)
  lastTime = now
  const elapsed = now - startTime

  const moduleDuration = activeModule.durationMs ?? 60000
  const hasTimeLimit = moduleDuration > 0

  if (hasTimeLimit) {
    const left = Math.max(0, moduleDuration - elapsed)
    remainingTime.value = Number((left / 1000).toFixed(1))
  } else {
    remainingTime.value = Number((elapsed / 1000).toFixed(1))
  }

  if ((hasTimeLimit && elapsed >= moduleDuration) || activeModule.isCompleted) {
    isFinished.value = true
    if (currentSlot.value.moduleId) {
      $fetch('/api/activities/submit', {
        method: 'POST',
        body: {
          discordId: currentDiscordId.value,
          moduleId: currentSlot.value.moduleId,
          score: score.value,
          rating: activeSummary.value.rating,
          metrics: activeSummary.value.metrics
        }
      }).then(() => {
        // 提交成功后立刻重新拉取天梯与最新 PB
        fetchLeaderboardAndPbs(currentSlot.value.moduleId!)
      }).catch((err) => {
        console.error('[Submit] 成绩写入失败:', err)
      })
    }
    return
  }

  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  activeModule.update(dt, now, elapsed)
  ctx.clearRect(0, 0, 800, 600)
  activeModule.render(ctx, now, elapsed)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = 'bold 20px ui-monospace, monospace'

  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i]
    if (!ft) continue
    const p = (now - ft.startTime) / ft.duration
    if (p >= 1) {
      floatingTexts.splice(i, 1)
      continue
    }
    ctx.save()
    ctx.globalAlpha = Math.max(0, 1 - p)
    ctx.fillStyle = ft.color
    ctx.fillText(ft.text, ft.x, ft.y - p * 30)
    ctx.restore()
  }

  animationFrameId = requestAnimationFrame(tick)
}

// 步骤 1：大厅点击卡片 ➔ 切入三列战术简报
function openBriefing(slot: TrialSlot) {
  if (slot.status === 'locked' || !slot.moduleId) return
  currentSlot.value = slot
  viewMode.value = 'briefing'
}

// 步骤 2：在简报页点击 DEPLOY ➔ 正式拉起游戏靶场
function launchSlot(slot: TrialSlot) {
  if (slot.status === 'locked' || !slot.moduleId) return

  currentSlot.value = slot
  viewMode.value = 'playing'

  nextTick(() => {
    if (!canvasRef.value) return
    const targetModule = modules[slot.moduleId!]
    if (!targetModule) return

    activeModule.cleanup?.()
    activeModule = targetModule

    score.value = 0
    floatingTexts.length = 0
    isFinished.value = false
    startTime = performance.now()
    lastTime = startTime

    activeModule.init({
      canvas: canvasRef.value,
      ctx: canvasRef.value.getContext('2d')!,
      addScore
    })

    cancelAnimationFrame(animationFrameId)
    animationFrameId = requestAnimationFrame(tick)
  })
}

function activateModule(targetId: number) {
  const slot = TRIAL_SLOTS.value.find(s => s.id === targetId && s.status === 'ready')
  if (slot) {
    openBriefing(slot)
    return true
  }
  return false
}

function exitToHub() {
  cancelAnimationFrame(animationFrameId)
  activeModule.cleanup?.()
  viewMode.value = 'hub'
}

function openScoreboard(slot?: TrialSlot) {
  scoreboardSlot.value = slot || currentSlot.value
  isScoreboardOpen.value = true

  // ★ 核心修复：点击打开哪一科目的排行榜，就立刻向后端拉取该科目的天梯数据！
  if (scoreboardSlot.value.moduleId) {
    fetchLeaderboardAndPbs(scoreboardSlot.value.moduleId)
  }
}

function closeScoreboard() {
  isScoreboardOpen.value = false
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)

  const route = useRoute()
  const rawQuery = route.query.module ?? route.query.m ?? route.query.slot
  const queryMod = Number(rawQuery)
  if (Number.isFinite(queryMod) && queryMod > 0) {
    activateModule(queryMod)
  }

  fetchLeaderboardAndPbs(1)
  initDiscordSdkAsync()
})

onUnmounted(() => {
  cancelAnimationFrame(animationFrameId)
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  activeModule.cleanup?.()
})
</script>

<template>
  <div
    class="h-screen w-screen bg-[#090a0f] text-zinc-100 flex flex-col justify-start overflow-hidden select-none font-sans relative">
    <div
      class="absolute inset-0 bg-[linear-gradient(to_right,#18181b15_1px,transparent_1px),linear-gradient(to_bottom,#18181b15_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

    <!-- ================================================================= -->
    <!-- 视图 1：10 槽位选拔大厅 (HUB VIEW) -->
    <!-- ================================================================= -->
    <div v-if="viewMode === 'hub'" class="relative z-10 flex-1 flex flex-col h-full overflow-hidden">
      <!-- 极矮视口待机终端 -->
      <section
        class="compact-standby-view w-full h-full flex flex-col justify-between p-4 bg-[#090a0f] font-mono select-none">
        <div class="flex items-center justify-between text-xs border-b border-zinc-800 pb-2">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span class="text-amber-400 font-bold tracking-wider">FW_OS // STANDBY_MODE</span>
          </div>
          <span class="text-[10px] text-zinc-500">RES_LIMIT: CRITICAL</span>
        </div>
        <div class="my-auto py-2">
          <div class="text-xs text-emerald-400 font-bold tracking-widest uppercase mb-1">
            &gt; SYSTEM_HALT: VIEWPORT_GEOMETRY_RESTRICTED
          </div>
          <p class="text-[11px] text-zinc-300 leading-relaxed max-w-xl">
            目前視窗高度受限，無法展開 10 槽位選手評定矩陣。<br>
            請點擊下方控制列的 <span class="text-white font-bold bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">⤢ 展開 /
              全螢幕</span> 按鈕以解除戰術限制。
          </p>
        </div>
        <div class="text-[10px] text-zinc-600 flex justify-between items-center pt-2 border-t border-zinc-900">
          <span class="animate-pulse">&gt; WAITING_FOR_DISPLAY_EXPANSION_</span>
          <span>DISCORD_EMBED_SEC_01</span>
        </div>
      </section>

      <!-- 标准大厅 -->
      <div class="normal-hub-view flex-1 flex flex-col h-full overflow-hidden">
        <header
          class="shrink-0 w-full px-5 py-2.5 flex items-center justify-between border-b border-zinc-800/80 bg-[#090a0f]/95 backdrop-blur-md">
          <div class="flex items-center gap-3">
            <a href="https://forestwork.vercel.app/" target="_blank" rel="noopener noreferrer"
              class="group flex items-center gap-2 bg-[#12141a] hover:bg-[#1a1e27] border border-zinc-700/80 hover:border-emerald-500 px-3 py-1.5 rounded-sm transition-all duration-150 shadow-sm"
              title="開啟林間小鎮官方網站">
              <span
                class="text-xs font-mono font-bold text-emerald-400 group-hover:-translate-x-0.5 transition-transform">←</span>
              <span
                class="text-xs font-black tracking-widest uppercase text-zinc-200 group-hover:text-white font-mono whitespace-nowrap">
                FORESTWORK.OS
              </span>
              <span class="text-[10px] text-zinc-500 group-hover:text-emerald-400 font-mono">↗</span>
            </a>
          </div>

          <div class="text-center px-2">
            <h1
              class="text-xs sm:text-base md:text-lg font-black tracking-[0.2em] text-white uppercase font-mono whitespace-nowrap">
              CHOOSE YOUR TRIAL
            </h1>
            <p
              class="text-[8px] sm:text-[9px] tracking-widest text-emerald-400 font-mono whitespace-nowrap hidden sm:block">
              選手實力評定沙盒 // 10 SLOTS MATRIX
            </p>
          </div>

          <div class="flex items-center gap-2 font-mono text-xs whitespace-nowrap">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span class="text-[10px] text-emerald-400 tracking-wider">
              OP: {{ currentOperatorDisplay }}
            </span>
          </div>
        </header>

        <main class="flex-1 min-h-0 w-full max-w-7xl mx-auto p-2.5 sm:p-4 flex flex-col overflow-hidden">
          <div class="grid grid-cols-2 sm:grid-cols-5 grid-rows-5 sm:grid-rows-2 gap-2 sm:gap-3 w-full h-full min-h-0">
            <div v-for="slot in TRIAL_SLOTS" :key="slot.id" @click="openBriefing(slot)" :class="[
              'group relative flex flex-col justify-between p-2 sm:p-3 rounded-sm border transition-all duration-150 select-none overflow-hidden h-full min-h-0',
              slot.status === 'ready'
                ? 'bg-[#10131a] hover:bg-[#151a24] border-zinc-800 cursor-pointer hover:shadow-lg'
                : 'bg-[#0c0d12]/50 border-zinc-900/80 opacity-50 cursor-not-allowed'
            ]">
              <div
                class="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-zinc-600 group-hover:border-emerald-400 transition-colors" />
              <div
                class="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-zinc-600 group-hover:border-emerald-400 transition-colors" />

              <div class="shrink-0 flex justify-between items-start font-mono z-10 leading-tight">
                <span class="text-[10px] sm:text-[11px] font-black transition-colors"
                  :style="{ color: slot.status === 'ready' ? slot.accentColor : '#71717a' }">
                  // {{ slot.index }}
                </span>
                <div class="text-right">
                  <div
                    class="text-[10px] sm:text-[11px] font-bold tracking-wider text-zinc-200 group-hover:text-white truncate max-w-[80px] sm:max-w-none">
                    {{ slot.title }}
                  </div>
                  <div
                    class="text-[7px] sm:text-[8px] text-zinc-500 tracking-tight uppercase truncate max-w-[70px] sm:max-w-none">
                    {{ slot.category }}
                  </div>
                </div>
              </div>

              <div class="flex-1 min-h-0 flex flex-col items-center justify-center py-0.5 overflow-hidden relative">
                <div
                  class="text-xl sm:text-2xl font-black font-mono transition-transform duration-200 group-hover:scale-110 select-none"
                  :style="{ color: slot.status === 'ready' ? slot.accentColor : '#3f3f46' }">
                  {{ slot.status === 'ready' ? '⚡' : '🔒' }}
                </div>
                <span v-if="slot.status === 'ready'"
                  class="mt-0.5 px-1.5 py-0.2 text-[7px] sm:text-[8px] font-mono tracking-widest uppercase rounded border font-semibold"
                  :style="{
                    backgroundColor: `${slot.accentColor}15`,
                    color: slot.accentColor,
                    borderColor: `${slot.accentColor}40`
                  }">
                  DEPLOYABLE
                </span>
              </div>

              <div
                class="shrink-0 pt-1 border-t border-zinc-800/80 font-mono z-10 flex items-center justify-between leading-tight">
                <div>
                  <div class="text-[7px] sm:text-[8px] tracking-widest text-zinc-500 uppercase">PB</div>
                  <div
                    class="text-[11px] sm:text-xs font-black tracking-tight text-zinc-200 group-hover:text-white transition-colors">
                    {{ slot.bestScore }}
                  </div>
                </div>

                <button v-if="slot.status === 'ready'" @mousedown.stop @click.stop="openScoreboard(slot)"
                  class="p-1 rounded bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-emerald-500 text-zinc-400 hover:text-emerald-400 transition-all shadow-sm"
                  title="檢視該項目排行榜 // SCOREBOARD">
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round">
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                    <path d="M4 22h16" />
                    <path d="M10 14.66V17c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-2.34" />
                    <path d="M18 14.66V17c0 .55-.45 1-1 1h-2c-.55 0-1-.45-1-1v-2.34" />
                    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>

    <!-- ================================================================= -->
    <!-- 视图 2：VALORANT VCT 风格三列战术新手简报 (3-COLUMNS BRIEFING) -->
    <!-- ================================================================= -->
    <div v-else-if="viewMode === 'briefing'"
      class="relative z-10 flex-1 flex flex-col h-full overflow-hidden font-mono">
      <!-- 简报顶栏 -->
      <header
        class="shrink-0 w-full px-5 py-3 flex items-center justify-between border-b border-zinc-800/80 bg-[#090a0f]/95 backdrop-blur-md">
        <div class="flex items-center gap-3">
          <button @click="viewMode = 'hub'"
            class="group flex items-center gap-1.5 bg-[#12141a] hover:bg-[#1a1e27] border border-zinc-700/80 hover:border-emerald-500 px-3 py-1.5 rounded-sm transition-all text-xs font-bold text-zinc-300 hover:text-white">
            <span class="text-emerald-400 group-hover:-translate-x-0.5 transition-transform">←</span>
            <span>[ESC // HUB]</span>
          </button>
          <span
            class="text-xs font-bold text-zinc-400 uppercase tracking-widest pl-2 border-l border-zinc-800 hidden sm:inline">
            TRIAL BRIEFING // {{ currentSlot.code }}
          </span>
        </div>

        <div class="text-center">
          <h1 class="text-sm sm:text-lg font-black tracking-[0.2em] text-white uppercase">
            {{ currentSlot.title }}
          </h1>
          <p class="text-[9px] tracking-widest text-emerald-400 uppercase hidden sm:block">
            {{ currentSlot.category }}
          </p>
        </div>

        <div class="flex items-center gap-2 text-xs">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span class="text-[10px] text-zinc-400 tracking-wider">ARMED</span>
        </div>
      </header>

      <!-- 核心 3 列战术立柱容器 (致敬参考图 image_e95da3.jpg) -->
      <main class="flex-1 min-h-0 w-full max-w-5xl mx-auto p-4 sm:p-6 flex flex-col justify-center overflow-y-auto">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-5 w-full h-full max-h-[460px] min-h-0">
          <div v-for="(step, idx) in currentBriefing.columns" :key="idx"
            class="relative flex flex-col justify-between bg-[#0e1117] border border-zinc-800 rounded-sm overflow-hidden shadow-2xl group hover:border-zinc-700 transition-colors">
            <!-- 工业战术卡头 (实色横条，致敬原图顶部米黄色块) -->
            <div
              class="shrink-0 bg-[#d4af37] text-black px-3.5 py-2 flex items-center justify-between font-black tracking-widest text-xs uppercase">
              <span>{{ step.title }}</span>
              <span class="text-[10px] opacity-75 font-mono">{{ step.tag }}</span>
            </div>

            <!-- 卡片中央战术视觉展示区 -->
            <div
              class="flex-1 min-h-[140px] flex flex-col items-center justify-center p-4 relative overflow-hidden bg-[#090b0e]">
              <!-- 战术网格背景 -->
              <div
                class="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:12px_12px] opacity-25" />

              <!-- 中央大号战术徽标 -->
              <div
                class="text-4xl sm:text-5xl my-2 select-none transform group-hover:scale-110 transition-transform duration-300">
                {{ step.icon }}
              </div>

              <!-- 核心战术短语 -->
              <div class="text-xs sm:text-sm font-bold text-zinc-200 tracking-wide text-center mt-2 z-10 uppercase">
                {{ step.headline }}
              </div>
            </div>

            <!-- 卡片底栏：详细行动准则描述 -->
            <div
              class="shrink-0 p-3.5 border-t border-zinc-800/80 bg-[#0e1117] text-[11px] leading-relaxed text-zinc-400">
              {{ step.description }}
            </div>
          </div>
        </div>
      </main>

      <!-- 底部动作条 (致敬原图底部 WATCH / PLAY 双按钮) -->
      <footer
        class="shrink-0 w-full py-4 px-6 border-t border-zinc-800/80 bg-[#090a0f]/95 backdrop-blur-md flex items-center justify-center gap-4">
        <!-- 次要动作：返回大厅 -->
        <button @click="viewMode = 'hub'"
          class="px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 rounded-sm text-xs font-bold text-zinc-300 hover:text-white uppercase tracking-widest transition-all">
          [ ← RETURN // 大廳 ]
        </button>

        <!-- 主要动作：正式部署 / 开打 (PLAY) -->
        <button @click="launchSlot(currentSlot)"
          class="px-8 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-[0.2em] rounded-sm transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transform hover:-translate-y-0.5">
          DEPLOY // 開始實戰 ➔
        </button>
      </footer>
    </div>

    <!-- ================================================================= -->
    <!-- 视图 3：CANVAS 游戏测试视口 (PLAYING VIEW) -->
    <!-- ================================================================= -->
    <div v-else class="relative z-10 flex-1 flex flex-col h-full overflow-hidden">
      <!-- 游戏顶栏 HUD -->
      <header
        class="shrink-0 w-full max-w-4xl mx-auto flex items-center justify-between px-4 py-2.5 text-sm border-b border-zinc-800 bg-[#09090b]/90 z-20">
        <div class="flex items-center gap-3">
          <button @click="exitToHub"
            class="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded text-xs font-mono font-bold flex items-center gap-1 transition-colors">
            <span>←</span> [ESC // HUB]
          </button>
          <span class="text-xs font-mono text-emerald-400 font-bold hidden sm:inline">
            // {{ currentSlot.title }}
          </span>
        </div>

        <div class="flex gap-6 font-bold text-sm sm:text-base font-mono">
          <div>SCORE: <span class="text-emerald-400">{{ score }}</span></div>
          <div>
            {{ (activeModule.durationMs ?? 60000) > 0 ? 'TIME:' : 'ELAPSED:' }}
            <span class="text-sky-400">{{ remainingTime.toFixed(1) }}s</span>
          </div>
        </div>
      </header>

      <!-- 4:3 逻辑等比画布容器 -->
      <main class="flex-1 min-h-0 w-full flex items-center justify-center p-2 sm:p-4 overflow-hidden relative">
        <div class="relative h-full max-h-full aspect-[4/3] max-w-full flex items-center justify-center">
          <canvas ref="canvasRef" width="800" height="600" @mousedown="handlePointerDown" @mousemove="handlePointerMove"
            @mouseleave="handlePointerLeave" @contextmenu.prevent
            class="w-full h-full bg-[#18181b] border border-zinc-800 shadow-2xl cursor-crosshair block" />

          <!-- ================================================================= -->
          <!-- ★ 核心成果：VALORANT VCT 殿堂级战术结算中心 (致敬 image_e9621c.png) -->
          <!-- ================================================================= -->
          <div v-if="isFinished"
            class="absolute inset-0 z-30 bg-[#090a0f]/95 backdrop-blur-md flex flex-col items-center justify-between p-6 sm:p-8 font-mono select-none animate-fade-in">
            <!-- 1. 顶部：战术评级与超大 COMBAT SCORE (致敬原图 FLAWLESS ACE + 11,678) -->
            <div class="text-center space-y-1">
              <h2 class="text-xl sm:text-2xl font-black tracking-[0.25em] text-[#d4af37] uppercase">
                {{ activeSummary.rating }}
              </h2>
              <div class="text-5xl sm:text-7xl font-black tracking-tight text-[#d4af37] drop-shadow-md">
                {{ score.toLocaleString() }}
              </div>
              <div class="text-[11px] font-bold tracking-[0.2em] text-zinc-400 uppercase">
                COMBAT SCORE
              </div>
              <div class="text-xs font-bold tracking-widest text-[#ef4444]">
                BEST {{ currentSlot.bestScore }}
              </div>
            </div>

            <!-- 2. 中部：双 Tab 容器 (MATCH SUMMARY vs GLOBAL RANKING) -->
            <div
              class="w-full max-w-2xl bg-[#0e1117] border border-zinc-800 rounded-sm overflow-hidden shadow-2xl my-auto">
              <!-- Tab 切换头 (致敬原图顶栏色块) -->
              <div
                class="grid grid-cols-2 text-center text-xs font-black tracking-widest uppercase cursor-pointer border-b border-zinc-800">
                <button @click="settlementTab = 'summary'" :class="[
                  'py-3 transition-colors',
                  settlementTab === 'summary'
                    ? 'bg-[#d4af37] text-black shadow-inner font-black'
                    : 'bg-[#12141a] text-zinc-400 hover:text-white'
                ]">
                  MATCH SUMMARY
                </button>
                <button @click="settlementTab = 'ranking'" :class="[
                  'py-3 transition-colors',
                  settlementTab === 'ranking'
                    ? 'bg-[#d4af37] text-black shadow-inner font-black'
                    : 'bg-[#12141a] text-zinc-400 hover:text-white'
                ]">
                  GLOBAL RANKING
                </button>
              </div>

              <!-- Tab 内容区 A：对局 4 维微观数据立柱 (致敬原图 ACC / AVG TTK / BEST TTK / WHIFFS) -->
              <div v-if="settlementTab === 'summary'" class="p-6 grid grid-cols-4 gap-4 text-center bg-[#090b0e]">
                <div v-for="(metric, idx) in activeSummary.metrics" :key="idx"
                  class="flex flex-col items-center justify-between space-y-1.5">
                  <!-- 指标主数值 -->
                  <div class="text-xl sm:text-2xl font-black tracking-tight text-white font-mono">
                    {{ metric.value }}
                  </div>
                  <!-- 指标标签 -->
                  <div class="text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
                    {{ metric.label }}
                  </div>
                  <!-- 金色倍率胶囊 (x2.00 等) -->
                  <div class="h-5 flex items-center justify-center">
                    <span v-if="metric.badge"
                      class="px-2 py-0.5 text-[10px] font-black bg-[#d4af37] text-black rounded-sm shadow-sm">
                      {{ metric.badge }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Tab 内容区 B：全球天梯排行榜 (消灭外部独立弹窗，原生就地查阅) -->
              <div v-else class="p-4 bg-[#090b0e] space-y-1.5 max-h-[160px] overflow-y-auto">
                <div
                  class="grid grid-cols-12 text-[10px] text-zinc-500 font-bold uppercase tracking-widest px-2 pb-1 border-b border-zinc-900">
                  <span class="col-span-2">RANK</span>
                  <span class="col-span-5">OPERATOR</span>
                  <span class="col-span-3 text-right">SCORE</span>
                  <span class="col-span-2 text-right">TIME</span>
                </div>

                <!-- 真实列表渲染 -->
                <div v-for="entry in liveLeaderboard" :key="entry.discord_id" :class="[
                  'grid grid-cols-12 items-center text-xs px-2 py-1 rounded transition-colors',
                  entry.discord_id === currentDiscordId
                    ? 'bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 font-bold'
                    : 'text-zinc-300'
                ]">
                  <span class="col-span-2 font-black italic text-zinc-500">#{{ entry.global_rank }}</span>
                  <span class="col-span-5 truncate flex items-center gap-1.5">
                    <img :src="entry.avatar_url" class="w-3.5 h-3.5 rounded-full" alt="" />
                    <span>{{ entry.operator_name }}</span>
                  </span>
                  <span class="col-span-3 text-right font-black text-zinc-100">{{ entry.score.toLocaleString() }}</span>
                  <span class="col-span-2 text-right text-[10px] text-zinc-500">
                    {{ new Date(entry.created_at).toLocaleDateString() }}
                  </span>
                </div>

                <!-- 空态提示 -->
                <div v-if="liveLeaderboard.length === 0" class="text-center py-4 text-xs text-zinc-600">
                  // 暫無戰績記錄 · 等待首位特工登頂
                </div>
              </div>
            </div>

            <!-- 3. 底部：三段式动作条 (致敬原图 [←] [PLAY AGAIN] [↑/SHARE]) -->
            <div class="flex items-center gap-3 w-full max-w-sm justify-center">
              <!-- 返回大厅按钮 -->
              <button @click="exitToHub"
                class="w-11 h-11 flex items-center justify-center bg-[#12141a] hover:bg-[#1a1e27] border border-zinc-700 hover:border-zinc-500 rounded-sm text-zinc-300 hover:text-white transition-colors shadow-md"
                title="返回戰術大廳">
                <span class="text-base font-bold">←</span>
              </button>

              <!-- 再次挑战主按钮 (加宽金色实心矩形) -->
              <button @click="launchSlot(currentSlot)"
                class="flex-1 h-11 bg-[#d4af37] hover:bg-[#e6c14a] text-black font-black text-xs uppercase tracking-[0.2em] rounded-sm transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_25px_rgba(212,175,55,0.5)] transform hover:-translate-y-0.5 flex items-center justify-center">
                PLAY AGAIN
              </button>

              <!-- 战绩分享/复制按钮 -->
              <button @click="shareScore"
                class="w-11 h-11 flex items-center justify-center bg-[#12141a] hover:bg-[#1a1e27] border border-zinc-700 hover:border-zinc-500 rounded-sm text-zinc-300 hover:text-white transition-colors shadow-md group"
                title="複製戰報至剪貼板">
                <svg class="w-4 h-4 group-hover:scale-110 transition-transform text-zinc-300" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- ================================================================= -->
    <!-- 统一排行榜弹窗 (SCOREBOARD MODAL) -->
    <!-- ================================================================= -->
    <div v-if="isScoreboardOpen" @mousedown.stop @click.self="closeScoreboard"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-mono select-none">
      <div class="relative w-full max-w-lg bg-[#0e1117] border border-zinc-700 rounded-sm shadow-2xl p-5 space-y-4">
        <div class="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div>
            <div class="text-xs font-bold tracking-widest text-emerald-400 uppercase">
              // {{ scoreboardSlot.title }} SCOREBOARD
            </div>
            <div class="text-[10px] text-zinc-500 uppercase tracking-wider">
              {{ scoreboardSlot.category }} · TOP OPERATORS
            </div>
          </div>
          <button @click="closeScoreboard"
            class="text-zinc-400 hover:text-white text-xs font-bold px-2 py-1 bg-zinc-800/80 hover:bg-zinc-700 rounded transition-colors">
            [ESC / ✕]
          </button>
        </div>

        <div class="space-y-1.5">
          <div
            class="grid grid-cols-12 text-[10px] text-zinc-500 font-bold uppercase tracking-widest px-2 pb-1 border-b border-zinc-900">
            <span class="col-span-2">RANK</span>
            <span class="col-span-5">OPERATOR</span>
            <span class="col-span-3 text-right">SCORE</span>
            <span class="col-span-2 text-right">DATE</span>
          </div>

          <!-- ★ 核心修复：彻底消灭内联假数组，绑定真实的 liveLeaderboard！ -->
          <div v-for="entry in liveLeaderboard" :key="entry.discord_id" :class="[
            'grid grid-cols-12 items-center text-xs px-2 py-1.5 rounded transition-colors',
            entry.discord_id === currentDiscordId
              ? 'bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 font-bold'
              : 'hover:bg-zinc-900/60 text-zinc-300'
          ]">
            <span class="col-span-2 font-black italic text-zinc-500">#{{ entry.global_rank }}</span>
            <span class="col-span-5 truncate flex items-center gap-1.5">
              <img :src="entry.avatar_url" class="w-3.5 h-3.5 rounded-full" alt="" />
              <span>{{ entry.operator_name }}</span>
            </span>
            <span class="col-span-3 text-right font-black font-mono text-zinc-100">{{ entry.score.toLocaleString()
              }}</span>
            <span class="col-span-2 text-right text-[10px] text-zinc-500">
              {{ new Date(entry.created_at).toLocaleDateString() }}
            </span>
          </div>

          <!-- 空数据状态提示 -->
          <div v-if="liveLeaderboard.length === 0" class="text-center py-6 text-xs text-zinc-600">
            // 該項目暫無排位數據 · 等待首位特工登頂
          </div>
        </div>

        <div class="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-500">
          <span>STATUS: STANDBY // MOCK_DATA</span>
          <span class="text-emerald-500/80">SUPABASE_SYNC: READY</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media (max-height: 329px) {
  .normal-hub-view {
    display: none !important;
  }

  .compact-standby-view {
    display: flex !important;
  }
}

@media (min-height: 330px) {
  .compact-standby-view {
    display: none !important;
  }

  .normal-hub-view {
    display: flex !important;
  }
}
</style>