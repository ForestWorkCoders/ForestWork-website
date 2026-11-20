<script setup lang="ts">
// 定義傳入的資料型別
interface CircuitItem {
  id: number
  title: string
  icon: string
  description: string
  to: string // 現在這是必填項了
  keywords?: string
}

defineProps<{
  item: CircuitItem
}>()
</script>

<template>
  <NuxtLink 
    :to="item.to" 
    :target="item.to.startsWith('http') ? '_blank' : '_self'"
    class="group block cursor-pointer transition-all duration-300 hover:-translate-y-2"
  >
    <div class="bg-gray-100 dark:bg-elevated rounded-lg flex flex-row items-center gap-4 p-4 text-left sm:flex-col sm:justify-center sm:p-10 sm:h-68 sm:text-center overflow-hidden shadow-sm border border-transparent group-hover:border-primary/50">

      <div class="w-14 h-14 sm:w-32 sm:h-32 shrink-0 bg-white dark:bg-accented rounded flex items-center justify-center shadow-inner sm:mb-3 transition-transform group-hover:scale-110">
        <UIcon :name="item.icon" class="size-8 sm:size-16 text-dimmed" />
      </div>

      <div class="min-w-0">
        <h3 class="font-bold text-lg text-gray-800 dark:text-gray-200">{{ item.title }}</h3>

        <p class="text-sm text-muted mt-2">
          {{ item.description }}
        </p>
      </div>
    </div>
  </NuxtLink>
</template>