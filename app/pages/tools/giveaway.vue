<!-- app/pages/tools/giveaway.vue -->
<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'

interface Candidate {
    id: string
    name: string
    avatarUrl?: string
}

interface WinnerRecord {
    round: number
    winner: Candidate
    drawnAt: string
}

const pollUrl = ref('')
const loading = ref(false)
const isSpinning = ref(false)

// 核心两阶段状态结构
const pool = ref<Candidate[]>([])
const currentWinner = ref<Candidate | null>(null)
const currentWinnerIndex = ref<number | null>(null)
const winnersHistory = ref<WinnerRecord[]>([])

const canvasRef = ref<HTMLCanvasElement | null>(null)
let currentAngle = 0 // 弧度

const SLICE_COLORS = [
    '#4C7766', '#3b82f6', '#8b5cf6', '#ec4899',
    '#f59e0b', '#10b981', '#06b6d4', '#6366f1'
]

// 浏览器端 CSPRNG 均匀取模无偏索引
const secureRandomInt = (max: number): number => {
    const array = new Uint32Array(1)
    const maxSafe = Math.floor(0xffffffff / max) * max
    let rand: number
    do {
        window.crypto.getRandomValues(array)
        rand = array[0]!
    } while (rand >= maxSafe)
    return rand % max
}

