<!-- app/pages/activities/skill-test.vue -->
<script setup lang="ts">
import { DiscordSDK } from '@discord/embedded-app-sdk'
import type { SkillModuleInstance, FloatingText } from '~/utils/skill-tests/types'
import { Module1Precision } from '~/utils/skill-tests/module1-precision'

definePageMeta({
    layout: false // 绝不加载主站 Header/Footer
})

const canvasRef = ref<HTMLCanvasElement | null>(null)
const currentModuleId = ref(1)
const score = ref(0)
const remainingTime = ref(60.0)
const isFinished = ref(false)
const isDiscordReady = ref(false)

// 1. 核心修复：确凿实例化默认模块，消除 modules[1] 查表的 undefined 幽灵
const defaultModule = new Module1Precision()
const modules: Record<number, SkillModuleInstance> = {
    1: defaultModule
    // 2: new Module2Dual(),
    // 3: new Module3Trail(),
    // 4: new Module4OddPair()
}

// activeModule 拥有确凿的初始引用，绝对非空
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

    // 2. 核心修复：严格模式下标读取防卫，彻底消灭 'ft is possibly undefined'
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i]
        if (!ft) continue // 卫语句：将 ft 精准收窄为 FloatingText

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

    // 卫语句：若找不到目标模块直接退出，消灭 undefined 赋值给 activeModule 的风险
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

onMounted(async () => {
    // 3. 核心修复：收窄 runtimeConfig 类型，消灭 {} 类型坍塌，防范 undefined 字符串化
    try {
        const rawClientId = (useRuntimeConfig().public as Record<string, unknown>).discordClientId
        const clientId = typeof rawClientId === 'string' && rawClientId.trim().length > 0
            ? rawClientId.trim()
            : '311484597248720907'

        const discordSdk = new DiscordSDK(clientId)
        await discordSdk.ready()
        isDiscordReady.value = true
    } catch {
        // 允许在本地浏览器独立调试
        isDiscordReady.value = true
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    startModule(1)
})

onUnmounted(() => {
    cancelAnimationFrame(animationFrameId)
    window.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('keyup', handleKeyUp)
    activeModule.cleanup?.()
})
</script>

<template>
  <div class="h-screen w-screen bg-[#09090b] text-zinc-100 flex flex-col items-center justify-center overflow-hidden select-none font-mono">
    <!-- 顶栏状态看板与模块选择器 -->
    <header class="w-full max-w-[800px] flex items-center justify-between px-4 py-2 text-sm border-b border-zinc-800">
      <div class="flex gap-2">
        <button
          v-for="i in [1, 2, 3, 4]"
          :key="i"
          @click="startModule(i)"
          :class="[
            'px-2.5 py-1 rounded text-xs transition-colors',
            currentModuleId === i ? 'bg-emerald-600 text-white font-bold' : 'bg-zinc-800 text-zinc-400 hover:text-white'
          ]"
        >
          Mod {{ i }}
        </button>
      </div>

      <div class="flex gap-6 font-bold text-base">
        <div>SCORE: <span class="text-emerald-400">{{ score }}</span></div>
        <div>TIME: <span class="text-sky-400">{{ remainingTime.toFixed(1) }}s</span></div>
      </div>
    </header>

    <!-- 响应式黑边自适应容器 -->
    <main class="relative flex-1 w-full flex items-center justify-center p-2">
      <div class="relative w-full h-full max-w-[calc(100vh*800/600)] max-h-[calc(100vw*600/800)] flex items-center justify-center">
        <canvas
          ref="canvasRef"
          width="800"
          height="600"
          @mousedown="handlePointerDown"
          class="w-full h-full bg-[#18181b] border border-zinc-800 shadow-2xl cursor-crosshair object-contain"
        />

        <!-- 结算弹窗 -->
        <div
          v-if="isFinished"
          class="absolute inset-0 bg-black/85 flex flex-col items-center justify-center space-y-4"
        >
          <h2 class="text-2xl font-bold text-zinc-200">測試完成</h2>
          <p class="text-xl text-emerald-400 font-bold">最終得分: {{ score }}</p>
          <button
            @click="startModule(currentModuleId)"
            class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded transition-colors"
          >
            再次挑戰
          </button>
        </div>
      </div>
    </main>
  </div>
</template>