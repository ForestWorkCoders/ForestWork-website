<!-- app/pages/activities/skill-test.vue -->
<script setup lang="ts">
import { DiscordSDK } from '@discord/embedded-app-sdk'
import type { SkillModuleInstance, FloatingText } from '~/utils/skill-tests/types'
import { Module1Precision } from '~/utils/skill-tests/module1-precision'
import { Module2Dual } from '~/utils/skill-tests/module2-dual'
import { Module3Trail } from '~/utils/skill-tests/module3-trail'
import { Module4OddPair } from '~/utils/skill-tests/module4-oddpair'

definePageMeta({
  layout: false
})

// ==========================================
// 1. 核心视图状态机 (单一事实源)
// ==========================================
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

// 10 槽位单一数据源：前 4 个激活对应测试，后 6 个作为战术机密锁定
const TRIAL_SLOTS: TrialSlot[] = [
  { id: 1, index: '01', title: 'PRECISION', code: 'MOD_AIM_01', category: 'TARGET ACQUISITION', status: 'ready', moduleId: 1, bestScore: '12,430', accentColor: '#10B981' },
  { id: 2, index: '02', title: 'DUAL AXIS', code: 'MOD_CTRL_02', category: 'MOTOR COORDINATION', status: 'ready', moduleId: 2, bestScore: '11,915', accentColor: '#38BDF8' },
  { id: 3, index: '03', title: 'TRAIL LINK', code: 'MOD_SCAN_03', category: 'COGNITIVE SEQUENCE', status: 'ready', moduleId: 3, bestScore: '13,913', accentColor: '#FACC15' },
  { id: 4, index: '04', title: 'ODD PAIR', code: 'MOD_PERC_04', category: 'ANOMALY DETECTION', status: 'ready', moduleId: 4, bestScore: '13,828', accentColor: '#F43F5E' },
  { id: 5, index: '05', title: 'REACTION', code: 'SYS_LOCK_05', category: 'REFLEX KINETICS', status: 'locked', bestScore: '---', accentColor: '#52525B' },
  { id: 6, index: '06', title: 'APEX TRACK', code: 'SYS_LOCK_06', category: 'DYNAMIC PURSUIT', status: 'locked', bestScore: '---', accentColor: '#52525B' },
  { id: 7, index: '07', title: 'BUFFER FLUSH', code: 'SYS_LOCK_07', category: 'MEMORY CAPACITY', status: 'locked', bestScore: '---', accentColor: '#52525B' },
  { id: 8, index: '08', title: 'RAPID STRAFE', code: 'SYS_LOCK_08', category: 'SPATIAL AGILITY', status: 'locked', bestScore: '---', accentColor: '#52525B' },
  { id: 9, index: '09', title: 'CHRONO TAP', code: 'SYS_LOCK_09', category: 'TEMPORAL CADENCE', status: 'locked', bestScore: '---', accentColor: '#52525B' },
  { id: 10, index: '10', title: 'OVERCLOCK', code: 'SYS_LOCK_10', category: 'LIMITER BREAKTHROUGH', status: 'locked', bestScore: '---', accentColor: '#52525B' }
]

// ==========================================
// 2. 游戏引擎与运行时
// ==========================================
const canvasRef = ref<HTMLCanvasElement | null>(null)
const currentSlot = ref<TrialSlot>(TRIAL_SLOTS[0]!)
const score = ref(0)
const remainingTime = ref(60.0)
const isFinished = ref(false)
const isDiscordReady = ref(false)

const defaultModule = new Module1Precision()
const modules: Record<number, SkillModuleInstance> = {
  1: defaultModule,
  2: new Module2Dual(),
  3: new Module3Trail(),
  4: new Module4OddPair()
}

let activeModule: SkillModuleInstance = defaultModule
let animationFrameId: number
let startTime = 0
let lastTime = 0
const DURATION_MS = 60000
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

  activeModule.onPointerDown?.(lx, ly, performance.now())
}

function handleKeyDown(e: KeyboardEvent) {
  if (viewMode.value === 'playing') {
    activeModule.onKeyDown?.(e.code, e)
    if (e.code === 'Escape') {
      exitToHub()
    }
  }
}

function handleKeyUp(e: KeyboardEvent) {
  if (viewMode.value === 'playing') {
    activeModule.onKeyUp?.(e.code, e)
  }
}

