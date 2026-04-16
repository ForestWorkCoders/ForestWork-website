<script setup>
// 定義 PDF 檔案的路徑 (對應到 public/docs/MahjongRule2025.pdf)
const pdfUrl = '/docs/MahjongRule2025.pdf'

// 設定網頁標題
useHead({
  title: '通用賽事規則 · General Rules | 雀魂 Mahjong Soul'
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-[#1a1b26] py-12 px-4 sm:px-6 animate-fade-in">
    
    <UContainer class="max-w-5xl">
      
      <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8 pb-6 border-b border-gray-200 dark:border-gray-800">
        <div>
          <div class="flex items-center gap-2 mb-2">
            <UIcon name="i-lucide-file-text" class="w-6 h-6 text-amber-600 dark:text-amber-500" />
            <span class="text-sm font-bold text-amber-600 dark:text-amber-500 tracking-widest uppercase">Rulebook</span>
          </div>
          <h1 class="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
            賽事通用規則
          </h1>
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2 tracking-wide">
            Mahjong Soul General Tournament Rules & Regulations
          </p>
        </div>
        
        <UButton 
          :to="pdfUrl" 
          target="_blank" 
          download="雀魂通用賽事規則.pdf"
          icon="i-lucide-download" 
          color="gray" 
          variant="solid"
          class="shrink-0 font-bold tracking-wider hover:bg-gray-900 hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
        >
          下載 PDF 版
        </UButton>
      </div>

      <div 
        class="bg-white dark:bg-[#1e293b] rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700/50 flex flex-col relative group w-full"
        style="height: 75vh; min-height: 600px;"
      >
        
        <iframe 
          :src="`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`" 
          class="w-full flex-1 border-0 z-10 bg-white"
          title="雀魂賽事通用規則"
        ></iframe>

        <div class="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-[#18212f] z-0">
          <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-gray-400 animate-spin" />
        </div>

      </div>

    </UContainer>

  </div>
</template>