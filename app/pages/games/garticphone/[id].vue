<script setup lang="ts">
import { ref, shallowRef, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'

definePageMeta({
    layout: false
})

const route = useRoute()
const sessionId = route.params.id as string

useHead({
    link: [
        { rel: 'stylesheet', href: '/css/reveal.css' }
    ]
})

const { data: sessionData, error } = await useAsyncData(
    `gartic-session-${sessionId}`,
    () => $fetch<any>(`/data/${sessionId}.json`),
    { server: false }
)

type RevealDeck = InstanceType<typeof import('reveal.js').default>
const deck = shallowRef<RevealDeck | null>(null)
const isMounted = ref(false)
let overviewObserver: MutationObserver | null = null

// 概览模式防空雷达保持不变
const cleanOverviewHidden = () => {
    if (!deck.value || !deck.value.isOverview()) return
    const hiddenElements = document.querySelectorAll('.reveal [hidden], .reveal [aria-hidden="true"]')
    hiddenElements.forEach(el => {
        el.removeAttribute('hidden')
        el.removeAttribute('aria-hidden')
    })
}

// 核心状态机：纯由我们自己的矩阵算术驱动，拒绝第三方黑盒
const routes = ref({
    left: false,
    right: false,
    up: false,
    down: false
})

// ★★★ 核心修复：用绝对真理计算可通行方向（完全免疫 PC/Mobile 差异） ★★★
function updateRoutes() {
    if (!deck.value || !sessionData.value) return

    const { h, v } = deck.value.getIndices()
    const chains = sessionData.value.chains || []
    const totalCols = 1 + chains.length // 1 张封面 + N 条故事链

    // 1. 水平方向
    const canLeft = h > 0
    const canRight = h < totalCols - 1

    // 2. 垂直方向
    let canUp = false
    let canDown = false

    if (h === 0) {
        // 处于封面看板：上方撞墙；若右侧有链条，向下视为“开始对局”，双向放行
        canUp = false
        canDown = canRight
    } else {
        // 处于某条故事链：行数为 frames 数量 + 1（包含最后的 album.gif）
        const chainIndex = h - 1
        const currentChain = chains[chainIndex]
        if (currentChain) {
            const totalRows = (currentChain.frames?.length || 0) + 1
            canUp = v > 0
            canDown = v < totalRows - 1
        }
    }

    routes.value = {
        left: canLeft,
        right: canRight,
        up: canUp,
        down: canDown
    }
}

// 核心导航指令：直接呼叫底层原语，自带状态守卫
function goUp() {
    if (!deck.value || !routes.value.up) return
    deck.value.up()
}

function goDown() {
    if (!deck.value) return
    const { h } = deck.value.getIndices()
    if (h === 0) {
        // 封面按向下：直通第一条故事链
        deck.value.right()
    } else if (routes.value.down) {
        deck.value.down()
    }
}

function goLeft() {
    if (!deck.value || !routes.value.left) return
    deck.value.left()
}

function goRight() {
    if (!deck.value || !routes.value.right) return
    deck.value.right()
}

async function initDeck() {
    if (!isMounted.value || !sessionData.value || deck.value) return

    await nextTick()

    const Reveal = (await import('reveal.js')).default

    const instance = new Reveal({
        transition: 'slide',
        controls: true,
        progress: true,
        center: true,
        hash: false,
        keyboardCondition: 'focused',
        viewDistance: 50,
        mobileViewDistance: 20,
        navigationMode: 'default',
        touch: true
    })

    instance.on('overviewshown', () => {
        cleanOverviewHidden()
        if (!overviewObserver) {
            overviewObserver = new MutationObserver(() => {
                overviewObserver?.disconnect()
                cleanOverviewHidden()
                const slides = document.querySelector('.reveal .slides')
                if (slides && instance.isOverview()) {
                    overviewObserver?.observe(slides, {
                        attributes: true,
                        subtree: true,
                        attributeFilter: ['hidden', 'aria-hidden']
                    })
                }
            })
        }
        const slides = document.querySelector('.reveal .slides')
        if (slides) {
            overviewObserver.observe(slides, {
                attributes: true,
                subtree: true,
                attributeFilter: ['hidden', 'aria-hidden']
            })
        }
    })

    instance.on('slidechanged', () => {
        if (instance.isOverview()) {
            cleanOverviewHidden()
        }
        updateRoutes()
    })

    instance.on('overviewhidden', () => {
        if (overviewObserver) {
            overviewObserver.disconnect()
            overviewObserver = null
        }
    })

    await instance.initialize()
    deck.value = instance
    updateRoutes()
}

onMounted(() => {
    isMounted.value = true
    initDeck()
})

watch(sessionData, () => {
    initDeck()
})

onBeforeUnmount(() => {
    if (overviewObserver) {
        overviewObserver.disconnect()
        overviewObserver = null
    }
    if (deck.value) {
        deck.value.destroy()
        deck.value = null
    }

    if (import.meta.client) {
        document.documentElement.classList.remove('reveal-full-page')
        document.body.classList.remove('reveal-viewport')
        document.documentElement.style.overflow = ''
        document.documentElement.style.height = ''
        document.body.style.overflow = ''
        document.body.style.height = ''
        document.body.style.position = ''
        window.scrollTo(0, 0)
    }
})
</script>

<template>
    <div class="gartic-viewport bg-[#0f0c29]">
        <!-- 顶部返回逃生按钮 -->
        <NuxtLink to="/games/garticphone"
            class="fixed top-4 left-4 z-50 bg-amber-400 hover:bg-amber-300 text-black border-2 border-black px-4 py-2 rounded-lg font-black text-xs sm:text-sm shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all">
            &larr; 返回對局清單
        </NuxtLink>

        <!-- ★★★ 核心修复：添加 @touchstart.stop 等修饰符，彻底阻断移动端 touch 事件向 Reveal 冒泡 ★★★ -->
        <div class="fixed bottom-6 right-4 z-50 flex flex-col items-center gap-1.5 select-none touch-manipulation">
            <!-- 向上按键：上一帧 -->
            <button type="button" aria-label="Previous Frame (Up)" :disabled="!routes.up" @click="goUp"
                class="border-2 border-black w-10 h-10 rounded-lg font-black text-base shadow-[2px_2px_0px_0px_#000] transition-all flex items-center justify-center touch-manipulation"
                :class="routes.up
                    ? 'bg-white text-black hover:bg-gray-100 active:translate-y-0.5 cursor-pointer'
                    : 'bg-gray-700/60 text-gray-500 border-gray-600 shadow-none cursor-not-allowed pointer-events-none'">
                &uarr;
            </button>

            <!-- 中间水平行：切换故事链/玩家 -->
            <div class="flex items-center gap-1.5">
                <!-- 向左按键：上一位玩家/上一条链 -->
                <button type="button" aria-label="Previous Chain (Left)" :disabled="!routes.left" @click="goLeft"
                    class="border-2 border-black w-10 h-10 rounded-lg font-black text-base shadow-[2px_2px_0px_0px_#000] transition-all flex items-center justify-center touch-manipulation"
                    :class="routes.left
                        ? 'bg-white text-black hover:bg-gray-100 active:translate-x-0.5 cursor-pointer'
                        : 'bg-gray-700/60 text-gray-500 border-gray-600 shadow-none cursor-not-allowed pointer-events-none'">
                    &larr;
                </button>

                <!-- 向右按键：下一位玩家/下一条链 -->
                <button type="button" aria-label="Next Chain (Right)" :disabled="!routes.right" @click="goRight"
                    class="border-2 border-black w-10 h-10 rounded-lg font-black text-base shadow-[2px_2px_0px_0px_#000] transition-all flex items-center justify-center touch-manipulation"
                    :class="routes.right
                        ? 'bg-amber-400 text-black hover:bg-amber-300 active:translate-x-0.5 cursor-pointer'
                        : 'bg-gray-700/60 text-gray-500 border-gray-600 shadow-none cursor-not-allowed pointer-events-none'">
                    &rarr;
                </button>
            </div>

            <!-- 向下按键：下一帧（封面点击自动进入第一链） -->
            <button type="button" aria-label="Next Frame (Down)" :disabled="!routes.down" @click="goDown"
                class="border-2 border-black w-10 h-10 rounded-lg font-black text-base shadow-[2px_2px_0px_0px_#000] transition-all flex items-center justify-center touch-manipulation"
                :class="routes.down
                    ? 'bg-amber-400 text-black hover:bg-amber-300 active:translate-y-0.5 cursor-pointer'
                    : 'bg-gray-700/60 text-gray-500 border-gray-600 shadow-none cursor-not-allowed pointer-events-none'">
                &darr;
            </button>
        </div>

        <!-- 主展示区 -->
        <div v-if="sessionData" class="reveal">
            <div class="slides">
                <!-- 首页看板：采用 w-[90%] 消除短标题在移动端的缩放坍塌 -->
                <section>
                    <div
                        class="w-[90%] max-w-xl mx-auto bg-amber-300 border-4 border-black shadow-[6px_6px_0px_0px_#000] p-6 sm:p-8 rounded-xl">
                        <h2 class="text-2xl sm:text-4xl font-black text-black mb-4 uppercase tracking-wider">
                            {{ sessionData.title }}
                        </h2>
                        <div class="bg-white border-2 border-black p-2 mb-2 font-bold text-black text-sm sm:text-lg">
                            主題：{{ sessionData.topic }}
                        </div>
                        <div class="bg-sky-400 text-black border-2 border-black p-2 font-bold text-sm sm:text-lg">
                            出題人：{{ sessionData.author }}
                        </div>
                    </div>
                </section>

                <!-- 历史链条 -->
                <section v-for="chain in sessionData.chains" :key="chain.id">
                    <section v-for="(frameName, index) in chain.frames" :key="frameName">
                        <div class="flex flex-col items-center justify-center h-full px-2">
                            <div
                                class="bg-white border-4 border-black shadow-[6px_6px_0px_0px_#000] p-3 sm:p-4 rounded-xl max-w-2xl w-[92%] mx-auto">
                                <img :src="`${sessionData.baseUrl}/${chain.id}/${frameName}`"
                                    class="w-full border-2 border-black" alt="Gartic Frame">
                                <div
                                    class="mt-3 sm:mt-4 text-left font-black text-black text-base sm:text-xl flex justify-between items-center">
                                    <span>Round {{ index + 1 }}</span>
                                    <span
                                        class="bg-rose-400 text-black px-2.5 py-0.5 border-2 border-black text-xs sm:text-sm">Player</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    <!-- 完整动画 GIF -->
                    <section>
                        <div class="flex flex-col items-center justify-center h-full px-2">
                            <div
                                class="bg-amber-300 border-4 border-black shadow-[6px_6px_0px_0px_#000] p-3 sm:p-4 rounded-xl max-w-2xl w-[92%] mx-auto">
                                <h2 class="text-xl sm:text-2xl font-black text-black mb-3">完整動畫</h2>
                                <img :src="`${sessionData.baseUrl}/${chain.id}/album.gif`"
                                    class="w-full border-2 border-black" alt="Full Album">
                            </div>
                        </div>
                    </section>
                </section>
            </div>
        </div>
    </div>
</template>

<style scoped>
.gartic-viewport {
    width: 100vw;
    height: 100vh;
    height: 100dvh;
    position: relative;
    overflow: hidden;
    background-color: #0f0c29 !important;
}
</style>

<style>
/* 彻底消灭 Reveal 移动端默认白色背景泄漏 */
html,
body,
.reveal-viewport,
.reveal {
    background-color: #0f0c29 !important;
}

/* 概览模式穿透样式保持不变 */
.reveal [hidden],
.reveal [aria-hidden="true"],
.reveal-viewport [hidden],
.reveal-viewport [aria-hidden="true"] {
    display: block !important;
    opacity: 1 !important;
    visibility: visible !important;
}

.reveal .controls {
    display: none !important;
}
</style>