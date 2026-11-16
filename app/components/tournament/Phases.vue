<script setup lang="ts">
// A tournament's results: a toggle when there is more than one phase (opens on the final, else the last),
// then the phase's heading, standings, bracket and matches.
// Slot `notice` ({ phase }) goes between the heading and the standings.
import type { Phase } from '~/types/phases'

const props = defineProps<{ phases: Phase[] | null | undefined }>()

const list = computed(() => props.phases ?? [])
// Unset until the reader picks a phase, so data arriving later still opens on the final
const activeId = ref<string>()
const phase = computed(() =>
  list.value.find(p => p.id === activeId.value) ?? list.value.find(p => p.final) ?? list.value.at(-1))
</script>

<template>
  <div v-if="phase" class="space-y-6 animate-fade-in">
    <div v-if="list.length > 1" class="flex justify-center">
      <div class="inline-flex flex-wrap justify-center bg-gray-100 dark:bg-accented p-1 rounded-xl border border-gray-200 dark:border-default">
        <button v-for="p in list" :key="p.id" type="button" @click="activeId = p.id"
          class="px-4 sm:px-6 py-2 rounded-lg text-sm font-bold transition-all duration-200" :class="p.id === phase.id
            ? 'bg-white dark:bg-elevated text-primary shadow-sm'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'">
          {{ p.title }}
        </button>
      </div>
    </div>

    <div class="border-b border-gray-200 dark:border-default pb-4">
      <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight flex flex-wrap items-center gap-x-3 gap-y-1"
        :class="phase.final ? 'text-secondary' : 'text-primary'">
        <UIcon :name="phase.final ? 'i-lucide-trophy' : 'i-lucide-flag'" />
        <span>{{ phase.title }}</span>
        <span v-if="phase.subtitle" class="text-gray-400 font-normal text-lg sm:text-xl tracking-wider">{{ phase.subtitle }}</span>
      </h2>
    </div>

    <slot name="notice" :phase="phase" />

    <div v-for="group in phase.groups" :key="group.id" class="space-y-10">
      <h3 v-if="group.title" class="text-xl font-bold text-gray-900 dark:text-white">{{ group.title }}</h3>
      <TournamentStandings v-if="group.standings" :phase="phase" :rows="group.standings" />
      <TournamentBracket v-if="group.sections?.length" :sections="group.sections" />
      <TournamentMatches :rounds="group.rounds" />
    </div>
  </div>

  <div v-else
    class="py-20 flex flex-col items-center justify-center text-gray-400 border border-dashed border-gray-200 dark:border-default rounded-xl bg-gray-50 dark:bg-elevated">
    <UIcon name="i-lucide-trophy" class="w-12 h-12 mb-4 opacity-50" />
    <p class="text-sm">尚無賽事結果。</p>
  </div>
</template>
