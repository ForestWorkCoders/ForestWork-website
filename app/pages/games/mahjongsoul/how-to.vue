<script setup>
// 定義教學 PDF 檔案的路徑 (請確認檔案已放置於此路徑)
const pdfUrl = '/docs/MahjongHowTo2025.pdf'

// 設定網頁標題
useHead({
  title: '參賽教學指南 · How-To | 雀魂 Mahjong Soul'
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-[#1a1b26] py-12 px-4 sm:px-6 animate-fade-in">
    
    <UContainer class="max-w-5xl">
      <div class="flex flex-col mb-8 pb-6 border-b border-gray-200 dark:border-gray-800">
        <div class="flex items-center gap-2 mb-2">
          <UIcon name="i-lucide-book-open" class="w-6 h-6 text-emerald-600 dark:text-emerald-500" />
          <span class="text-sm font-bold text-emerald-600 dark:text-emerald-500 tracking-widest uppercase">Guide</span>
        </div>
        <h1 class="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
          參賽教學指南
        </h1>
        <p class="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2 tracking-wide">
          Mahjong Soul Tournament How-To Guide
        </p>
      </div>

      <div class="bg-white dark:bg-[#1e293b] rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700/50 flex flex-col relative group w-full">
        
        <div class="hidden md:flex flex-col w-full relative" style="height: 75vh; min-height: 600px;">
          <iframe 
            :src="`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`" 
            class="w-full flex-1 border-0 z-10 bg-white"
            title="雀魂參賽教學指南"
          ></iframe>
          <div class="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-[#18212f] z-0">
            <UIcon name="i-lucide-refresh" class="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        </div>

        <div class="flex md:hidden flex-col items-center justify-center py-20 px-6 text-center bg-gray-50 dark:bg-[#18212f]">
          <div class="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <UIcon name="i-heroicons-document-magnifying-glass" class="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 class="text-xl font-black text-gray-900 dark:text-white mb-3 tracking-wide">在手機上閱讀指南</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
            受限於行動裝置瀏覽器，為提供最佳的流暢滑動與閱讀體驗，請點擊下方按鈕以全螢幕模式開啟文件。
          </p>
          <UButton 
            :to="pdfUrl" 
            target="_blank" 
            color="emerald" 
            size="xl"
            icon="i-heroicons-arrow-top-right-on-square"
            class="font-bold tracking-widest shadow-md hover:shadow-lg transition-shadow"
            :ui="{ rounded: 'rounded-full' }"
          >
            全螢幕開啟教學
          </UButton>
        </div>

      </div>

    </UContainer>

  </div>
</template>