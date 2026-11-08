<script setup lang="ts">
import { ref } from 'vue'

// 1. SEO 元数据
useSeoMeta({
    title: '林間SMP · ForestWork',
    ogTitle: '林間SMP · ForestWork',
    description: '林間小鎮多元化SMP多人生存伺服器 ⎯ 只供受邀請成員與實況主遊玩、交流。',
    ogDescription: '林間小鎮多元化SMP多人生存伺服器 ⎯ 只供受邀請成員與實況主遊玩、交流。',
    ogImage: 'https://i.imgur.com/cu2YAkn.png'
})

// 2. 原生剪贴板逻辑
const serverIp = 'told you to coming soon :('
const copied = ref(false)

async function copy() {
    try {
        await navigator.clipboard.writeText(serverIp)
        copied.value = true
        setTimeout(() => {
            copied.value = false
        }, 2000)
    } catch (err) {
        console.error('复制失败:', err)
    }
}

// 3. 季数导航链接
interface SeasonLink {
    title: string
    url: string
    icon: string
    external: boolean
}

const navLinks: SeasonLink[] = [
    { title: '第一季', url: 'https://forestworkcoders.github.io/ForestWorkSMPS1', icon: 'i-lucide-dice-1', external: true },
    { title: '第二季', url: 'https://forestworkcoders.github.io/ForestWorkSMPS2', icon: 'i-lucide-dice-2', external: true },
    { title: '第三季', url: 'https://forestworkcoders.github.io/ForestWorkSMPS3', icon: 'i-lucide-dice-3', external: true },
]
</script>

<template>
    <div class="relative flex-1 flex flex-col items-center justify-center p-6 text-center overflow-hidden">
        <!-- 1. 视频背景 -->
        <video autoplay loop muted playsinline class="absolute inset-0 w-full h-full object-cover pointer-events-none">
            <source src="/images/minecraftsmp/hero-bg.mp4" type="video/mp4">
        </video>

        <!-- 2. 暗化蒙版 (保证对比度) -->
        <div class="absolute inset-0 bg-gradient-to-b from-black/80 via-black/20 to-black/80 backdrop-blur-[2px] pointer-events-none"
            aria-hidden="true" />

        <!-- 3. 核心业务内容 -->
        <main class="relative z-10 max-w-md w-full flex flex-col items-center gap-6">
            <h1 class="text-4xl sm:text-5xl font-black tracking-tight text-white drop-shadow-md">
                林間SMP
            </h1>

            <!-- IP 复制交互按钮 -->
            <UButton color="primary" size="xl" variant="solid" :icon="copied ? 'i-lucide-check' : 'i-lucide-clipboard'"
                class="font-medium tracking-wide shadow-2xl hover:scale-105 transition-transform" @click="copy()">
                {{ copied ? '已複製到剪貼簿！' : 'Coming Soon' }}
            </UButton>

            <p class="text-gray-200 text-sm sm:text-base font-medium drop-shadow">
                林間小鎮 麥塊多人生存
            </p>

            <!-- 导航链接列表 -->
            <nav class="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full mt-4">
                <template v-for="link in navLinks" :key="link.title">
                    <UButton :to="link.url" :target="link.external ? '_blank' : undefined" color="neutral"
                        variant="solid" :icon="link.icon" class="justify-center backdrop-blur-sm transition-colors duration-200
             bg-white/10 hover:bg-white/20 border border-white/10
             dark:bg-black/10 dark:hover:bg-black/20 text-white dark:border-black/15">
                        {{ link.title }}
                    </UButton>
                </template>
            </nav>
        </main>
    </div>
</template>