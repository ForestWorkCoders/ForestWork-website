<script setup lang="ts">
import { toComponentEmbedJson } from 'discord-component-embed';
import { SpeedInsights } from '@vercel/speed-insights/vue';
import { Analytics } from '@vercel/analytics/vue';

// 1. 常规 SEO / 社交平台兜底 (当平台不支持 component-embed 时降级显示)
useSeoMeta({
  title: '林間小鎮 · ForestWork',
  ogTitle: '林間小鎮 · ForestWork',
  description: '林間小鎮賽事網頁',
  ogDescription: '林間小鎮賽事網頁',
  ogImage: 'https://i.imgur.com/cu2YAkn.png',
  ogUrl: 'https://forestwork.vercel.app',
  twitterCard: 'summary_large_image',
  themeColor: '#4C7766'
})

// 2. Discord 官方爬虫专属组件树 (静态嵌入式)
const discordEmbedPayload = {
  component: {
    type: 17, // 主容器 Container
    accent_color: 5011302, // #4C7766 林间墨绿
    spoiler: false,
    components: [
      // 1. 顶部文本区：标题 + 描述
      {
        type: 10, // 纯文本组件 (Text Display)
        content: '# 林間小鎮 · ForestWork\n林間小鎮賽事歷史與社群活動中心。即時牌譜查閱、賽事積分追蹤與趣味同樂。'
      },
      // 2. 核心：独立通栏大横幅 (不再放在 accessory 里面挤压文字)
      {
        type: 12, // Media Gallery / Banner Container
        items: [
          {
            media: {
              url: 'https://i.imgur.com/cu2YAkn.png'
            },
            description: 'ForestWork Banner',
            spoiler: false
          }
        ]
      },
      // 3. 视觉分割线
      {
        type: 14, // Divider
        spacing: 1,
        divider: true
      },
      // 4. 底部保留完整交互按钮组
      {
        type: 1, // Action Row
        components: [
          {
            type: 2, // Button
            style: 5, // Link Button
            label: '進入首頁',
            emoji: { name: '🌲' },
            url: 'https://forestwork.vercel.app/'
          },
          {
            type: 2,
            style: 5,
            label: '日麻賽事',
            emoji: { name: '🀄' },
            url: 'https://forestwork.vercel.app/games/mahjongsoul'
          },
          {
            type: 2,
            style: 5,
            label: '加入 Discord',
            emoji: { name: '📌' },
            url: 'https://discord.gg/lin-jian-xiao-zhen-510192195509157909'
          }
        ]
      }
    ]
  }
}

useHead({
  script: [
    {
      key: 'discord:component-embed',
      id: 'discord:component-embed',
      type: 'application/json',
      innerHTML: JSON.stringify(discordEmbedPayload)
    }
  ]
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