function tick(now: number) {
  const dt = Math.min((now - lastTime) / 1000, 0.1)
  lastTime = now
  const elapsed = now - startTime
  const left = Math.max(0, DURATION_MS - elapsed)
  remainingTime.value = Number((left / 1000).toFixed(1))

  if (elapsed >= DURATION_MS) {
    isFinished.value = true
    return
  }

  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  activeModule.update(dt, now, elapsed)
  ctx.clearRect(0, 0, 800, 600)
  activeModule.render(ctx, now)

  // 统一粒子渲染
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

function exitToHub() {
  cancelAnimationFrame(animationFrameId)
  activeModule.cleanup?.()
  viewMode.value = 'hub'
}

async function initDiscordSdkAsync() {
  try {
    const rawClientId = (useRuntimeConfig().public as Record<string, unknown>).discordClientId
    const clientId = typeof rawClientId === 'string' && rawClientId.trim().length > 0
      ? rawClientId.trim()
      : '311484597248720907'

    const discordSdk = new DiscordSDK(clientId)
    await Promise.race([
      discordSdk.ready(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2500))
    ])
    isDiscordReady.value = true
  } catch {
    isDiscordReady.value = true
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
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
  <div class="h-screen w-screen bg-[#090a0f] text-zinc-100 flex flex-col justify-start overflow-hidden select-none font-sans relative">
    <!-- 战术扫描背景线 -->
    <div class="absolute inset-0 bg-[linear-gradient(to_right,#18181b15_1px,transparent_1px),linear-gradient(to_bottom,#18181b15_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

    <!-- ================================================================= -->
    <!-- 视图 1：VALORANT VCT 风格 10 槽位选拔大厅 (SELECTION HUB) -->
    <!-- ================================================================= -->
    <div v-if="viewMode === 'hub'" class="relative z-10 flex-1 flex flex-col h-full overflow-hidden">
      <!-- 顶部工业风横幅 -->
      <header class="shrink-0 w-full px-6 py-4 flex items-center justify-between border-b border-zinc-800/80 bg-[#090a0f]/90 backdrop-blur-md">
        <!-- 左上角：跳出至 ForestWork 官方主站 -->
        <div class="flex items-center gap-3">
          <a
            href="https://forestwork.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            class="group flex items-center gap-2 bg-[#12141a] hover:bg-[#1a1e27] border border-zinc-700/80 hover:border-emerald-500 px-3.5 py-1.5 rounded-sm transition-all duration-150 shadow-sm"
            title="開啟林間小鎮官方網站"
          >
            <!-- 极简回退/外跳图标 -->
            <span class="text-xs font-mono font-bold text-emerald-400 group-hover:-translate-x-0.5 transition-transform">←</span>
            <span class="text-xs font-black tracking-widest uppercase text-zinc-200 group-hover:text-white font-mono">
              FORESTWORK.OS
            </span>
            <span class="text-[10px] text-zinc-500 group-hover:text-emerald-400 font-mono">↗</span>
          </a>
          <span class="hidden sm:inline-block text-[11px] font-mono text-zinc-500 uppercase tracking-widest pl-2 border-l border-zinc-800">
            SECTOR // SHANGHAI
          </span>
        </div>

        <!-- 顶栏中央主标题 -->
        <div class="text-center">
          <h1 class="text-lg sm:text-2xl font-black tracking-[0.25em] text-white uppercase font-mono">
            CHOOSE YOUR TRIAL
          </h1>
          <p class="text-[10px] tracking-widest text-emerald-400 font-mono">選手實力評定沙盒 // 10 SLOTS MATRIX</p>
        </div>

        <!-- 右侧元数据 -->
        <div class="flex items-center gap-3 font-mono text-xs">
          <div class="flex items-center gap-1.5 text-zinc-400">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span class="text-[11px] tracking-wider">SYS: ONLINE</span>
          </div>
        </div>
      </header>

      <!-- 核心 10 格面板容器 (自适应缩放撑满，维持 2x5 矩阵) -->
      <main class="flex-1 min-h-0 w-full max-w-7xl mx-auto p-4 sm:p-6 flex flex-col justify-center overflow-y-auto">
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-3.5 sm:gap-4 w-full">
          <div
            v-for="slot in TRIAL_SLOTS"
            :key="slot.id"
            @click="launchSlot(slot)"
            :class="[
              'group relative flex flex-col justify-between p-3.5 rounded-sm border transition-all duration-200 select-none overflow-hidden aspect-[3/4]',
              slot.status === 'ready'
                ? 'bg-[#10131a] hover:bg-[#151a24] border-zinc-800 hover:border-emerald-500/80 cursor-pointer hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:-translate-y-1'
                : 'bg-[#0c0d12]/60 border-zinc-900 opacity-60 cursor-not-allowed'
            ]"
          >
            <!-- 槽位工业边角装饰标记 -->
            <div class="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-zinc-600 group-hover:border-emerald-400 transition-colors" />
            <div class="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-zinc-600 group-hover:border-emerald-400 transition-colors" />

            <!-- 卡片头部：编号与代号 -->
            <div class="flex justify-between items-start font-mono z-10">
              <span class="text-xs font-black text-zinc-500 group-hover:text-emerald-400 transition-colors">
                // {{ slot.index }}
              </span>
              <div class="text-right">
                <div class="text-[11px] font-bold tracking-wider text-zinc-300 group-hover:text-white">
                  {{ slot.title }}
                </div>
                <div class="text-[9px] text-zinc-500 tracking-tight uppercase">
                  {{ slot.category }}
                </div>
              </div>
            </div>

            <!-- 卡片中部：战术徽章印记与半身投影占位 -->
            <div class="relative flex-1 flex flex-col items-center justify-center my-2 overflow-hidden">
              <!-- 背景暗纹印花 (类似参考图中的 VCT 交叉 Logo) -->
              <div class="text-4xl sm:text-5xl font-black text-zinc-800/40 group-hover:text-emerald-500/10 font-mono tracking-tighter transition-colors select-none">
                {{ slot.status === 'ready' ? '⚡' : '🔒' }}
              </div>

              <!-- 状态徽章 -->
              <span
                v-if="slot.status === 'ready'"
                class="absolute bottom-1 px-2 py-0.5 text-[9px] font-mono tracking-widest uppercase bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 rounded"
              >
                DEPLOYABLE
              </span>
              <span
                v-else
                class="absolute bottom-1 px-2 py-0.5 text-[9px] font-mono tracking-widest uppercase bg-zinc-900 text-zinc-500 border border-zinc-800 rounded"
              >
                CLASSIFIED
              </span>
            </div>

            <!-- 卡片底部：PERSONAL BEST 与战绩数值 -->
            <div class="pt-2 border-t border-zinc-800/60 font-mono z-10">
              <div class="text-[9px] tracking-widest text-zinc-500 uppercase">
                PERSONAL BEST
              </div>
              <div class="text-base sm:text-lg font-black tracking-tight text-zinc-200 group-hover:text-emerald-400 transition-colors">
                {{ slot.bestScore }}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- ================================================================= -->
    <!-- 视图 2：CANVAS 测试视口 (PLAYING VIEW) -->
    <!-- ================================================================= -->
    <div v-else class="relative z-10 flex-1 flex flex-col h-full overflow-hidden">
      <!-- 游戏顶栏 HUD -->
      <header class="shrink-0 w-full max-w-4xl mx-auto flex items-center justify-between px-4 py-2.5 text-sm border-b border-zinc-800 bg-[#09090b]/90 z-20">
        <div class="flex items-center gap-3">
          <button
            @click="exitToHub"
            class="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded text-xs font-mono font-bold flex items-center gap-1 transition-colors"
          >
            <span>←</span> [ESC // HUB]
          </button>
          <span class="text-xs font-mono text-emerald-400 font-bold hidden sm:inline">
            // {{ currentSlot.title }}
          </span>
        </div>

        <div class="flex gap-6 font-bold text-sm sm:text-base font-mono">
          <div>SCORE: <span class="text-emerald-400">{{ score }}</span></div>
          <div>TIME: <span class="text-sky-400">{{ remainingTime.toFixed(1) }}s</span></div>
        </div>
      </header>

      <!-- 4:3 逻辑等比画布视口 -->
      <main class="flex-1 min-h-0 w-full flex items-center justify-center p-2 sm:p-4 overflow-hidden relative">
        <div class="relative h-full max-h-full aspect-[4/3] max-w-full flex items-center justify-center">
          <canvas
            ref="canvasRef"
            width="800"
            height="600"
            @mousedown="handlePointerDown"
            class="w-full h-full bg-[#18181b] border border-zinc-800 shadow-2xl cursor-crosshair block"
          />

          <!-- 结算弹窗 -->
          <div
            v-if="isFinished"
            class="absolute inset-0 bg-black/85 flex flex-col items-center justify-center space-y-4 font-mono z-30"
          >
            <h2 class="text-2xl font-bold text-zinc-200 tracking-wider">評定完成 // TEST COMPLETED</h2>
            <p class="text-xl text-emerald-400 font-bold">最終得分: {{ score }}</p>
            <div class="flex gap-3">
              <button
                @click="launchSlot(currentSlot)"
                class="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded transition-colors uppercase tracking-wider"
              >
                再次挑戰
              </button>
              <button
                @click="exitToHub"
                class="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded transition-colors uppercase tracking-wider"
              >
                返回大廳
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>