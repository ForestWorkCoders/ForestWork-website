<script setup>
defineProps({
  matches: {
    type: Array,
    default: () => []
  }
})
</script>

<template>
  <div v-if="matches && matches.length > 0">
    <div class="mb-4 border-b border-gray-100 dark:border-gray-800/50 pb-2">
      <h3 class="text-lg font-bold text-gray-800 dark:text-gray-200 tracking-wide flex items-center gap-2">
        <UIcon name="i-lucide-swords" class="w-5 h-5 text-gray-400" />
        對局紀錄
      </h3>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <TournamentsMatchCard v-for="match in matches" :key="match.id" :match="match" />
    </div>
  </div>
</template>