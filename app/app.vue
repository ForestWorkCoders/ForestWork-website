<script setup lang="ts">
import { SpeedInsights } from '@vercel/speed-insights/vue';
import { Analytics } from '@vercel/analytics/vue';

useSeoMeta({
  // 1. 基础页面标题与描述
  title: '林間小鎮 · ForestWork',
  description: '林間小鎮賽事網頁',

  // 2. Open Graph 标准协议 (Discord / Facebook / 通用社群)
  ogType: 'website',
  ogSiteName: '林間小鎮 ForestWork',
  ogTitle: '林間小鎮 · ForestWork',
  ogDescription: '林間小鎮賽事網頁',
  ogImage: 'https://i.imgur.com/cu2YAkn.png',
  ogUrl: 'https://forestwork.vercel.app',

  // 3. Twitter / 大图卡片指令 (强制 Discord 展开为 16:9 高清大图预览)
  twitterCard: 'summary_large_image',
  twitterTitle: '林間小鎮 · ForestWork',
  twitterDescription: '林間小鎮賽事網頁',
  twitterImage: 'https://i.imgur.com/cu2YAkn.png',

  // 4. Discord Embed 左侧边框色 (林间绿，强化品牌识别度)
  themeColor: '#4C7766'
})
</script>

<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <SpeedInsights />
    <Analytics />
  </div>
</template>