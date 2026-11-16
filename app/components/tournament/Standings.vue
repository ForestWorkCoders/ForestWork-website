<script setup lang="ts">
// A phase's standings: rank, entrant, then the phase's columns in order.
// Promotion / disqualification marks come from the phase; a final phase gets medals.
import type { Phase, Row } from '~/types/phases'
import { createSortableColumns } from '~/utils/table'

const props = defineProps<{ phase: Phase; rows: Row[] }>()

const isDnf = (rank: Row['rank']) => rank === 'DNF'

// UTable wants flat rows
const data = computed(() => props.rows.map(r => ({ rank: r.rank, name: r.entrant.name, avatar: r.entrant.avatar, ...r.stats })))

const MEDALS: Record<number, string> = {
  1: 'text-yellow-400 bg-yellow-400/10',
  2: 'text-slate-300 bg-slate-300/10',
  3: 'text-amber-600 bg-amber-600/10'
}

const rankClass = (rank: number) => {
  if (props.phase.final) return MEDALS[rank] ?? 'text-gray-500'
  if (props.phase.promotedRanks?.includes(rank)) return 'text-success bg-success/10 border border-success/20'
  if (props.phase.disqualifiedRanks?.includes(rank)) return 'text-error bg-error/10 border border-error/20 opacity-75'
  return 'text-gray-500'
}

// DNF sorts after every rank
const byRank = (a: any, b: any, id: string) => {
  const n = (v: unknown) => (v === 'DNF' || v == null ? Infinity : Number(v))
  return n(a.getValue(id)) - n(b.getValue(id))
}

const columns = computed(() => createSortableColumns([
  {
    id: 'rank', accessorKey: 'rank', header: 'RANK', size: 72, sortingFn: byRank,
    class: 'text-center w-[72px] min-w-[72px] max-w-[72px] z-[2] bg-white dark:bg-default border-r border-gray-100 dark:border-default'
  },
  {
    id: 'name', accessorKey: 'name', header: props.phase.entrant === 'team' ? 'TEAM' : 'PLAYER', size: 150,
    class: 'text-left w-[150px] min-w-[150px] z-[1] bg-white dark:bg-default pl-3'
  },
  ...props.phase.columns.map(c => ({
    id: c.key, accessorKey: c.key, header: c.label,
    class: c.main ? 'text-center w-16 sm:w-24 min-w-[64px] sm:min-w-[90px] px-1 sm:px-3' : 'text-center w-20'
  }))
]))

const signedClass = (v: number | null | undefined) =>
  v == null || v === 0 ? 'text-gray-400 dark:text-gray-500' : v > 0 ? 'text-success' : 'text-error'
</script>

<template>
  <BaseEsportsTable :columns="columns" :data="data" :pinned-left="['rank', 'name']" min-width-class="min-w-[700px]">
    <template #rank-cell="{ row }">
      <div class="flex items-center justify-center w-full px-1">
        <div v-if="isDnf(row.original.rank)"
          class="inline-block text-center font-bold text-xs font-mono tracking-wider px-2 py-0.5 rounded text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-elevated select-none">
          DNF
        </div>
        <div v-else class="inline-block text-center font-extrabold text-base sm:text-lg italic px-2 py-0.5 rounded transition-colors"
          :class="rankClass(row.original.rank)">
          #{{ row.original.rank }}
        </div>
      </div>
    </template>

    <template #name-cell="{ row }">
      <div class="flex items-center gap-2 sm:gap-3 w-full transition-opacity"
        :class="isDnf(row.original.rank) ? 'opacity-60 grayscale-[30%]' : 'opacity-100'">
        <UAvatar :src="row.original.avatar" :alt="row.original.name" size="xs" class="sm:hidden" />
        <UAvatar :src="row.original.avatar" :alt="row.original.name" size="sm" class="hidden sm:inline-flex" />
        <span class="font-bold text-xs sm:text-sm text-gray-900 dark:text-gray-100 truncate">{{ row.original.name }}</span>
      </div>
    </template>

    <template v-for="col in phase.columns" :key="col.key" #[`${col.key}-cell`]="{ row }">
      <div v-if="col.main" class="text-center font-bold text-sm sm:text-base font-mono"
        :class="isDnf(row.original.rank) ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-primary font-extrabold'">
        {{ row.original[col.key] }}
      </div>
      <div v-else class="text-center font-mono text-sm font-medium"
        :class="[isDnf(row.original.rank) ? 'opacity-60' : 'opacity-100', col.signed ? signedClass(row.original[col.key]) : '']">
        {{ col.signed && row.original[col.key] > 0 ? '+' : '' }}{{ row.original[col.key] ?? '-' }}
      </div>
    </template>
  </BaseEsportsTable>
</template>
