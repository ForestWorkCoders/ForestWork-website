<template>
  <div class="relative min-h-[35vh] sm:min-h-[50vh] flex items-center justify-center overflow-hidden">

    <div class="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 hover:scale-105"
      style="background-image: url('/images/hero-bg.jpg'); filter: brightness(0.4);"></div>

    <div class="relative z-10 flex flex-col items-center px-4 text-center">
  <!-- 🟢 替换原本死板的 PNG <img>，改用无损矢量直向组合 -->
  <div class="flex flex-col items-center justify-center gap-3 sm:gap-4 max-w-xs sm:max-w-sm md:max-w-md w-full drop-shadow-2xl">
    
    <!-- 1. Emblem 大徽标 (h-16 ~ h-24 弹性伸缩) -->
    <!-- Hidden on phones (the header shows the logo). Wrapper carries show/hide: classes on UColorModeImage reach both images -->
    <span class="hidden sm:block">
      <UColorModeImage
        light="/brand/svg/logo-white.svg"
        dark="/brand/svg/logo-white.svg"
        alt="ForestWork Emblem"
        class="sm:h-44 md:h-48 w-auto object-contain"
      />
    </span>

    <!-- 2. 双语字标组 (中文为主，英文为辅) -->
    <div class="flex flex-col items-center justify-center gap-1.5 sm:gap-2">
      <!-- 中文 Logotype (林間小鎮) -->
      <UColorModeImage
        light="/brand/svg/text-zh-white.svg"
        dark="/brand/svg/text-zh-white.svg"
        alt="林間小鎮"
        class="h-8 sm:h-10 md:h-12 w-auto object-contain"
      />
      <!-- 英文 Logotype (Forest Work) -->
      <UColorModeImage
        light="/brand/svg/text-en-white.svg"
        dark="/brand/svg/text-en-white.svg"
        alt="ForestWork"
        class="h-2.5 sm:h-3 md:h-3.5 w-auto object-contain opacity-90"
      />
    </div>

  </div>
</div>

    <div class="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#F7F9FC] dark:from-(--ui-bg) to-transparent">
    </div>
  </div>

  <UContainer class="pt-8 sm:pt-12 pb-20">
    <TournamentOngoing />

    <div class="text-center mb-12">
      <h2 class="text-3xl font-bold text-gray-900 dark:text-white mb-8">競賽清單 · Circuits</h2>
      <p class="text-muted">探索林間小鎮的多元賽事與社群活動</p>
    </div>

    <div class="max-w-2xl mx-auto mb-16 px-4 flex flex-col gap-2">
      <UInput v-model="searchQuery" icon="i-lucide-search" size="xl" placeholder="搜尋競賽 · Search circuits" color="neutral"
        variant="outline" class="shadow-sm transition-all focus-within:ring-2 focus-within:ring-primary/50" :ui="{
          base: 'py-4 rounded-full'
        }" />
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-8">
        <BaseCircuitCard 
          v-for="item in filteredCircuits" 
          :key="item.id" 
          :item="item" 
        />
      </div>

    <div v-if="filteredCircuits.length === 0" class="text-center py-20">
      <UIcon name="i-lucide-ghost" class="size-12 text-dimmed mx-auto mb-4" />
      <p class="text-muted">找不到相關競賽，試試別的關鍵字？</p>
    </div>
  </UContainer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const searchQuery = ref('')

// 1. 定義資料結構
const circuits = [
  { 
    id: 1, 
    title: 'Plazma Burst 2', 
    icon: 'i-lucide-crosshair', 
    description: '經典橫向捲軸射擊賽事',
    to: '/games/plazmaburst',
    keywords: 'PB2'
  },
  { 
    id: 2, 
    title: 'Mahjong Soul', 
    icon: 'i-lucide-playing-cards', 
    description: '雀魂林間小鎮常規積分賽',
    to: '/games/mahjongsoul/',
    keywords: '雀魂麻將 雀魂 麻將'
  },
  { 
    id: 3, 
    title: 'Minecraft UHC', 
    icon: 'i-lucide-pickaxe', 
    description: '超極限生存競賽',
    to: 'https://eaglepb2.gitbook.io/uhc_report/',
    keywords: '麥塊 超極限生存競賽'
  },
  { 
    id: 4, 
    title: 'Minecraft SMP', 
    icon: 'i-lucide-shield', 
    description: '多人生存競賽',
    to: '/games/minecraftsmp',
    keywords: '麥塊 多人生存'
  },
  { 
    id: 5, 
    title: 'Gartic Phone', 
    icon: 'i-lucide-palette', 
    description: '靈魂繪師',
    to: '/games/garticphone',
    keywords: '繪畫 林間靈魂繪師'
  },
]

// 2. 即時搜尋過濾邏輯
const filteredCircuits = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return circuits
  return circuits.filter(item =>
    `${item.title} ${item.description} ${item.keywords}`.toLowerCase().includes(q)
  )
})
</script>