<!-- app/pages/activities/skill-test.vue -->
<script setup lang="ts">
import { DiscordSDK } from '@discord/embedded-app-sdk'
import type { SkillModuleInstance, FloatingText } from '~/utils/skill-tests/types'
import { Module1Precision } from '~/utils/skill-tests/module1-precision'
import { Module2Dual } from '~/utils/skill-tests/module2-dual'
import { Module3Trail } from '~/utils/skill-tests/module3-trail'
import { Module4OddPair } from '~/utils/skill-tests/module4-oddpair'
import { Module5Reaction } from '~/utils/skill-tests/module5-reaction'
import { Module6Tracking } from '~/utils/skill-tests/module6-tracking'
import { Module9Cps } from '~/utils/skill-tests/module9-cps'

definePageMeta({ layout: false })

const viewMode = ref<'hub' | 'playing'>('hub')

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

const TRIAL_SLOTS: TrialSlot[] = [
  { id: 1, index: '01', title: 'PRECISION', code: 'MOD_AIM_01', category: 'TARGET ACQUISITION', status: 'ready', moduleId: 1, bestScore: '12,430', accentColor: '#10B981' },
  { id: 2, index: '02', title: 'DUAL AXIS', code: 'MOD_CTRL_02', category: 'MOTOR COORDINATION', status: 'ready', moduleId: 2, bestScore: '11,915', accentColor: '#38BDF8' },
  { id: 3, index: '03', title: 'TRAIL LINK', code: 'MOD_SCAN_03', category: 'COGNITIVE SEQUENCE', status: 'ready', moduleId: 3, bestScore: '13,913', accentColor: '#FACC15' },
  { id: 4, index: '04', title: 'ODD PAIR', code: 'MOD_PERC_04', category: 'ANOMALY DETECTION', status: 'ready', moduleId: 4, bestScore: '13,828', accentColor: '#F43F5E' },
  { id: 5, index: '05', title: 'REACTION', code: 'MOD_REACT_05', category: 'REFLEX KINETICS', status: 'ready', moduleId: 5, bestScore: '14,210', accentColor: '#A855F7' },
  { id: 6, index: '06', title: 'APEX TRACK', code: 'MOD_TRACK_06', category: 'DYNAMIC PURSUIT', status: 'ready', moduleId: 6, bestScore: '13,540', accentColor: '#EC4899' },
  { id: 7, index: '07', title: 'BUFFER FLUSH', code: 'SYS_LOCK_07', category: 'MEMORY CAPACITY', status: 'locked', bestScore: '---', accentColor: '#52525B' },
  { id: 8, index: '08', title: 'RAPID STRAFE', code: 'SYS_LOCK_08', category: 'SPATIAL AGILITY', status: 'locked', bestScore: '---', accentColor: '#52525B' },
  { id: 9, index: '09', title: 'CHRONO TAP', code: 'MOD_CPS_09', category: 'TEMPORAL CADENCE', status: 'ready', moduleId: 9, bestScore: '13,950', accentColor: '#06B6D4' },
  { id: 10, index: '10', title: 'OVERCLOCK', code: 'SYS_LOCK_10', category: 'LIMITER BREAKTHROUGH', status: 'locked', bestScore: '---', accentColor: '#52525B' }
]

// ==========================================
// 排行榜弹窗状态与 Mock 数据契约
// ==========================================
const isScoreboardOpen = ref(false)
const scoreboardSlot = ref<TrialSlot>(TRIAL_SLOTS[0]!)

interface LeaderboardEntry {
  rank: number
  operator: string
  score: string
  date: string
}

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, operator: 'Klm1200', score: '15,320', date: 'TODAY' },
  { rank: 2, operator: 'Chronicle', score: '14,850', date: 'YESTERDAY' },
  { rank: 3, operator: 'TenZ', score: '13,910', date: '3D AGO' },
  { rank: 4, operator: 'You (Guest)', score: '12,430', date: 'CURRENT' },
  { rank: 5, operator: 'starekingz', score: '11,200', date: '5D AGO' }
]

