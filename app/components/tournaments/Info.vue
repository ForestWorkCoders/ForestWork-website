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
  <div class="bg-white dark:bg-[#1a1b26] text-gray-900 dark:text-gray-100 min-h-screen transition-colors duration-300">

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

    <div v-else class="markdown-body text-gray-900 dark:text-gray-100" v-html="parsedHtml"></div>

  </div>
</template>

<style scoped>
@reference "tailwindcss"; 

/* Linus 规则：绝对不要在这里写任何颜色和 dark: 前缀。
  所有的基础颜色由父组件的 div (text-gray-900 / dark:text-gray-100) 决定。
*/

.markdown-body :deep(h1) {
  @apply text-3xl font-bold mb-6 mt-8;
  /* 自动继承 100% 不透明的父元素文字颜色 */
}

.markdown-body :deep(h2) {
  @apply text-2xl font-bold mb-4 mt-8 border-b pb-2;
  /* 用 currentColor 让边框颜色自动跟随文字颜色，只保留 20% 透明度 */
  border-color: currentColor;
  opacity: 0.9;
}

.markdown-body :deep(h3) {
  @apply text-xl font-semibold mb-3 mt-6;
}

.markdown-body :deep(p) {
  @apply mb-4 leading-relaxed;
  /* 85% 的透明度。在白底上自动变成深灰，在黑底上自动变成浅灰。极度优雅。 */
  opacity: 0.85;
}

.markdown-body :deep(ul), .markdown-body :deep(ol) {
  @apply pl-6 mb-4 space-y-1;
  opacity: 0.85;
}

.markdown-body :deep(a) {
  @apply hover:underline;
  /* 祖母绿 500 是完美的中间色，在黑底和白底上都能清晰阅读 */
  color: #10b981; 
}

.markdown-body :deep(blockquote) {
  @apply border-l-4 pl-4 italic my-4;
  border-color: currentColor;
  opacity: 0.6;
}

.markdown-body :deep(> *:first-child) {
  @apply mt-0;
}
</style>