<!-- app/pages/activities/skill-test.vue -->
<script setup lang="ts">
import { DiscordSDK } from '@discord/embedded-app-sdk'
import type { SkillModuleInstance, FloatingText } from '~/utils/skill-tests/types'
import { Module1Precision } from '~/utils/skill-tests/module1-precision'

definePageMeta({
  layout: false
})

const canvasRef = ref<HTMLCanvasElement | null>(null)
const currentModuleId = ref(1)
const score = ref(0)
const remainingTime = ref(60.0)
const isFinished = ref(false)
const isDiscordReady = ref(false)

const defaultModule = new Module1Precision()
const modules: Record<number, SkillModuleInstance> = {
  1: defaultModule
}

let activeModule: SkillModuleInstance = defaultModule
let animationFrameId: number
let startTime = 0
let lastTime = 0
const DURATION_MS = 60000
const floatingTexts: FloatingText[] = []

function addScore(delta: number, x?: number, y?: number, color = '#4ade80') {
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
  // 核心力学：无论 4:3 画布在宽屏中如何缩放，严格映射回 800x600 逻辑视口
  const scaleX = 800 / rect.width
  const scaleY = 600 / rect.height
  const lx = (e.clientX - rect.left) * scaleX
  const ly = (e.clientY - rect.top) * scaleY

  activeModule.onPointerDown?.(lx, ly, performance.now())
}

function handleKeyDown(e: KeyboardEvent) {
  activeModule.onKeyDown?.(e.code, e)
}

function handleKeyUp(e: KeyboardEvent) {
  activeModule.onKeyUp?.(e.code, e)
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

function startModule(id: number) {
  if (!canvasRef.value) return

  const targetModule = modules[id]
  if (!targetModule) return

  activeModule.cleanup?.()
  activeModule = targetModule
  currentModuleId.value = id

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
}

// 独立的后台握手函数，绝不阻塞主渲染线程
async function initDiscordSdkAsync() {
  try {
    const rawClientId = (useRuntimeConfig().public as Record<string, unknown>).discordClientId
    const clientId = typeof rawClientId === 'string' && rawClientId.trim().length > 0
      ? rawClientId.trim()
      : '311484597248720907'

    const discordSdk = new DiscordSDK(clientId)
    
    // 设置 2.5 秒超时熔断，防止 Discord 客户端未决卡死
    await Promise.race([
      discordSdk.ready(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('SDK Handshake Timeout')), 2500))
    ])
    
    isDiscordReady.value = true
    console.log('[DiscordSDK] 握手成功')
  } catch (err) {
    console.warn('[DiscordSDK] 降级运行（独立模式或握手超时）:', err)
    isDiscordReady.value = true
  }
}

onMounted(() => {
  // ★ 核心修复 1：游戏主循环第一优先级同步点火！0 毫秒启动！
  startModule(1)

  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)

  // ★ 核心修复 2：SDK 握手完全丢到后台异步执行，谁也别等谁
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
  <!-- 
    ★ 核心修复 3：
    1. 移除 justify-center，改用 justify-start，消灭任何向上溢出的负空间！
    2. 锁死 h-screen w-screen overflow-hidden
  -->
  <div class="h-screen w-screen bg-[#09090b] text-zinc-100 flex flex-col items-center justify-start overflow-hidden select-none font-mono">
    
    <!-- 顶栏：shrink-0 绝对不许被挤压，永远死死贴在视口最顶端 -->
    <header class="shrink-0 w-full max-w-4xl flex items-center justify-between px-4 py-2.5 text-sm border-b border-zinc-800 bg-[#09090b]/90 z-20">
      <div class="flex gap-2">
        <button
          v-for="i in [1, 2, 3, 4]"
          :key="i"
          @click="startModule(i)"
          :class="[
            'px-3 py-1 rounded text-xs transition-colors',
            currentModuleId === i ? 'bg-emerald-600 text-white font-bold' : 'bg-zinc-800 text-zinc-400 hover:text-white'
          ]"
        >
          Mod {{ i }}
        </button>
      </div>

      <div class="flex gap-6 font-bold text-sm sm:text-base">
        <div>SCORE: <span class="text-emerald-400">{{ score }}</span></div>
        <div>TIME: <span class="text-sky-400">{{ remainingTime.toFixed(1) }}s</span></div>
      </div>
    </header>

    <!-- 
      ★ 核心修复 4：
      main 容器吃满剩余高度（flex-1 min-h-0），使用原生 aspect-[4/3] 进行黑边自适应（Letterbox）
      在任何 16:9 / 21:9 宽屏下自动居中，绝不拉伸、绝不削顶！
    -->
    <main class="flex-1 min-h-0 w-full flex items-center justify-center p-2 sm:p-4 overflow-hidden relative">
      <div class="relative h-full max-h-full aspect-[4/3] max-w-full flex items-center justify-center">
        <canvas
          ref="canvasRef"
          width="800"
          height="600"
          @mousedown="handlePointerDown"
          class="w-full h-full bg-[#18181b] border border-zinc-800 shadow-2xl cursor-crosshair block"
        />

        <!-- 结算弹窗：严格限定在 4:3 画布范围内 -->
        <div
          v-if="isFinished"
          class="absolute inset-0 bg-black/85 flex flex-col items-center justify-center space-y-4"
        >
          <h2 class="text-2xl font-bold text-zinc-200">測試完成</h2>
          <p class="text-xl text-emerald-400 font-bold">最終得分: {{ score }}</p>
          <button
            @click="startModule(currentModuleId)"
            class="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded transition-colors shadow-lg"
          >
            再次挑戰
          </button>
        </div>
      </div>
    </main>
  </div>
</template>