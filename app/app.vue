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

<style scoped>
.page-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh; /* Full viewport height */
}

.content {
  flex: 1; /* Pushes footer down */
}

footer {
  /* Footer styling */
}
</style>