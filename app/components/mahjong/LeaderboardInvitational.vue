<script setup>
import { createSortableColumns } from '~/utils/table'

const props = defineProps({
  tournamentId: { type: String, required: true }
})

const { data: response, pending, error } = await useFetch(`/api/mahjong/tournaments/${props.tournamentId}/invitational-leaderboard`)

const leaderboardColumns = computed(() => {
  const baseColumns = [
    { accessorKey: 'rank', header: '排名', class: 'w-20' },
    { accessorKey: 'name', header: '玩家 (Player)', class: 'min-w-[160px]' },
    { accessorKey: 'total', header: '總積分', class: 'text-left' }
  ]
  const displayMonths = response.value?.meta?.months || []
  const monthCols = displayMonths.map(m => ({
    accessorKey: `month_${m.val}`,
    header: m.label,
    class: 'text-left w-20'
  }))
  return createSortableColumns([...baseColumns, ...monthCols])
})

const tableRows = computed(() => {
  if (!response.value?.data) return []
  const displayMonths = response.value.meta?.months || []
  return response.value.data.map(p => {
    const row = {
      rank: p.rank,
      rank_diff: p.rank_diff,
      avatar: p.avatar,
      name: p.name,
      total: p.points,
    }
    displayMonths.forEach(m => {
      row[`month_${m.val}`] = p.months[m.val] || '-'
    })
    return row
  })
})

const getRankColor = (rank) => (rank <= 9 ? 'text-green-400' : 'text-gray-400')
</script>

<template>
  <div class="space-y-6">
    <div class="border-b border-gray-200 dark:border-gray-800 pb-4">
      <h2 class="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">參賽資格積分榜 · Invitational Standings</h2>
      <p class="text-sm text-gray-500 mt-1">年度月賽積分明細累計排名。</p>
    </div>

    <BaseEsportsTable
      :columns="leaderboardColumns"
      :data="tableRows"
      :loading="pending"
      :empty-state="{ icon: 'i-lucide-database', label: '尚無玩家獲得積分' }"
    >
      <template #rank-cell="{ row }">
        <div class="text-left font-black text-lg italic" :class="getRankColor(row.original.rank)">
          #{{ row.original.rank }}
        </div>
        <BaseRankTrend :diff="row.original.rank_diff" />
      </template>

      <template #name-cell="{ row }">
        <div class="flex items-center gap-3 min-w-[150px]">
          <UAvatar :src="row.original.avatar" :alt="row.original.name" size="sm" />
          <span class="font-bold text-gray-900 dark:text-gray-100">{{ row.original.name }}</span>
        </div>
      </template>

      <template #total-cell="{ row }">
        <div class="text-left font-black text-lg font-mono text-emerald-400 dark:text-emerald-500">
          {{ row.original.total }}
        </div>
      </template>

      <template v-for="m in response?.meta?.months || []" :key="m.val" #[`month_${m.val}-cell`]="{ row }">
        <div class="text-left font-mono text-sm" :class="row.original[`month_${m.val}`] !== '-' ? 'text-gray-300 font-bold' : 'text-gray-600/30'">
          {{ row.original[`month_${m.val}`] }}
        </div>
      </template>
    </BaseEsportsTable>
  </div>
</template>