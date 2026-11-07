<script setup>
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'

const props = defineProps({
  // 接收從 JSON 傳來的 markdown 網址
  contentUrl: { 
    type: String, 
    required: false 
  }
})

// 1. 初始化 Markdown 解析器 (你可以依照需求加入外掛，例如表格支援)
const md = new MarkdownIt({
  html: true,       // 允許在 markdown 中寫 HTML 標籤
  breaks: true,     // 轉換 \n 為 <br>
  linkify: true     // 自動將網址轉為超連結
})

// 2. 從 Supabase Bucket 動態抓取 Markdown 檔案內容
const { data: markdownText, pending, error } = await useFetch(props.contentUrl, {
  // 防呆：如果沒有網址，就不發送請求
  immediate: !!props.contentUrl 
})

// 3. 將抓下來的純文字轉換為 HTML
const parsedHtml = computed(() => {
  if (!markdownText.value) return ''
  // 將 markdown 字串轉為 HTML
  return md.render(markdownText.value) 
})
</script>

<template>
  <div class="bg-white/90 dark:bg-[#1a1b26] p-8 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
    
    <div v-if="pending" class="flex flex-col items-center justify-center py-12 text-gray-500">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mb-4 text-emerald-500" />
      <p>正在載入賽事簡介...</p>
    </div>

    <div v-else-if="error" class="text-red-500 text-center py-8 font-bold">
      無法載入賽事內容，請確認檔案網址是否正確。
    </div>

    <div v-else-if="!contentUrl" class="text-gray-500 text-center py-8">
      尚未設定賽事內容。
    </div>

    <div 
      v-else 
      class="prose prose-emerald dark:prose-invert max-w-none 
             prose-h2:border-b prose-h2:border-emerald-500 prose-h2:pb-2 prose-h2:inline-block
             prose-a:text-blue-500 hover:prose-a:text-blue-400
             prose-img:rounded-xl prose-img:shadow-md"
      v-html="parsedHtml"
    >
    </div>

  </div>
</template>