function openScoreboard(slot?: TrialSlot) {
  scoreboardSlot.value = slot || currentSlot.value
  isScoreboardOpen.value = true
}

function closeScoreboard() {
  isScoreboardOpen.value = false
}

// ==========================================
// 游戏引擎与运行时
// ==========================================
const canvasRef = ref<HTMLCanvasElement | null>(null)
const currentSlot = ref<TrialSlot>(TRIAL_SLOTS[0]!)
const score = ref(0)
const remainingTime = ref(60.0)
const isFinished = ref(false)

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
  const scaleX = 800 / rect.width
  const scaleY = 600 / rect.height
  const lx = (e.clientX - rect.left) * scaleX
  const ly = (e.clientY - rect.top) * scaleY

  activeModule.onPointerDown?.(lx, ly, performance.now(), e.button)
}

function handlePointerMove(e: MouseEvent) {
  if (!canvasRef.value || isFinished.value) return
  const rect = canvasRef.value.getBoundingClientRect()
  activeModule.onPointerMove?.((e.clientX - rect.left) * (800 / rect.width), (e.clientY - rect.top) * (600 / rect.height))
}

function handlePointerLeave() {
  activeModule.onPointerLeave?.()
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.code === 'Escape') {
    // 核心好品味：弹窗开着时优先关弹窗，不直接退回大厅！
    if (isScoreboardOpen.value) {
      closeScoreboard()
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
    return
  }

  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  activeModule.update(dt, now, elapsed)
  ctx.clearRect(0, 0, 800, 600)
  activeModule.render(ctx, now, elapsed)

  // 粒子渲染
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
  const slot = TRIAL_SLOTS.find(s => s.id === targetId && s.status === 'ready')
  if (slot) {
    launchSlot(slot)
    return true
  }
  return false
}

