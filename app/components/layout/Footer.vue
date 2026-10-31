<script setup lang="ts">
// 斯巴达式纯粹：纯静态组件，零多余样板代码
</script>

<template>
  <UFooter>
    <!-- 左侧：版权声明 + 站内工具/资源入口 -->
    <template #left>
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400 font-mono">
        <span>Copyright © {{ new Date().getFullYear() }} ForestWork. All rights reserved.</span>

        <!-- 1. 品牌资源中心入口 -->
        <span class="hidden sm:inline text-gray-300 dark:text-zinc-700">|</span>
        <NuxtLink
          to="/brand"
          class="hover:text-[#4C7766] dark:hover:text-emerald-400 font-bold transition-colors"
        >
          品牌資源
        </NuxtLink>

        <!-- 2. 抽奖工具入口 -->
        <span class="hidden sm:inline text-gray-300 dark:text-zinc-700">|</span>
        <NuxtLink
          to="/tools/giveaway"
          class="hover:text-[#4C7766] dark:hover:text-emerald-400 font-bold transition-colors"
        >
          幸運轉盤
        </NuxtLink>
      </div>
    </template>

    <!-- 右侧：站外社群图标矩阵 -->
    <template #right>
      <UButton
        icon="i-simple-icons-discord"
        color="neutral"
        variant="ghost"
        to="https://discord.gg/XhAHbCq3VB"
        target="_blank"
        aria-label="Discord"
      />
      <UButton
        icon="i-simple-icons-youtube"
        color="neutral"
        variant="ghost"
        to="https://www.youtube.com/@forestwork"
        target="_blank"
        aria-label="Youtube"
      />
      <UButton
        icon="i-simple-icons-x"
        color="neutral"
        variant="ghost"
        to="https://twitter.com/TeamForestWork"
        target="_blank"
        aria-label="X"
      />
    </template>
  </UFooter>
</template>