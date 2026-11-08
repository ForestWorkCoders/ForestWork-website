<script setup lang="ts">
const { data: sessions, status, error } = await useAsyncData('gartic-sessions', () => 
  $fetch<Array<{ 
    id: string; 
    year: string; 
    month: string; 
    phase: string; 
    mode?: string;
    title: string; 
    chainsCount: number 
  }>>('/data/index.json'),
  { server: false }
)

const sortedSessions = computed(() => {
  if (!sessions.value) return []
  return [...sessions.value].sort((a, b) => b.id.localeCompare(a.id))
})

// 为不同的玩法模式配置高对比度的波普色系（消除单调，赋予生命力）
function getModeBadgeClass(mode?: string) {
  switch (mode) {
    case '破冰遊戲':
    case '破冰':
      return 'bg-emerald-400 text-black'
    case '完成線條':
      return 'bg-purple-400 text-black'
    case '依樣畫葫蘆':
      return 'bg-rose-400 text-black'
    case '你畫我猜':
    default:
      return 'bg-amber-400 text-black'
  }
}

useSeoMeta({
  title: '林間靈魂繪師 · ForestWork',
  description: '選擇一個歷史對局，見證人類想像力的崩壞。'
})
</script>

<template>
  <!-- 背景采用深邃的午夜紫底，衬托上层高饱和度的彩色卡片 -->
  <div class="min-h-screen bg-[#0f0c29] px-4 py-12 text-white font-sans">
    
    <!-- 标头：经典粗边框波普招牌 -->
    <header class="max-w-6xl mx-auto mb-14 text-center">
      <div class="inline-block bg-amber-400 border-4 border-black shadow-[6px_6px_0px_0px_#000] px-8 py-4 rounded-2xl -rotate-1 hover:rotate-0 transition-transform">
        <h1 class="text-3xl sm:text-5xl font-black uppercase tracking-wider text-black">
          林間靈魂繪師 精彩重現
        </h1>
      </div>
      <p class="text-gray-300 font-bold text-lg mt-5 tracking-wide">
        選擇一個歷史對局，見證人類想像力的崩壞
      </p>
    </header>

    <main class="max-w-6xl mx-auto">
      <div v-if="status === 'pending'" class="text-center font-mono text-2xl text-amber-400 animate-pulse">
        LOADING ARCHIVES...
      </div>

      <div v-else-if="error" class="bg-rose-500 border-4 border-black shadow-[5px_5px_0px_0px_#000] p-6 rounded-xl text-white font-black text-center text-lg">
        致命錯誤：無法載入對局索引清單。請確認 public/data/index.json 是否存在！
      </div>

      <!-- 卡片网格 -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <NuxtLink 
          v-for="session in sortedSessions" 
          :key="session.id"
          :to="`/games/garticphone/${session.id}`"
          class="group block bg-white border-4 border-black rounded-2xl p-6 shadow-[5px_5px_0px_0px_#000] hover:shadow-[8px_8px_0px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-1 transition-all duration-200"
        >
          <!-- 顶部徽章区：彻底消灭白底白字 -->
          <div class="flex justify-between items-center mb-5">
            <!-- 1. 年月徽章：使用坚固鲜艳的深天蓝，字体纯白加粗 -->
            <span class="bg-sky-500 text-white text-xs font-black px-3 py-1.5 rounded-lg border-2 border-black uppercase shadow-[2px_2px_0px_0px_#000]">
              {{ session.year }}年{{ session.month }}月
            </span>

            <!-- 2. 模式徽章：动态波普色系，文字纯黑，清晰易读 -->
            <span 
              :class="getModeBadgeClass(session.mode)" 
              class="text-xs font-black px-3 py-1.5 rounded-lg border-2 border-black uppercase shadow-[2px_2px_0px_0px_#000]"
            >
              {{ session.mode || session.phase }}
            </span>
          </div>

          <!-- 主标题：Round <n>: <title>，悬停时亮起靛蓝高光 -->
          <h2 class="text-2xl font-black mb-4 text-black group-hover:text-indigo-600 transition-colors leading-snug">
            {{ session.title }}
          </h2>

          <!-- 底部故事链计数与动作引导 -->
          <div class="text-sm font-black text-gray-700 flex justify-between items-center mt-6 pt-4 border-t-2 border-black/10">
            <span class="flex items-center gap-1.5">
              故事鏈數量: 
              <span class="text-black font-black text-base">{{ session.chainsCount }}</span> 
              條
            </span>
            <span class="bg-black text-white px-3.5 py-1.5 rounded-lg text-xs font-black group-hover:bg-rose-500 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]">
              點擊進入 &rarr;
            </span>
          </div>
        </NuxtLink>
      </div>
    </main>
  </div>
</template>