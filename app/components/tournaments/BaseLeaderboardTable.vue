<script setup>
const props = defineProps({
  // 从 JSON 接到的动态列: [{ key: 'game_1', label: '先鋒' }]
  columns: { type: Array, required: true }, 
  // 决定表头印 PLAYER 还是 TEAM
  entityType: { type: String, default: 'player' }, 
  // 排行榜数据
  data: { type: Array, required: true },
  promotedRanks: { type: Array, default: () => [] },
  disqualifiedRanks: { type: Array, default: () => [] },
  isFinal: { type: Boolean, default: false }
})

const tableColumns = computed(() => {
  // 1. 永恒不变的基础列
  const baseCols = [
    { id: 'rank', accessorKey: 'rank', header: 'RANK', class: 'text-center w-20' },
    { 
      id: 'entity', // 统一叫 entity，不再分 player 或 team
      accessorKey: 'name', 
      header: props.entityType === 'team' ? 'TEAM (隊伍)' : 'PLAYER (玩家)', 
      class: 'min-w-[150px]' 
    },
    { id: 'total', accessorKey: 'total', header: 'TOTAL', class: 'text-center w-24' }
  ]

  // 2. 将 JSON 配置翻译成 TanStack Table 格式
  const dynamicCols = props.columns.map(col => ({
    id: col.key,
    accessorKey: col.key,
    header: col.label,
    class: 'text-center text-gray-500 font-bold tracking-widest w-20'
  }))

  return [...baseCols, ...dynamicCols]
})

// 极其纯粹的高亮逻辑，没有任何关于"接力"还是"邀请赛"的废话
const getRankColor = (rank) => {
  if (props.isFinal) {
    if (rank === 1) return 'text-yellow-400 bg-yellow-400/10'
    if (rank === 2) return 'text-slate-300 bg-slate-300/10'
    if (rank === 3) return 'text-amber-600 bg-amber-600/10'
    return 'text-gray-500'
  }
  
  if (props.promotedRanks.includes(rank)) {
    return 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 shadow-[0_0_10px_rgba(52,211,153,0.1)]'
  }
  
  if (props.disqualifiedRanks.includes(rank)) {
    return 'text-red-400 bg-red-400/10 border border-red-400/20 opacity-75'
  }
  
  return 'text-gray-500'
}
</script>

<template>
  <div class="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
    <UTable 
      :columns="tableColumns" 
      :data="data"
      :ui="{ td: { padding: 'py-4 px-4' }, th: { padding: 'py-3 px-4', color: 'text-gray-500 dark:text-gray-400' } }"
    >
      <template #rank-cell="{ row }">
        <div class="text-center font-black text-xl italic px-2 py-1 rounded transition-colors"
             :class="getRankColor(row.original.rank)">
          #{{ row.original.rank }}
        </div>
      </template>

      <template #entity-cell="{ row }">
        <div class="flex items-center gap-3">
          <UAvatar :src="row.original.avatar" :alt="row.original.name" size="sm" />
          <span class="font-bold">{{ row.original.name }}</span>
        </div>
      </template>

      <template v-for="col in columns" :key="col.key" #[`${col.key}-cell`]="{ row }">
        <div class="text-center font-mono text-sm font-medium"
             :class="row.original[col.key] > 0 ? 'text-emerald-600 dark:text-emerald-400' : row.original[col.key] < 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-400'">
          {{ row.original[col.key] > 0 ? '+' : '' }}{{ row.original[col.key] ?? '-' }}
        </div>
      </template>
    </UTable>
  </div>
</template>