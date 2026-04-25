<script setup>
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'

const props = defineProps({
  contentUrl: { 
    type: String, 
    default: null,
    required: false 
  }
})

// 1. 初始化 Markdown 解析器
const md = new MarkdownIt({
  html: true,       
  breaks: true,     
  linkify: true,     
  typographer: true 
})

// 2. 從 Supabase Bucket 動態抓取 Markdown 檔案內容
const { data: markdownRaw, pending, error } = await useAsyncData(
    `fetch-md-${props.contentUrl}`, 
    async () => {
        if (!props.contentUrl) return ''
        
        try {
            // 強制純文字解析
            const textContent = await $fetch(props.contentUrl, {
                responseType: 'text' 
            })
            return textContent
        } catch (e) {
            console.error('Markdown 抓取失敗:', e)
            throw new Error('無法讀取賽事規章。')
        }
    },
    {
        immediate: !!props.contentUrl,
        watch: [() => props.contentUrl]
    }
)

// 3. 將抓下來的純文字轉換為 HTML
const parsedHtml = computed(() => {
  // ★ 修復：這裡必須使用上面宣告的 markdownRaw！
  if (!markdownRaw.value) return ''
  return md.render(markdownRaw.value) 
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