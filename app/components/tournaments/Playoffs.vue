<script setup>
import { computed } from 'vue'

const props = defineProps({
  tournamentId: {
    type: String,
    required: true
  }
})

// 調用我們剛剛寫好的防彈 API
const { data: brackets, pending, error } = await useFetch(`/api/plazmaburst/tournaments/${props.tournamentId}/bracket`)

// 判斷是否完全沒有賽程數據
const isEmpty = computed(() => {
  if (!brackets.value) return true
  return brackets.value.upperBracket.length === 0 && brackets.value.lowerBracket.length === 0
})
</script>

<template>
  <div class="space-y-12 animate-fade-in">
    
    <div v-if="pending" class="py-20 flex justify-center">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-blue-500" />
    </div>
    <div v-else-if="error" class="py-20 text-center text-red-500 font-bold">
      加載賽程失敗：{{ error.message }}
    </div>

    <div v-else-if="isEmpty" class="py-32 flex flex-col items-center justify-center text-gray-400 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900/50">
      <UIcon name="i-lucide-git-merge" class="w-12 h-12 mb-4 opacity-50" />
      <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-1">Brackets Not Seeded</h3>
      <p class="text-sm">淘汰賽賽程尚未排定，請等待小組賽結束。</p>
    </div>

    <div v-else class="space-y-16">
      
      <div v-if="brackets.upperBracket.length > 0" class="space-y-6">
        <div class="flex items-center gap-3 pl-2">
          <div class="w-1.5 h-6 bg-blue-500 rounded-full"></div>
          <h2 class="text-2xl font-black tracking-widest uppercase text-gray-900 dark:text-white">
            {{ brackets.lowerBracket.length > 0 ? 'Upper Bracket' : 'Playoffs Bracket' }}
          </h2>
        </div>
        <TournamentsBracket :upperBracket="brackets.upperBracket" :lowerBracket="brackets.lowerBracket" />
      </div>

      <div v-if="brackets.lowerBracket.length > 0" class="space-y-6 relative">
        <div class="absolute -top-8 left-0 right-0 border-t border-dashed border-gray-200 dark:border-gray-800"></div>
        
        <div class="flex items-center gap-3 pl-2">
          <div class="w-1.5 h-6 bg-red-500 rounded-full"></div>
          <h2 class="text-2xl font-black tracking-widest uppercase text-gray-900 dark:text-white">Lower Bracket</h2>
        </div>
        <TournamentsBracket :rounds="brackets.lowerBracket" />
      </div>
    </div>

    <div class="mt-16 pt-12 border-t-2 border-gray-100 dark:border-gray-800">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h2 class="text-2xl font-black tracking-widest uppercase text-gray-900 dark:text-white">Playoffs MVP & Stats</h2>
          <p class="text-sm text-gray-500 mt-1">季後賽個人數據排行榜</p>
        </div>
        <UIcon name="i-lucide-bar-chart-3" class="w-8 h-8 text-gray-300 dark:text-gray-700" />
      </div>

      <div class="relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div class="opacity-20 pointer-events-none select-none p-6 space-y-4">
          <div class="h-8 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
          <div class="h-12 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
          <div class="h-12 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
          <div class="h-12 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
        </div>
        
        <div class="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <div class="bg-white dark:bg-[#1a1c23] border border-gray-200 dark:border-gray-700 shadow-xl rounded-lg p-6 max-w-sm text-center">
            <div class="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <UIcon name="i-lucide-lock" class="w-6 h-6 text-blue-500" />
            </div>
            <h4 class="text-lg font-bold text-gray-900 dark:text-white mb-2">Stats Aggregation Pending</h4>
            <p class="text-sm text-gray-500 mb-6">
              季後賽個人數據統計面板正在構建中。這裡將會展示 KDR、MVP 以及高光擊殺數據。
            </p>
            <button disabled class="px-4 py-2 w-full text-sm font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-md cursor-not-allowed">
              Coming Soon
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>