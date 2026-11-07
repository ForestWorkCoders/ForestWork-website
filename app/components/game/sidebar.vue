<script setup>
// 定義這個組件可以接收的屬性 (Props)
defineProps({
  gameName: {
    type: String,
    required: true
  },
  coverImageLight: {
    type: String,
    required: true
  },
  coverImageDark: {
    type: String,
    required: true
  },
  // 描述可能有多個段落，所以我們要求傳入一個陣列
  description: {
    type: Array,
    default: () => []
  },
  // 連結會包含圖示和網址
  links: {
    type: Array,
    default: () => []
  }
})
</script>
<template>
  <div class="space-y-6">
            
    <div class="bg-gray-100 dark:bg-[#0f172a] border border-gray-200 dark:border-slate-800 rounded-lg p-3 text-center transition-colors duration-200">
      <h2 class="font-bold text-gray-900 dark:text-white tracking-widest text-sm transition-colors">{{ gameName }}</h2>
    </div>

    <UColorModeImage
     :light="coverImageLight"
     :dark="coverImageDark"
     :alt="gameName" 
     class="w-full object-contain drop-shadow-xl dark:drop-shadow-2xl hover:scale-105 transition-all duration-300"
    />

    <div v-if="description.length > 0" class="bg-white dark:bg-[#0f172a]/80 border border-gray-200 dark:border-slate-800 rounded-lg overflow-hidden transition-colors duration-200 shadow-sm dark:shadow-none">
      <div class="bg-gray-50 dark:bg-slate-900 p-2 text-center border-b border-gray-200 dark:border-slate-800 transition-colors">
        <span class="font-bold text-sm text-gray-900 dark:text-white">DESCRIPTION · 遊戲簡介</span>
      </div>
      <div class="p-4 text-xs text-gray-600 dark:text-gray-300 space-y-4 leading-relaxed transition-colors">
        <p v-for="(paragraph, index) in description" :key="index">
          {{ paragraph }}
        </p>
      </div>
    </div>

    <div v-if="links.length > 0" class="bg-white dark:bg-[#0f172a]/80 border border-gray-200 dark:border-slate-800 rounded-lg overflow-hidden transition-colors duration-200 shadow-sm dark:shadow-none">
      <div class="bg-gray-50 dark:bg-slate-900 p-2 text-center border-b border-gray-200 dark:border-slate-800 transition-colors">
        <span class="font-bold text-sm text-gray-900 dark:text-white">LINKS · 鏈接</span>
      </div>
      <div class="p-4 flex gap-2 justify-center">
        <UButton 
          v-for="(link, index) in links" 
          :key="index"
          :to="link.url"
          target="_blank"
          :icon="link.icon"
          color="gray"
          variant="solid"
          class="bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 transition-colors"
        />
      </div>
    </div>

  </div>
</template>