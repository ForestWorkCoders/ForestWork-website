<script setup lang="ts">
import { SpeedInsights } from '@vercel/speed-insights/vue';

useSeoMeta({
    title: '林間小鎮 · ForestWork',
    ogTitle: '林間小鎮 · ForestWork',
    description: '林間小鎮賽事網頁',
    ogDescription: '林間小鎮賽事網頁',
    ogImage: 'https://i.imgur.com/cu2YAkn.png'
})
</script>

<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <SpeedInsights />
  </div>
</template>