<script setup>
defineProps({
    tourney: {
        type: Object,
        required: true
    },
    gameSlug: {
        type: String,
        required: true
    }
})
</script>

<template>
  <div
    class="flex items-center justify-between p-3 sm:p-4 bg-white/90 hover:bg-gray-50 dark:bg-[#0f172a]/80 dark:hover:bg-[#1e293b]/90 border border-gray-200 dark:border-slate-800 rounded-lg transition-all shadow-sm hover:shadow-md dark:shadow-none gap-3"
  >
    <!-- 左侧：图标 + 信息容器（必须加 min-w-0 防止被 flex 撑爆） -->
    <div class="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
      <UAvatar
        :src="tourney.icon"
        :alt="tourney.title"
        size="lg"
        class="shrink-0"
        :ui="{
          rounded: 'rounded-md',
          fallback: { text: 'font-bold text-gray-500 dark:text-gray-400' }
        }"
      />

      <!-- 文字核心区：min-w-0 确保 truncate 与 wrap 正常生效 -->
      <div class="min-w-0 flex-1">
        <!-- 1. 标题：单行截断，移动端字号收紧 -->
        <h3 class="font-bold text-sm sm:text-base text-gray-900 dark:text-white truncate">
          {{ tourney.title }}
        </h3>

        <!-- 2. 元数据区：移动端支持自然折行 (flex-wrap)，间距自适应 -->
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
          <!-- Tier 标签 -->
          <span class="inline-flex items-center gap-1 font-medium whitespace-nowrap">
            <UIcon name="i-lucide-chart-column-increasing" class="w-3.5 h-3.5 shrink-0" />
            {{ tourney.tier }}
          </span>

          <!-- Region 标签 -->
          <span class="inline-flex items-center gap-1 whitespace-nowrap">
            <UIcon name="i-lucide-globe" class="w-3.5 h-3.5 shrink-0" />
            {{ tourney.region }}
          </span>

          <!-- 日期范围：锁定单项不折断 (whitespace-nowrap) -->
          <span class="inline-flex items-center gap-1 font-mono text-[11px] sm:text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
            <UIcon name="i-lucide-calendar" class="w-3.5 h-3.5 shrink-0" />
            {{ tourney.start_date }} - {{ tourney.end_date }}
          </span>
        </div>
      </div>
    </div>

    <!-- 右侧：按钮。移动端收敛 padding，在大屏保留完整 DETAILS 文字 -->
    <UButton
      color="gray"
      variant="ghost"
      trailing-icon="i-lucide-chevron-right"
      class="shrink-0 font-bold text-xs tracking-wider sm:tracking-widest text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors px-2 sm:px-3"
      :to="`/games/${gameSlug}/tournaments/${tourney.id}`"
    >
      <span class="hidden sm:inline">DETAILS</span>
    </UButton>
  </div>
</template>