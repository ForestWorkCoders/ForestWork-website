<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// Background: the video loop, or a still image for visitors who ask their device for reduced motion.
// Decided in the browser, so a reduced-motion visitor never starts the video download.
const background = ref<'video' | 'still' | null>(null)
onMounted(() => {
    background.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'still' : 'video'
})

// 1. SEO 元数据
useSeoMeta({
    title: '林間SMP · ForestWork',
    ogTitle: '林間SMP · ForestWork',
    description: '林間小鎮多元化SMP多人生存伺服器 ⎯ 只供受邀請成員與實況主遊玩、交流。',
    ogDescription: '林間小鎮多元化SMP多人生存伺服器 ⎯ 只供受邀請成員與實況主遊玩、交流。',
    ogImage: SHARE_IMAGE_URL
})

// 2. 原生剪贴板逻辑
// The server address. Empty until the server opens: the button then shows "Coming Soon"
// and only answers with the joke, without touching the visitor's clipboard.
// Fill it in and the same button shows the address and copies it.
const serverIp = ''
const flash = ref<string | null>(null)

function show(text: string) {
    flash.value = text
    setTimeout(() => {
        flash.value = null
    }, 2000)
}

async function onClick() {
    if (!serverIp) return show('told you to coming soon :(')
    try {
        await navigator.clipboard.writeText(serverIp)
        show('已複製到剪貼簿！')
    } catch (err) {
        console.error('复制失败:', err)
    }
}

const buttonIcon = computed(() => {
    if (!serverIp) return 'i-lucide-hourglass'
    return flash.value ? 'i-lucide-check' : 'i-lucide-clipboard'
})

// 3. 季数导航链接
interface SeasonLink {
    title: string
    url: string
    icon: string
    external: boolean
}

const navLinks: SeasonLink[] = [
    { title: '第一季', url: 'https://forestwork-smp-s1.pages.dev', icon: 'i-lucide-dice-1', external: true },
    { title: '第二季', url: 'https://forestwork-smp-s2.pages.dev', icon: 'i-lucide-dice-2', external: true },
    { title: '第三季', url: 'https://forestwork-smp-s3.pages.dev', icon: 'i-lucide-dice-3', external: true },
]
</script>

<template>
    <div class="relative flex-1 flex flex-col items-center justify-center p-6 text-center overflow-hidden">
        <!-- 1. 视频背景 -->
        <video v-if="background === 'video'" autoplay loop muted playsinline
            class="absolute inset-0 w-full h-full object-cover pointer-events-none">
            <source src="/images/minecraftsmp/hero-bg.mp4" type="video/mp4">
        </video>
        <img v-else-if="background === 'still'" src="/images/minecraftsmp/hero-still.webp" alt="" aria-hidden="true"
            class="absolute inset-0 w-full h-full object-cover pointer-events-none">

        <!-- 2. 暗化蒙版 (保证对比度) -->
        <div class="absolute inset-0 bg-gradient-to-b from-black/80 via-black/20 to-black/80 backdrop-blur-[2px] pointer-events-none"
            aria-hidden="true" />

        <!-- 3. 核心业务内容 -->
        <main class="relative z-10 max-w-md w-full flex flex-col items-center gap-6">
            <h1 class="text-4xl sm:text-5xl font-extrabold tracking-tight text-white drop-shadow-md">
                林間SMP
            </h1>

            <!-- IP 复制交互按钮 -->
            <UButton color="primary" size="xl" variant="solid" :icon="buttonIcon"
                class="font-medium tracking-wide shadow-2xl hover:scale-105 transition-transform" @click="onClick()">
                {{ flash ?? (serverIp || 'Coming Soon') }}
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