<script setup>
const props = defineProps({
  diff: {
    type: [Number, String],
    default: null // null 代表新進榜
  },
})

const d = computed(() => {
  if (props.diff === null || props.diff === undefined || props.diff === '') return null
  const n = Number(props.diff)
  return Number.isNaN(n) ? null : n
})

const label = computed(() => {
  if (d.value === null) return '新進榜 · New entry'
  const n = Math.abs(d.value)
  if (n === 0) return '排名持平 · No change'
  if (d.value > 0) return `較上月上升 ${n} 名 · Up ${n} vs last month`
  return `較上月下降 ${n} 名 · Down ${n} vs last month`
})
</script>

<template>
  <div class="flex items-center justify-center font-bold text-sm w-8">
    <span v-if="d === null" :title="label" class="flex items-center justify-center text-blue-700 dark:text-blue-400 bg-blue-500/20 px-1.5 py-0.5 rounded text-xs gap-1">
      <UIcon name="i-lucide-plus" class="w-3 h-3" aria-hidden="true" />
      <span class="sr-only">{{ label }}</span>
    </span>

    <span v-else-if="d === 0" :title="label" class="text-muted flex items-center">
      <UIcon name="i-lucide-minus" class="w-4 h-4" aria-hidden="true" />
      <span class="sr-only">{{ label }}</span>
    </span>

    <span v-else-if="d > 0 && d < 4" :title="label" class="text-green-700 dark:text-green-400 flex items-center">
      <UIcon name="i-lucide-chevron-up" class="w-4 h-4" aria-hidden="true" />
      <span aria-hidden="true">{{ d }}</span>
      <span class="sr-only">{{ label }}</span>
    </span>

    <span v-else-if="d >= 4" :title="label" class="text-green-700 dark:text-green-400 flex items-center">
      <UIcon name="i-lucide-chevrons-up" class="w-4 h-4" aria-hidden="true" />
      <span aria-hidden="true">{{ d }}</span>
      <span class="sr-only">{{ label }}</span>
    </span>

    <span v-else-if="d < 0 && d > -4" :title="label" class="text-red-700 dark:text-red-400 flex items-center">
      <UIcon name="i-lucide-chevron-down" class="w-4 h-4" aria-hidden="true" />
      <span aria-hidden="true">{{ Math.abs(d) }}</span>
      <span class="sr-only">{{ label }}</span>
    </span>

    <span v-else-if="d <= -4" :title="label" class="text-red-700 dark:text-red-400 flex items-center">
      <UIcon name="i-lucide-chevrons-down" class="w-4 h-4" aria-hidden="true" />
      <span aria-hidden="true">{{ Math.abs(d) }}</span>
      <span class="sr-only">{{ label }}</span>
    </span>
  </div>
</template>
