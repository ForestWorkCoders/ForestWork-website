<script setup lang="ts">
// One match, one row per side: a duel has two rows, a mahjong table three or four.
// `url` opens the match: a replay for mahjong (new tab), the match page for PB2.
import type { Match } from '~/types/phases'

const props = defineProps<{ match: Match }>()

const external = computed(() => props.match.url?.startsWith('http'))
const signed = (v: number) => (v > 0 ? `+${v}` : `${v}`)
</script>

<template>
  <div
    class="bg-white dark:bg-elevated rounded-xl border border-gray-200 dark:border-default shadow-sm hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col">
    <div v-if="match.time || match.url || match.label"
      class="px-4 py-2 border-b border-gray-100 dark:border-default flex justify-between items-center gap-2 bg-gray-50/80 dark:bg-elevated">
      <span class="text-xs text-gray-500 dark:text-gray-400 font-mono">
        {{ match.time }}
        <span v-if="match.label" class="font-bold text-amber-500">{{ match.label }}</span>
      </span>
      <NuxtLink v-if="match.url" :to="match.url" :target="external ? '_blank' : undefined"
        class="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-accented px-2 py-0.5 rounded hover:bg-gray-300 dark:hover:bg-accented transition-colors">
        <UIcon :name="external ? 'i-lucide-external-link' : 'i-lucide-arrow-right'" class="w-3 h-3" />
        {{ external ? 'Replay' : 'Details' }}
      </NuxtLink>
    </div>

    <ul class="divide-y divide-gray-50 dark:divide-default text-sm">
      <li v-for="(side, i) in match.sides" :key="i"
        class="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-accented transition-colors">
        <span v-if="side.seat" class="w-5 font-bold"
          :class="side.winner ? 'text-amber-500 dark:text-amber-400 drop-shadow-sm' : 'text-gray-400 dark:text-gray-500'">
          {{ side.seat }}
        </span>
        <span v-else class="w-1.5 h-5 rounded-sm bg-gray-200 dark:bg-accented"
          :style="side.entrant?.colour ? { backgroundColor: side.entrant.colour } : {}" />

        <span class="flex-1 min-w-0 truncate text-gray-900 dark:text-gray-200"
          :class="side.winner ? 'font-bold' : 'font-medium'">
          {{ side.entrant?.name ?? 'TBD' }}
        </span>

        <span class="font-mono tracking-wide text-gray-800 dark:text-gray-300" :class="{ 'font-bold': side.winner }">
          {{ side.score?.toLocaleString() ?? '-' }}
        </span>

        <span v-if="side.points !== undefined" class="w-14 text-right font-mono font-bold"
          :class="side.points > 0 ? 'text-emerald-600 dark:text-emerald-400' : side.points < 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'">
          {{ signed(side.points) }}
        </span>
      </li>
    </ul>
  </div>
</template>
