<script setup>
import { computed } from 'vue'

const props = defineProps({
  tournamentId: { type: String, required: true }
})

// 1. 獲取資料
const { data: phasesData, pending, error } = await useFetch(`/api/mahjong/tournaments/${props.tournamentId}/playoffs-leaderboard`)

// 2. 動態生成表頭欄位 (The Dynamic Columns Factory)
// 傳入 gameCount，它就動態生出對應數量的 G1, G2, G3...
const getColumns = (gameCount) => {
  const baseCols = [
    { id: 'rank', accessorKey: 'rank', header: 'RANK', class: 'text-center w-20' },
    { id: 'player', accessorKey: 'name', header: 'PLAYER', class: 'min-w-[150px]' },
    { id: 'total', accessorKey: 'total', header: 'TOTAL', class: 'text-center w-24' }
  ]

  const gameCols = Array.from({ length: gameCount }, (_, i) => ({
    id: `game_${i + 1}`,
    accessorKey: `game_${i + 1}`,
    header: `G${i + 1}`,
    class: 'text-center text-gray-500 w-16'
  }))

  return [...baseCols, ...gameCols]
}

// 3. 終極高亮邏輯：由資料驅動 (Data-Driven Styling)
const getRankColor = (phase, rank) => {
  if (phase.isFinal) {
    // 總決賽：永遠是金銀銅
    if (rank === 1) return 'text-yellow-400 bg-yellow-400/10'
    if (rank === 2) return 'text-slate-300 bg-slate-300/10'
    if (rank === 3) return 'text-amber-600 bg-amber-600/10'
    return 'text-gray-500'
  } else {
    // 判斷該玩家是否在晉級名單中
    const isPromoted = phase.promotedRanks
      ? phase.promotedRanks.includes(rank)       // 新玩法：如果 API 給了 [1, 2, 4]，就檢查 rank 在不在裡面
      : rank <= (phase.promotionCount || 0)      // 舊玩法：如果沒給陣列，退回比較名額數量

    const isDisqualified = phase.disqualifiedRanks
      ? phase.disqualifiedRanks.includes(rank)   // 新玩法：如果 API 給了 [5, 6]，就檢查 rank 在不在裡面
      : false                                    // 舊玩法：沒有明確規定淘汰名單，所以先不處理
      
    if (isPromoted) {
      return 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20'
    }
    if (isDisqualified) {
      return 'text-red-400 bg-red-400/10 border border-red-400/20'
    }
    return 'text-gray-500'
  }
}
</script>

<template>
  <div class="space-y-16">
    <div v-if="pending" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="animate-spin w-8 h-8 text-emerald-500" />
    </div>
    <div v-else-if="error" class="text-red-500">載入失敗: {{ error.message }}</div>

    <template v-else v-for="phase in phasesData" :key="phase.id">
      <section class="space-y-6">

        <div class="border-b border-gray-200 dark:border-gray-800 pb-4">
          <h2
            class="text-3xl font-black tracking-tight text-gray-900 dark:text-white uppercase flex items-center gap-3">
            <span :class="phase.isFinal ? 'text-yellow-500' : 'text-emerald-500'">
              {{ phase.title }}
            </span>
            <span class="text-gray-400 font-normal text-xl">
              {{ phase.subtitle }}
            </span>
          </h2>
        </div>

        <div
          class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <UTable :columns="getColumns(phase.gameCount)" :data="phase.leaderboard"
            :ui="{ td: { padding: 'py-3 px-4' }, th: { padding: 'py-3 px-4' } }">
            <template #rank-cell="{ row }">
              <div class="text-center font-black text-xl italic px-2 py-1 rounded"
                :class="getRankColor(phase, row.original.rank)">
                #{{ row.original.rank }}
              </div>
            </template>

            <template #player-cell="{ row }">
              <div class="flex items-center gap-3">
                <UAvatar :src="row.original.avatar" :alt="row.original.name" size="sm" class="ring-1 ring-white/10" />
                <span class="font-bold text-gray-900 dark:text-gray-100">{{ row.original.name }}</span>
              </div>
            </template>

            <template #total-cell="{ row }">
              <div class="text-center font-black text-lg font-mono text-white">
                {{ row.original.total }}
              </div>
            </template>

            <template v-for="i in phase.gameCount" :key="i" #[`game_${i}-cell`]="{ row }">
              <div class="text-center font-mono text-sm"
                :class="row.original[`game_${i}`] > 0 ? 'text-emerald-400' : row.original[`game_${i}`] < 0 ? 'text-red-400' : 'text-gray-500'">
                {{ row.original[`game_${i}`] > 0 ? '+' : '' }}{{ row.original[`game_${i}`] || '-' }}
              </div>
            </template>

          </UTable>
        </div>

        <div class="mt-4 p-6 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800/60 bg-gray-50/50 dark:bg-gray-900/20 flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 transition-colors">
          <UIcon name="i-lucide-sticky-note" class="w-6 h-6 mb-2 opacity-50" />
          <span class="text-sm font-medium tracking-wide">備註保留區塊 · Sidenotes</span>
          <p class="text-xs mt-1 opacity-70">未來的裁判備註或賽事附註將顯示於此</p>
        </div>

        <div class="mb-6 border-b border-gray-200 dark:border-gray-800 pb-4">
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white tracking-wide">
                對局紀錄 <span class="text-gray-400 dark:text-gray-500 font-normal text-lg ml-2">Match Details</span>
            </h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          <TournamentsMatchCard v-for="match in phase.matches" :key="match.id" :match="match" />
        </div>

      </section>
    </template>
  </div>
</template>