<script setup>
const props = defineProps({
  diff: {
    type: [Number, String],
    default: null // null 代表新進榜
  },
})
</script>

<template>
  <div class="flex items-center justify-center font-bold text-sm w-8">
    <span v-if="diff === null" class="flex items-center justify-center text-blue-400 bg-blue-500/20 px-1.5 py-0.5 rounded text-xs gap-1">
      <UIcon name="i-lucide-plus" class="w-3 h-3 text-white" />
    </span>

    <span v-else-if="diff === 0" class="text-gray-500 flex items-center">
      <UIcon name="i-lucide-minus" class="w-4 h-4" />
    </span>

    <span v-else-if="diff > 0 && diff < 4" class="text-emerald-500 flex items-center">
      <UIcon name="i-lucide-chevron-up" class="w-4 h-4" />
      {{ diff }}
    </span>

    <span v-else-if="diff >= 4" class="text-emerald-500 flex items-center">
      <UIcon name="i-lucide-chevrons-up" class="w-4 h-4" />
      {{ diff }}
    </span>

    <span v-else-if="diff < 0 && diff > -4" class="text-red-500 flex items-center">
      <UIcon name="i-lucide-chevron-down" class="w-4 h-4" />
      {{ Math.abs(diff) }}
    </span>

    <span v-else-if="diff <= -4" class="text-red-500 flex items-center">
      <UIcon name="i-lucide-chevrons-down" class="w-4 h-4" />
      {{ Math.abs(diff) }}
    </span>
  </div>
</template>