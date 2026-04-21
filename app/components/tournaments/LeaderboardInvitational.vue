<script setup>
import { computed } from 'vue'

const props = defineProps({
  tournamentId: {
    type: String,
    required: true
  }
})
// 呼叫 API 取得排行榜資料
const { data: response, pending, error } = await useFetch(`/api/mahjong/tournaments/${props.tournamentId}/invitational-leaderboard`)

console.log(response.value)

// 定義 UTable 的 Columns (表頭契約)
const leaderboardColumns = computed(() => {
  const baseColumns = [
    { id: 'rank', accessorKey: 'rank', header: '排名', class: 'text-center w-20' },
    { id: 'player', accessorKey: 'name', header: '玩家 (Player)', class: 'min-w-[150px]' },
    { id: 'total', accessorKey: 'total', header: '總積分', class: 'text-right' }
  ]

  // API 給幾個月，這裡就長出幾根柱子
  const displayMonths = response.value?.meta?.months || []
  const monthCols = displayMonths.map(m => ({
    id: `month_${m.val}`,
    accessorKey: `month_${m.val}`,
    header: m.label,
    class: 'text-center text-gray-500 w-16'
  }))

  return [...baseColumns, ...monthCols]
})

// 4. 展平資料 (The Data Adapter)
// UTable 喜歡扁平的資料，我們把 player.months[1] 變成 row.month_1
const tableRows = computed(() => {
  if (!response.value?.data) return []

  const displayMonths = response.value.meta.months

  return response.value.data.map(p => {
    const row = {
      rank: p.rank,
      rank_diff: p.rank_diff,
      avatar: p.avatar,
      name: p.name,
      total: p.points,
    }
    // 只展開這個賽季要求的月份
    displayMonths.forEach(m => {
      row[`month_${m.val}`] = p.months[m.val] || '-'
    })
    return row
  })
})

// 裝飾邏輯
const getRankColor = (rank) => {
  if (rank <= 9) return 'text-green-400'
  return 'text-gray-400'
}
</script>

<template>
  <div class="space-y-6">
    <div class="border-b border-gray-200 dark:border-gray-800 pb-4">
      <h2 class="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">參賽資格積分榜 · Invitational Standings</h2>
      <p class="text-sm text-gray-500 mt-1">年度月賽積分明細累計排名。</p>
    </div>

    <div v-if="error" class="p-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
      無法載入排行榜：{{ error.message }}
    </div>

    <div v-else
      class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
      <UTable :columns="leaderboardColumns" :data="tableRows" :loading="pending"
        :empty-state="{ icon: 'i-lucide-database', label: '尚無玩家獲得積分' }" class="w-full" :ui="{
          td: { padding: 'py-3 px-4' },
          th: { padding: 'py-3 px-4', font: 'font-bold tracking-wider' }
        }">
        <template #rank-cell="{ row }">
          <div class="text-left font-black text-lg italic" :class="getRankColor(row.original.rank)">
            #{{ row.original.rank }}
          </div>
          <RankTrend :diff="row.original.rank_diff" />
        </template>

        <template #player-cell="{ row }">
          <div class="flex items-center gap-3 min-w-[150px]">
            <UAvatar :src="row.original.avatar" :alt="row.original.name" size="sm" class="ring-1 ring-white/10"
              :ui="{ fallback: { text: 'font-bold' } }" />
            <span class="font-bold text-gray-900 dark:text-gray-100">{{ row.original.name }}</span>
          </div>
        </template>

        <template #total-cell="{ row }">
          <div class="text-left font-black text-lg font-mono text-emerald-400 dark:text-emerald-500">
            {{ row.original.total }}
          </div>
        </template>

        <template v-for="m in response?.meta?.months || []" :key="m.val" #[`month_${m.val}-cell`]="{ row }">
          <div class="text-left font-mono text-sm"
            :class="row.original[`month_${m.val}`] !== '-' ? 'text-gray-300 font-bold' : 'text-gray-600/30'">
            {{ row.original[`month_${m.val}`] }}
          </div>
        </template>

      </UTable>
    </div>
  </div>
</template>