// 绘制转盘
const drawWheel = (angle: number) => {
    const canvas = canvasRef.value
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const count = pool.value.length
    const size = canvas.width
    const center = size / 2
    const radius = center - 10

    ctx.clearRect(0, 0, size, size)

    if (count === 0) {
        ctx.beginPath()
        ctx.arc(center, center, radius, 0, 2 * Math.PI)
        ctx.fillStyle = '#374151'
        ctx.fill()
        ctx.fillStyle = '#9ca3af'
        ctx.font = '14px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('奖池已空', center, center + 5)
        return
    }

    const sliceAngle = (2 * Math.PI) / count

    for (let i = 0; i < count; i++) {
        const start = angle + i * sliceAngle
        const end = start + sliceAngle

        ctx.beginPath()
        ctx.moveTo(center, center)
        ctx.arc(center, center, radius, start, end)
        ctx.fillStyle = SLICE_COLORS[i % SLICE_COLORS.length]!
        ctx.fill()
        ctx.lineWidth = 1.5
        ctx.strokeStyle = '#111827'
        ctx.stroke()

        ctx.save()
        ctx.translate(center, center)
        ctx.rotate(start + sliceAngle / 2)
        ctx.textAlign = 'right'
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 12px sans-serif'
        const name = pool.value[i]!.name
        const label = name.length > 10 ? name.slice(0, 9) + '…' : name
        ctx.fillText(label, radius - 20, 4)
        ctx.restore()
    }

    // 中心圆环
    ctx.beginPath()
    ctx.arc(center, center, 24, 0, 2 * Math.PI)
    ctx.fillStyle = '#111827'
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = '#4b5563'
    ctx.stroke()
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

// 阶段 1：拉取并初始化奖池
const handlePull = async () => {
    if (!pollUrl.value || isSpinning.value) return
    loading.value = true
    currentWinner.value = null
    currentWinnerIndex.value = null
    winnersHistory.value = []

    try {
        const res = await $fetch<{ candidates: Candidate[] }>('/api/giveaway/pull', {
            method: 'POST',
            body: { pollUrl: pollUrl.value }
        })
        pool.value = res.candidates
        await nextTick()
        drawWheel(currentAngle)
    } catch (err: any) {
        alert(err?.data?.statusMessage || err?.message || '拉取名单失败')
    } finally {
        loading.value = false
    }
}

// 阶段 2：执行单次抽取
const handleDraw = () => {
    if (pool.value.length === 0 || isSpinning.value) return
    isSpinning.value = true
    currentWinner.value = null

    // 1. 本地 CSPRNG 一秒定乾坤
    const targetIndex = secureRandomInt(pool.value.length)
    currentWinnerIndex.value = targetIndex

    // 2. 角度计算
    const count = pool.value.length
    const sliceAngle = (2 * Math.PI) / count
    const pointerPos = 1.5 * Math.PI
    const targetSliceMid = (targetIndex + 0.5) * sliceAngle
    const baseTargetAngle = pointerPos - targetSliceMid

    const startAngle = currentAngle % (2 * Math.PI)
    const fullRotations = 6 * (2 * Math.PI)
    const deltaAngle = (baseTargetAngle - startAngle + fullRotations * 2) % (2 * Math.PI) + fullRotations

    const duration = 6000
    const startTime = performance.now()

    const step = (now: number) => {
        const elapsed = now - startTime
        const progress = Math.min(elapsed / duration, 1)
        currentAngle = startAngle + deltaAngle * easeOut(progress)
        drawWheel(currentAngle)

        if (progress < 1) {
            requestAnimationFrame(step)
        } else {
            isSpinning.value = false
            currentWinner.value = pool.value[targetIndex]!
        }
    }

    requestAnimationFrame(step)
}

// 核心复用：确认胜者并移出奖池，准备下一轮
const commitAndRemoveWinner = () => {
    if (!currentWinner.value || currentWinnerIndex.value === null) return

    // 1. 记入历史榜单
    winnersHistory.value.push({
        round: winnersHistory.value.length + 1,
        winner: currentWinner.value,
        drawnAt: new Date().toLocaleTimeString()
    })

    // 2. 从池子移除中奖者
    pool.value.splice(currentWinnerIndex.value, 1)

    // 3. 重置中间态并重绘转盘
    currentWinner.value = null
    currentWinnerIndex.value = null
    drawWheel(currentAngle)
}
</script>

<template>
    <div class="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <div class="text-center space-y-2">
            <h1 class="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                林间幸运转盘 · Multi-Draw Giveaway
            </h1>
            <p class="text-sm text-gray-500">
                第一步拉取名单固定池子，第二步可连环抽选并随时移出中奖者
            </p>
        </div>

        <!-- 阶段 1：名单拉取面板 -->
        <UCard>
            <div class="flex flex-col sm:flex-row gap-3">
                <UInput v-model="pollUrl" class="flex-1" placeholder="https://discord.com/channels/.../.../..."
                    icon="i-heroicons-link" :disabled="isSpinning || loading" />
                <UButton color="primary" :loading="loading" :disabled="!pollUrl || isSpinning"
                    icon="i-heroicons-arrow-down-tray" @click="handlePull">
                    第一步：拉取名单
                </UButton>
            </div>
        </UCard>

        <!-- 阶段 2：转盘与连环抽取控制台 -->
        <div v-if="pool.length > 0 || winnersHistory.length > 0"
            class="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">

            <!-- 左侧：转盘交互区 -->
            <div class="md:col-span-2 flex flex-col items-center space-y-6">
                <div class="relative w-[340px] h-[340px]">
                    <!-- 固定指针 -->
                    <div
                        class="absolute -top-3 left-1/2 -translate-x-1/2 z-10 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[18px] border-t-rose-500 drop-shadow" />

                    <!-- Canvas 画布 -->
                    <canvas ref="canvasRef" width="340" height="340"
                        class="rounded-full shadow-2xl border-4 border-gray-800" />
                </div>

                <div class="flex items-center gap-4">
                    <UButton size="lg" color="primary"
                        :disabled="pool.length === 0 || isSpinning || currentWinner !== null" :loading="isSpinning"
                        icon="i-heroicons-sparkles" @click="handleDraw">
                        {{ pool.length === 0 ? '奖池已无候选人' : `开始抽奖 (剩余 ${pool.length} 人)` }}
                    </UButton>
                </div>

                <!-- 本轮命中展示与移除确认 -->
                <UCard v-if="currentWinner" class="w-full border-2 border-emerald-500 bg-emerald-950/20 text-center">
                    <div class="space-y-4 py-2">
                        <div class="text-xs font-bold uppercase tracking-widest text-emerald-400">
                            🎯 本轮中奖玩家
                        </div>
                        <div class="flex items-center justify-center gap-3">
                            <UAvatar v-if="currentWinner.avatarUrl" :src="currentWinner.avatarUrl"
                                :alt="currentWinner.name" size="md" />
                            <span class="text-xl font-bold text-white">
                                {{ currentWinner.name }}
                            </span>
                        </div>
                        <div class="pt-2">
                            <UButton color="primary" variant="solid" icon="i-heroicons-user-minus"
                                @click="commitAndRemoveWinner">
                                移入中奖名单并准备下一轮
                            </UButton>
                        </div>
                    </div>
                </UCard>
            </div>

            <!-- 右侧：已中奖历史公示榜 -->
            <UCard class="w-full">
                <template #header>
                    <div class="flex items-center justify-between w-full gap-2">
                        <!-- 左侧：标题与中奖人数徽章 -->
                        <div class="flex items-center gap-2">
                            <span class="font-bold text-sm text-gray-900 dark:text-white">
                                🏆 獲獎名單
                            </span>
                            <UBadge color="primary" variant="subtle" size="xs" class="font-mono">
                                {{ winnersHistory.length }}
                            </UBadge>
                        </div>

                        <!-- 右侧：池内剩余人数独立状态徽章 -->
                        <UBadge color="secondary" variant="soft" size="xs" class="font-mono text-gray-400">
                            池剩餘 {{ pool.length }} 人
                        </UBadge>
                    </div>
                </template>

                <div v-if="winnersHistory.length === 0" class="text-xs text-gray-500 text-center py-6">
                    暂无中奖记录，点击左侧按钮开抽
                </div>

                <ul v-else class="divide-y divide-gray-800 space-y-2">
                    <li v-for="item in winnersHistory" :key="item.winner.id"
                        class="pt-2 flex items-center justify-between text-sm">
                        <div class="flex items-center gap-2">
                            <span class="text-xs font-mono text-primary-400 font-bold">#{{ item.round }}</span>
                            <span class="font-medium text-gray-200">{{ item.winner.name }}</span>
                        </div>
                        <span class="text-[10px] font-mono text-gray-500">{{ item.drawnAt }}</span>
                    </li>
                </ul>
            </UCard>

        </div>
    </div>
</template>