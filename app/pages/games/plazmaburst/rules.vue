<script setup>
const pdfUrl = '/docs/PlazmaBurstRule2025.pdf'

const breadcrumbLinks = [
    { label: '首頁 · Home', icon: 'i-lucide-home', to: '/' },
    // 假設有一個遊戲大廳或賽事列表，如果沒有可以把這層刪掉
    { label: '賽事大廳 · Tournaments', icon: 'i-lucide-trophy', to: '/games/plazmaburst' },
    { label: '賽規 · Rules', icon: 'i-lucide-book-open' } // 當前頁面
]

// 設定網頁標題
useHead({
  title: '通用賽事規則 · General Rules | Plazma Burst 2'
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-[#1a1b26] pt-24 pb-12 px-4 sm:px-6 animate-fade-in">

    <UContainer class="max-w-5xl">

      <div class="mb-8 px-2 animate-fade-in">
        <UBreadcrumb 
                    :items="breadcrumbLinks" 
                    separator="i-lucide-chevron-right"
                    :ui="{
                        wrapper: 'flex flex-wrap items-center gap-1.5',
                        li: 'flex items-center gap-1.5',
                        base: 'text-sm font-semibold tracking-wide transition-colors',
                        active: 'text-emerald-500 dark:text-emerald-400 cursor-default drop-shadow-md',
                        inactive: 'text-gray-400 hover:text-emerald-500 dark:text-gray-500 dark:hover:text-emerald-400',
                        icon: { base: 'w-4 h-4', active: 'text-emerald-500', inactive: 'text-gray-500' },
                        separator: { base: 'w-4 h-4 text-gray-500' }
                    }"
                />
      </div>
      
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
            Plazma Burst 2 General Tournament Rules & Regulations
          </p>
        </div>
        
        <UButton 
          :to="pdfUrl" 
          target="_blank" 
          download="PB2 General Rules.pdf"
          icon="i-lucide-download" 
          color="gray" 
          variant="solid"
          class="shrink-0 font-bold tracking-wider hover:bg-gray-900 hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
        >
          下載 PDF 版
        </UButton>
      </div>

      <div class="bg-white dark:bg-[#1e293b] rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700/50 flex flex-col relative group w-full">
        
        <div class="hidden md:flex flex-col w-full relative" style="height: 75vh; min-height: 600px;">
          <iframe 
          :src="`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`" 
          class="w-full flex-1 border-0 z-10 bg-white"
          title="Plazma Burst 2 General Rules"
        ></iframe>
          <div class="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-[#18212f] z-0">
            <UIcon name="i-lucide-refresh" class="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        </div>

        <div class="flex md:hidden flex-col items-center justify-center py-20 px-6 text-center bg-gray-50 dark:bg-[#18212f]">
          <div class="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <UIcon name="i-heroicons-document-magnifying-glass" class="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 class="text-xl font-black text-gray-900 dark:text-white mb-3 tracking-wide">Read the rules on Mobile Devices</h3>
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
            How to read the rules on mobile
          </UButton>
        </div>

      </div>

    </UContainer>

  </div>
</template>