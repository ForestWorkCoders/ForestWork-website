<script setup lang="ts">
// A group's matches, round by round
import type { Round } from '~/types/phases'

defineProps<{ rounds: Round[] }>()
</script>

<template>
  <div v-if="rounds.length" class="space-y-6">
    <div class="border-b border-gray-100 dark:border-default pb-2">
      <h3 class="text-lg font-bold text-gray-800 dark:text-gray-200 tracking-wide flex items-center gap-2">
        <UIcon name="i-lucide-swords" class="w-5 h-5 text-gray-400" />
        對局紀錄 · Matches
      </h3>
    </div>

    <div v-for="round in rounds" :key="round.id">
      <h4 class="text-sm font-extrabold tracking-widest uppercase text-blue-600 dark:text-blue-400 mb-3">{{ round.title }}</h4>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <TournamentMatchCard v-for="match in round.matches" :key="match.id" :match="match" />
      </div>
    </div>
  </div>
</template>
