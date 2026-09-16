<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'

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
let deck: RevealDeck | null = null
const isMounted = ref(false)

// 核心状态机：无论数据先到还是挂载先到，只且必定初始化一次
async function initDeck() {
    // 条件不齐备或已经初始化过，直接跳过（保证绝对幂等）
    if (!isMounted.value || !sessionData.value || deck) return

    // 关键：必须等 Vue 把 sessionData 渲染成真正的 <section> DOM 节点！
    await nextTick()

    const Reveal = (await import('reveal.js')).default

    deck = new Reveal({
        transition: 'slide',
        controls: true,
        progress: true,
        center: true,
        hash: false,
        keyboardCondition: 'focused',
        viewDistance: 50,
        mobileViewDistance: 20
    })

    // 1. 核心属性剥离纯函数
    const cleanOverviewHidden = () => {
        // 铁律：只在概览模式生效，绝不破坏常规播放模式的 DOM 结构
        if (!deck || !deck.isOverview()) return

        const hiddenElements = document.querySelectorAll('.reveal [hidden], .reveal [aria-hidden="true"]')
        hiddenElements.forEach(el => {
            el.removeAttribute('hidden')
            el.removeAttribute('aria-hidden')
        })
    }

    // 2. 概览专属 DOM 守门员
    let overviewObserver: MutationObserver | null = null

    // 场景 A：初次按下 Esc 唤起概览
    deck.on('overviewshown', () => {
        cleanOverviewHidden()

        // 挂载动态防空雷达：只要 Reveal 在概览中重新注入 hidden，微任务级瞬间抹除
        if (!overviewObserver) {
            overviewObserver = new MutationObserver(() => {
                // 先暂停监听防止自反死循环，清理完重新连接
                overviewObserver?.disconnect()
                cleanOverviewHidden()
                const slides = document.querySelector('.reveal .slides')
                if (slides && deck?.isOverview()) {
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

    // 场景 B：在概览模式下使用键盘方向键移动焦点切换 Slide
    deck.on('slidechanged', () => {
        if (deck?.isOverview()) {
            cleanOverviewHidden()
        }
    })

    // 场景 C：退出概览回到常规幻灯片播放
    deck.on('overviewhidden', () => {
        // 立即解除防空雷达，把 DOM 完全交还给常规单张轮播
        if (overviewObserver) {
            overviewObserver.disconnect()
            overviewObserver = null
        }
    })

    await deck.initialize()
}

onMounted(() => {
    isMounted.value = true
    // 场景 A（SPA 跳转）：此时数据早已就绪，直接初始化
    initDeck()
})

// 场景 B（F5 刷新）：挂载时数据还是 null，等数据拉回来的瞬间被 watch 捕获并补救初始化
watch(sessionData, () => {
    initDeck()
})

onBeforeUnmount(() => {
    if (deck) {
        deck.destroy()
        deck = null
    }
})
</script>

<style scoped>
.gartic-viewport {
    width: 100vw;
    height: 100vh;
    position: relative;
    overflow: hidden;
}
</style>

<!-- 核心双保险：直接由 Vite 编译，打破所有静态缓存，高权重压制 Tailwind -->
<style>
.reveal [hidden],
.reveal [aria-hidden="true"],
.reveal-viewport [hidden],
.reveal-viewport [aria-hidden="true"] {
    display: block !important;
    opacity: 1 !important;
    visibility: visible !important;
}
</style>

<template>
    <div class="gartic-viewport bg-purple-900" v-if="sessionData">
        <!-- 退出回到大厅的逃生舱按钮 -->
        <NuxtLink to="/games/garticphone"
            class="fixed top-4 left-4 z-50 bg-amber-400 hover:bg-amber-300 text-black border-2 border-black px-4 py-2 rounded-lg font-black text-sm shadow-[2px_2px_0px_0px_#000] transition-all">
            &larr; 返回對局清單
        </NuxtLink>

        <div class="reveal">
            <div class="slides">
                <!-- 首页看板：去掉多余的 data-transition -->
                <section>
                    <div
                        class="inline-block bg-amber-300 border-4 border-black shadow-[6px_6px_0px_0px_#000] p-8 rounded-xl">
                        <h2 class="text-4xl font-black text-black mb-4 uppercase tracking-wider">{{ sessionData.title }}
                        </h2>
                        <div class="bg-white border-2 border-black p-2 mb-2 font-bold text-black text-lg">
                            主題：{{ sessionData.topic }}
                        </div>
                        <div class="bg-sky-400 text-black border-2 border-black p-2 font-bold text-lg">
                            出題人：{{ sessionData.author }}
                        </div>
                    </div>
                </section>

                <!-- 历史链条：去掉外层和内层多余的 data-transition -->
                <section v-for="chain in sessionData.chains" :key="chain.id">
                    <section v-for="(frameName, index) in chain.frames" :key="frameName">
                        <div class="flex flex-col items-center justify-center h-full">
                            <div
                                class="bg-white border-4 border-black shadow-[6px_6px_0px_0px_#000] p-4 rounded-xl max-w-2xl w-full mx-auto">
                                <img :src="`${sessionData.baseUrl}/${chain.id}/${frameName}`"
                                    class="w-full border-2 border-black" alt="Gartic Frame">
                                <div
                                    class="mt-4 text-left font-black text-black text-xl flex justify-between items-center">
                                    <span>第{{ index + 1 }}幀</span>
                                    <span
                                        class="bg-emerald-400 text-black px-3 py-1 border-2 border-black text-sm">ForestWork</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    <!-- 完整动画 GIF -->
                    <section>
                        <div class="flex flex-col items-center justify-center h-full">
                            <div
                                class="bg-amber-300 border-4 border-black shadow-[6px_6px_0px_0px_#000] p-4 rounded-xl max-w-2xl w-full mx-auto">
                                <h2 class="text-2xl font-black text-black mb-3">完整動畫</h2>
                                <img :src="`${sessionData.baseUrl}/${chain.id}/album.gif`"
                                    class="w-full border-2 border-black" alt="Full Album">
                            </div>
                        </div>
                    </section>
                </section>
            </div>
        </div>
    </div>

    <div v-else-if="error" class="flex h-screen items-center justify-center bg-purple-950 text-white font-mono text-xl">
        載入對局失敗：{{ error.message }}
    </div>

    <div v-else class="flex h-screen items-center justify-center bg-purple-950 text-white font-mono text-2xl">
        LOADING GARTIC GALLERY...
    </div>
</template>