function exitToHub() {
  cancelAnimationFrame(animationFrameId)
  activeModule.cleanup?.()
  viewMode.value = 'hub'
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)

  // 检查 URL 是否指定直接激活某模块 (如 ?module=9 或 ?m=9)
  const route = useRoute()
  const queryMod = Number(route.query.module || route.query.m || route.query.slot)
  if (queryMod) {
    activateModule(queryMod)
  }
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
    <!-- 视图 1：10 槽位选拔大厅 -->
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
            <span
              class="hidden md:inline-block text-[11px] font-mono text-zinc-500 uppercase tracking-widest pl-2 border-l border-zinc-800 whitespace-nowrap">
              SECTOR // NORWAY
            </span>
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
            <span class="text-[10px] text-zinc-400 tracking-wider hidden sm:inline">SYS: ONLINE</span>
          </div>
        </header>

        <main class="flex-1 min-h-0 w-full max-w-7xl mx-auto p-2.5 sm:p-4 flex flex-col overflow-hidden">
          <div class="grid grid-cols-2 sm:grid-cols-5 grid-rows-5 sm:grid-rows-2 gap-2 sm:gap-3 w-full h-full min-h-0">
            <div v-for="slot in TRIAL_SLOTS" :key="slot.id" @click="launchSlot(slot)" :class="[
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

              <!-- 卡片底栏：左侧 PB 分数 + ★ 右下角排行榜图标占位按钮 -->
              <div
                class="shrink-0 pt-1 border-t border-zinc-800/80 font-mono z-10 flex items-center justify-between leading-tight">
                <div>
                  <div class="text-[7px] sm:text-[8px] tracking-widest text-zinc-500 uppercase">
                    PB
                  </div>
                  <div
                    class="text-[11px] sm:text-xs font-black tracking-tight text-zinc-200 group-hover:text-white transition-colors">
                    {{ slot.bestScore }}
                  </div>
                </div>

                <!-- 大厅卡片右下角 Scoreboard 图标 -->
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
    <!-- 视图 2：CANVAS 游戏测试视口 -->
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

          <!-- 
            ★ 核心新增：游戏视口右下角计分板图标按钮 (Scoreboard Icon Placeholder)
            1. 绑定 @mousedown.stop 与 @click.stop，绝不向 Canvas 冒泡触发扣分！
            2. 高透战术玻璃质感，融入竞技氛围。
          -->
          <button v-if="isFinished" @mousedown.stop @click.stop="openScoreboard(currentSlot)"
            class="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 px-3 py-1.5 bg-[#10131a]/90 hover:bg-[#161b26] border border-zinc-700/80 hover:border-emerald-500 rounded text-zinc-300 hover:text-white transition-all shadow-xl backdrop-blur group select-none"
            title="檢視本項排行榜 // SCOREBOARD">
            <!-- 奖杯 SVG 图标 -->
            <svg class="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-2.34" />
              <path d="M18 14.66V17c0 .55-.45 1-1 1h-2c-.55 0-1-.45-1-1v-2.34" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
            <span
              class="text-[11px] font-mono font-bold tracking-wider text-zinc-300 group-hover:text-emerald-400 uppercase">
              BOARD
            </span>
          </button>

          <!-- 结算弹窗 -->
          <div v-if="isFinished"
            class="absolute inset-0 bg-black/85 flex flex-col items-center justify-center space-y-4 font-mono z-30">
            <h2 class="text-2xl font-bold text-zinc-200 tracking-wider">評定完成 // TEST COMPLETED</h2>
            <p class="text-xl text-emerald-400 font-bold">最終得分: {{ score }}</p>
            <div class="flex gap-3">
              <button @click="launchSlot(currentSlot)"
                class="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded transition-colors uppercase tracking-wider">
                再次挑戰
              </button>
              <button @click="openScoreboard(currentSlot)"
                class="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded transition-colors uppercase tracking-wider flex items-center gap-1.5">
                <span>🏆</span> 查看榜單
              </button>
              <button @click="exitToHub"
                class="px-5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-bold rounded transition-colors uppercase tracking-wider">
                返回大廳
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- ================================================================= -->
    <!-- 统一排行榜模态窗 (SCOREBOARD PLACEHOLDER MODAL) -->
    <!-- ================================================================= -->
    <div v-if="isScoreboardOpen" @mousedown.stop @click.self="closeScoreboard"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-mono select-none">
      <div class="relative w-full max-w-lg bg-[#0e1117] border border-zinc-700 rounded-sm shadow-2xl p-5 space-y-4">
        <!-- 弹窗顶栏 -->
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

        <!-- 排行榜数据表格 (标准化战术列表) -->
        <div class="space-y-1.5">
          <div
            class="grid grid-cols-12 text-[10px] text-zinc-500 font-bold uppercase tracking-widest px-2 pb-1 border-b border-zinc-900">
            <span class="col-span-2">RANK</span>
            <span class="col-span-5">OPERATOR</span>
            <span class="col-span-3 text-right">SCORE</span>
            <span class="col-span-2 text-right">DATE</span>
          </div>

          <div v-for="entry in MOCK_LEADERBOARD" :key="entry.rank" :class="[
            'grid grid-cols-12 items-center text-xs px-2 py-1.5 rounded transition-colors',
            entry.operator.includes('You')
              ? 'bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 font-bold'
              : 'hover:bg-zinc-900/60 text-zinc-300'
          ]">
            <span class="col-span-2 font-black italic"
              :class="entry.rank === 1 ? 'text-amber-400' : entry.rank === 2 ? 'text-zinc-300' : entry.rank === 3 ? 'text-amber-600' : 'text-zinc-500'">
              #{{ entry.rank }}
            </span>
            <span class="col-span-5 truncate font-medium">{{ entry.operator }}</span>
            <span class="col-span-3 text-right font-black font-mono text-zinc-100">{{ entry.score }}</span>
            <span class="col-span-2 text-right text-[10px] text-zinc-500">{{ entry.date }}</span>
          </div>
        </div>

        <!-- 底部占位说明 -->
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