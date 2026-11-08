<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <SpeedInsights v-if="!isDev" />
  </div>
</template>

<script setup>
const isDev = process.dev;
</script>