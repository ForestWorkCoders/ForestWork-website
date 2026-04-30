<template>
  <div class="relative min-h-[calc(100vh-var(--ui-header-height))] flex items-center justify-center overflow-hidden">

    <div class="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 hover:scale-105"
      style="background-image: url('/images/hero-bg.jpg'); filter: brightness(0.4);"></div>

    <div class="relative z-10 flex flex-col items-center px-4 text-center">
      <img src="~/assets/images/forestwork-logo-white.png" alt="林間小鎮 ForestWork"
        class="w-48 md:w-64 lg:w-80 h-auto drop-shadow-2xl">

    </div>

    <div class="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white dark:from-gray-950 to-transparent">
    </div>
  </div>

  <UContainer class="py-20">
    <div class="text-center mb-12">
      <h2 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">Circuits · 競賽清單</h2>
      <p class="text-gray-500">探索林間小鎮的多元賽事與社群活動</p>
    </div>

    <div class="max-w-2xl mx-auto mb-16 px-4 flex flex-col gap-2"">
      <UInput v-model="searchQuery" icon="i-lucide-search" size="xl" placeholder="Search..." color="neutral"
        variant="outline" class="shadow-sm transition-all focus-within:ring-2 focus-within:ring-green-500/50" :ui="{
          base: 'py-4 rounded-full'
        }" />
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        <CircuitCard 
          v-for="item in filteredCircuits" 
          :key="item.id" 
          :item="item" 
        />
      </div>

    <div v-if="filteredCircuits.length === 0" class="text-center py-20">
      <UIcon name="i-lucide-ghost" class="size-12 text-gray-300 mx-auto mb-4" />
      <p class="text-gray-400">找不到相關競賽，試試別的關鍵字？</p>
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
    to: '/games/plazmaburst' 
  },
  { 
    id: 2, 
    title: 'Mahjong Soul', 
    icon: 'i-lucide-id-card-lanyard', 
    description: '雀魂林間小鎮常規積分賽',
    to: '/games/mahjongsoul/'
  },
  { 
    id: 3, 
    title: 'Minecraft UHC', 
    icon: 'i-lucide-pickaxe', 
    description: '超極限生存競賽',
    to: 'https://eaglepb2.gitbook.io/uhc_report/'
  },
]

// 2. 即時搜尋過濾邏輯
const filteredCircuits = computed(() => {
  if (!searchQuery.value) return circuits
  return circuits.filter(item =>
    item.title.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})
</script>