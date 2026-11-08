<script setup lang="ts">
// 定義傳入的資料型別
interface CircuitItem {
  id: number
  title: string
  icon: string
  description: string
  to: string // 現在這是必填項了
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
    <div class="bg-gray-100 dark:bg-gray-800 rounded-lg p-10 flex flex-col items-center justify-center relative overflow-hidden h-64 shadow-sm border border-transparent group-hover:border-green-500/50">
      
      <div class="w-32 h-32 bg-white dark:bg-gray-700 rounded flex items-center justify-center shadow-inner mb-6 transition-transform group-hover:scale-110">
        <UIcon :name="item.icon" class="size-16 text-gray-400 dark:text-gray-500" />
      </div>

      <h3 class="font-bold text-lg text-gray-800 dark:text-gray-200">{{ item.title }}</h3>
      
      <p class="text-sm text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity mt-2 text-center px-4 absolute bottom-4">
        {{ item.description }}
      </p>
    </div>
  </NuxtLink>
</template>