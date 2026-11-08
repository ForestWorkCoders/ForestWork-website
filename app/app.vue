<script setup lang="ts">
import { SpeedInsights } from '@vercel/speed-insights/vue';
const isDev = process.dev;
</script>

<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <SpeedInsights v-if="!isDev" />
  </div>
</template>