<template>
  <BaseEsportsTable :columns="tableColumns" :data="data" :pinned-left="['rank', 'name']"
    min-width-class="min-w-[700px]">
    <!-- 所有 template 插槽原封不动保留 -->
    <template #rank-cell="{ row }">
      <div class="flex items-center justify-center w-full px-1">
        <div v-if="isDnfRow(row)"
          class="inline-block text-center font-bold text-[11px] font-mono tracking-wider px-2 py-0.5 rounded text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800/50 select-none">
          DNF
        </div>
        <div v-else
          class="inline-block text-center font-black text-base sm:text-lg italic px-2 py-0.5 rounded transition-colors"
          :class="getRankColor(row.original.rank)">
          #{{ row.original.rank }}
        </div>
      </div>
    </template>

    <template #name-cell="{ row }">
      <div class="flex items-center gap-2 sm:gap-3 w-full transition-opacity"
        :class="isDnfRow(row) ? 'opacity-60 grayscale-[30%]' : 'opacity-100'">
        <UAvatar :src="row.original.avatar" :alt="row.original.name" size="2xs" class="sm:hidden" />
        <UAvatar :src="row.original.avatar" :alt="row.original.name" size="sm" class="hidden sm:inline-flex" />
        <span class="font-bold text-xs sm:text-sm text-gray-900 dark:text-gray-100 truncate">
          {{ row.original.name }}
        </span>
      </div>
    </template>

    <template #total-cell="{ row }">
      <div class="text-center font-bold text-sm sm:text-base font-mono"
        :class="isDnfRow(row) ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-emerald-500 dark:text-emerald-400 font-black'">
        {{ row.original.total }}
      </div>
    </template>

    <template v-for="col in columns" :key="col.key" #[`${col.key}-cell`]="{ row }">
      <div class="text-center font-mono text-sm font-medium" :class="[
        isDnfRow(row) ? 'opacity-60' : 'opacity-100',
        row.original[col.key] > 0
          ? 'text-emerald-600 dark:text-emerald-400'
          : row.original[col.key] < 0
            ? 'text-red-500 dark:text-red-400'
            : 'text-gray-400 dark:text-gray-500'
      ]">
        {{ row.original[col.key] > 0 ? '+' : '' }}{{ row.original[col.key] ?? '-' }}
      </div>
    </template>
  </BaseEsportsTable>
</template>

<script setup>
import { computed } from 'vue'
import { createSortableColumns } from '~/utils/table'

const props = defineProps({
  columns: { type: Array, required: true },
  entityType: { type: String, default: 'player' },
  data: { type: Array, required: true },
  promotedRanks: { type: Array, default: () => [] },
  disqualifiedRanks: { type: Array, default: () => [] },
  isFinal: { type: Boolean, default: false }
})

const isDnfRow = (row) => {
  const orig = row?.original || row
  return orig?.is_dnf || orig?.rank === 'DNF' || String(orig?.rank).includes('DNF')
}

const tableColumns = computed(() => {
  const baseCols = [
    {
      id: 'rank',
      accessorKey: 'rank',
      header: 'RANK',
      size: 72,
      class: 'text-center w-[72px] min-w-[72px] max-w-[72px] z-[2] bg-white dark:bg-[#1e293b] border-r border-gray-100 dark:border-slate-800/80',
      // 核心：自定义排序函数，将 DNF 映射为无穷大，其余按纯数字比较！
      sortingFn: (rowA, rowB, columnId) => {
        const valA = rowA.getValue(columnId)
        const valB = rowB.getValue(columnId)

        const numA = (valA === 'DNF' || valA == null) ? Infinity : Number(valA)
        const numB = (valB === 'DNF' || valB == null) ? Infinity : Number(valB)

        return numA - numB
      }
    },
    {
      id: 'name',
      accessorKey: 'name',
      header: props.entityType === 'team' ? 'TEAM' : 'PLAYER',
      size: 150,
      // 核心：z-1 层级稍低，实色背景，给左侧留出充足 padding 避免贴脸
      class: 'text-left w-[150px] min-w-[150px] z-[1] bg-white dark:bg-[#1e293b] pl-3'
    },
    {
      id: 'total',
      accessorKey: 'total',
      header: 'TOTAL',
      // 移动端 70px，PC端 90px
      class: 'text-center w-16 sm:w-24 min-w-[64px] sm:min-w-[90px] px-1 sm:px-3'
    }
  ]

  const dynamicCols = (props.columns || []).map(col => ({
    id: col.key,
    accessorKey: col.key,
    header: col.label || col.key,
    class: 'text-center w-20'
  }))

  return createSortableColumns([...baseCols, ...dynamicCols])
})

const getRankColor = (rank) => {
  if (props.isFinal) {
    if (rank === 1) return 'text-yellow-400 bg-yellow-400/10'
    if (rank === 2) return 'text-slate-300 bg-slate-300/10'
    if (rank === 3) return 'text-amber-600 bg-amber-600/10'
    return 'text-gray-500'
  }
  if (props.promotedRanks.includes(rank)) {
    return 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20'
  }
  if (props.disqualifiedRanks.includes(rank)) {
    return 'text-red-400 bg-red-400/10 border border-red-400/20 opacity-75'
  }
  return 'text-gray-500'
}
</script>