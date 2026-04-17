<script setup>
const props = defineProps({
  tournamentId: {
    type: String,
    required: true
  }
})

// 1. 獲取資料 (這裡假設你已經用 as 修復了型別)
const { data: leaderboard, pending, error } = await useFetch(`/api/mahjong/tournaments/${props.tournamentId}/invitational-leaderboard`)

// 2. 定義你要顯示的月份
const displayMonths = [
  { val: 1, label: 'JAN' }, { val: 2, label: 'FEB' }, { val: 3, label: 'MAR' },
  { val: 4, label: 'APR' }, { val: 5, label: 'MAY' }, { val: 6, label: 'JUN' },
  { val: 7, label: 'JUL' }, { val: 8, label: 'AUG' }, { val: 9, label: 'SEP' },
  { val: 10, label: 'OCT' }, { val: 11, label: 'NOV' }
]

// 3. 定義 UTable 的 Columns (表頭契約)
const columns = computed(() => {
  const baseCols = [
    { id: 'rank', accessorKey: 'rank', header: '排名', class: 'text-center w-20' },
    { id: 'player', accessorKey: 'player', header: '玩家' },
    { id: 'total', accessorKey: 'total', header: '總積分', class: 'text-right' }
  ]
  
  // 動態把月份推入 columns
  const monthCols = displayMonths.map(m => ({
    id: `month_${m.val}`, 
    accessorKey: m.label,
    header: m.label,
    class: 'text-center text-gray-500' // 控制表頭樣式
  }))

  return [...baseCols, ...monthCols]
})

// 4. 展平資料 (The Data Adapter)
// UTable 喜歡扁平的資料，我們把 player.months[1] 變成 row.month_1
const tableRows = computed(() => {
  if (!leaderboard.value) return []
  
  return leaderboard.value.map(p => {
    const row = {
      rank: p.rank,
      avatar: p.avatar,
      name: p.name,
      total: p.points,
    }
    // 展開月份
    displayMonths.forEach(m => {
      row[`month_${m.val}`] = p.months[m.val] || '-'
    })
    return row
  })
})

// 裝飾邏輯
const getRankColor = (rank) => {
  if (rank === 1) return 'text-yellow-400'
  if (rank === 2) return 'text-slate-300'
  if (rank === 3) return 'text-amber-600'
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

    <div v-else class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
      <UTable 
        :columns="columns" 
        :data="tableRows" 
        :loading="pending"
        :empty-state="{ icon: 'i-lucide-database', label: '尚無玩家獲得積分' }"
        class="w-full"
        :ui="{
          td: { padding: 'py-3 px-4' },
          th: { padding: 'py-3 px-4', font: 'font-bold tracking-wider' }
        }"
      >
        <template #rank-cell="{ row }">
          <div class="text-center font-black text-lg italic" :class="getRankColor(row.rank)">
            #{{ row.original.rank }}
          </div>
        </template>

        <template #player-cell="{ row }">
          <div class="flex items-center gap-3 min-w-[150px]">
            <UAvatar 
              :src="row.original.avatar" 
              :alt="row.original.name" 
              size="sm"
              class="ring-1 ring-white/10"
              :ui="{ fallback: { text: 'font-bold' } }"
            />
            <span class="font-bold text-gray-900 dark:text-gray-100">{{ row.original.name }}</span>
          </div>
        </template>

        <template #total-cell="{ row }">
          <div class="text-right font-black text-lg font-mono text-emerald-400 dark:text-emerald-500">
            {{ row.original.total }}
          </div>
        </template>

        <template v-for="m in displayMonths" :key="m.val" #[`month_${m.val}-cell`]="{ row }">
          <div 
            class="text-center font-mono text-sm"
            :class="row.original[`month_${m.val}`] !== '-' ? 'text-gray-300 font-bold' : 'text-gray-600/30'"
          >
            {{ row.original[`month_${m.val}`] }}
          </div>
        </template>

        </UTable>
    </div>
  </div>
</template>