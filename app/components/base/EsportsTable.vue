<template>
  <div class="w-full">
    <UTable
      v-model:column-pinning="internalPinning"
      :columns="columns"
      :data="data"
      :loading="loading"
      :empty-state="emptyState"
      class="w-full"
      :ui="{
        root: 'overflow-x-auto w-full relative',
        // 核心：w-full 必须写在最前面，大屏撑满 100%，小屏靠 minWidthClass 兜底
        base: ['w-full border-separate border-spacing-0', minWidthClass || 'min-w-[850px]'].join(' '),
        th: 'whitespace-nowrap px-4 py-3.5 font-bold tracking-wider text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-[#18212f]',
        td: 'whitespace-nowrap px-4 py-3 text-gray-900 dark:text-gray-200 border-b border-gray-50 dark:border-gray-800/50 bg-white dark:bg-[#1e293b]'
      }"
    >
      <template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
        <slot :name="slotName" v-bind="slotProps" />
      </template>
    </UTable>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    columns: any[]
    data: any[]
    loading?: boolean
    emptyState?: { icon: string; label: string }
    minWidthClass?: string
    pinnedLeft?: string[]
  }>(),
  {
    loading: false,
    pinnedLeft: () => []
  }
)

// 响应外部传入的左侧固定列定义
const internalPinning = ref({
  left: props.pinnedLeft,
  right: []
})

watch(
  () => props.pinnedLeft,
  (newPins) => {
    internalPinning.value = { left: newPins, right: [] }
  }
)
</script>