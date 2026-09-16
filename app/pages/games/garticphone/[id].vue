<script setup lang="ts">
definePageMeta({
  layout: false
})

const route = useRoute()
const sessionId = route.params.id as string

// 1. 声明式挂载样式：只在当前全屏画廊挂载，切走时 Nuxt 自动拔除，绝不污染全局
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

onMounted(async () => {
  if (!sessionData.value) return

  // 2. 核心 JS 引擎按需加载
  const Reveal = (await import('reveal.js')).default

  // 彻底删掉那行该死的 await import("reveal.js/dist/reveal.css")！

  deck = new Reveal({
    transition: 'slide',
    controls: true,
    progress: true,
    center: true,
    hash: false, // 铁律：不劫持路由
    keyboardCondition: 'focused',
    viewDistance: 50,
    mobileViewDistance: 20,
  })
  
  await deck.initialize()
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

<template>
  <div class="gartic-viewport bg-purple-900" v-if="sessionData">
    <!-- 退出回到大厅的逃生舱按钮 -->
    <NuxtLink 
      to="/games/garticphone" 
      class="fixed top-4 left-4 z-50 bg-amber-400 hover:bg-amber-300 text-black border-2 border-black px-4 py-2 rounded-lg font-black text-sm shadow-[2px_2px_0px_0px_#000] transition-all"
    >
      &larr; 返回對局清單
    </NuxtLink>

    <div class="reveal">
      <div class="slides">
        <section data-transition="slide">
          <div class="inline-block bg-amber-300 border-4 border-black shadow-[6px_6px_0px_0px_#000] p-8 rounded-xl">
            <h2 class="text-4xl font-black text-black mb-4 uppercase tracking-wider">{{ sessionData.title }}</h2>
            <div class="bg-white border-2 border-black p-2 mb-2 font-bold text-black text-lg">
              主題：{{ sessionData.topic }}
            </div>
            <div class="bg-sky-400 text-black border-2 border-black p-2 font-bold text-lg">
              出題人：{{ sessionData.author }}
            </div>
          </div>
        </section>

        <section data-transition="slide" v-for="chain in sessionData.chains" :key="chain.id">
          <section v-for="(frameName, index) in chain.frames" :key="frameName">
            <div class="flex flex-col items-center justify-center h-full">
              <div class="bg-white border-4 border-black shadow-[6px_6px_0px_0px_#000] p-4 rounded-xl max-w-2xl w-full mx-auto">
                <img :src="`${sessionData.baseUrl}/${chain.id}/${frameName}`" class="w-full border-2 border-black" alt="Gartic Frame">
                <div class="mt-4 text-left font-black text-black text-xl flex justify-between items-center">
                  <span>Round {{ index + 1 }}</span>
                  <span class="bg-rose-400 text-black px-3 py-1 border-2 border-black text-sm">Player</span>
                </div>
              </div>
            </div>
          </section>

          <section data-transition="slide">
            <div class="flex flex-col items-center justify-center h-full">
              <div class="bg-amber-300 border-4 border-black shadow-[6px_6px_0px_0px_#000] p-4 rounded-xl max-w-2xl w-full mx-auto">
                <h2 class="text-2xl font-black text-black mb-3">完整動畫</h2>
                <img :src="`${sessionData.baseUrl}/${chain.id}/album.gif`" class="w-full border-2 border-black" alt="Full Album">
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