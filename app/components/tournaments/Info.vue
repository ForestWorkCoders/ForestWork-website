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


      <div v-else class="markdown-body" v-html="parsedHtml"></div>



  </div>
</template>

<style scoped>
@reference "tailwindcss";

/* 使用 :deep() 穿透作用域，命中 v-html 内部的元素 */
.markdown-body :deep(h1) {
  @apply text-3xl font-bold mb-6 mt-8 text-gray-900 dark:text-white;
}

.markdown-body :deep(h2) {
  @apply text-2xl font-bold mb-4 mt-8 border-b pb-2 border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-100;
}

.markdown-body :deep(h3) {
  @apply text-xl font-semibold mb-3 mt-6 text-gray-800 dark:text-gray-100;
}

.markdown-body :deep(p) {
  @apply mb-4 leading-relaxed text-gray-600 dark:text-gray-300;
}

.markdown-body :deep(ul) {
  @apply list-disc pl-6 mb-4 text-gray-600 dark:text-gray-300 space-y-1;
}

.markdown-body :deep(ol) {
  @apply list-decimal pl-6 mb-4 text-gray-600 dark:text-gray-300 space-y-1;
}

.markdown-body :deep(a) {
  @apply text-emerald-600 dark:text-emerald-400 hover:underline;
}

.markdown-body :deep(strong) {
  @apply font-bold text-gray-900 dark:text-white;
}

.markdown-body :deep(blockquote) {
  @apply border-l-4 border-gray-300 dark:border-gray-700 pl-4 italic text-gray-500 dark:text-gray-400 my-4;
}

/* 确保第一个元素的顶部没有多余空白 */
.markdown-body :deep(> *:first-child) {
  @apply mt-0;
}
</style>