<template>
  <UFooter>
    <template #left>
      <p class="text-muted text-sm">Copyright © {{ new Date().getFullYear() }}. All rights reserved.</p>
    </template>

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
        to="https://twitter.com/forestwork"
        target="_blank"
        aria-label="X"
      />
    </template>
  </UFooter>
</template>


<script>
export default {
    name: 'AppFooter'
}
</script>

<style scoped>
.footer {
    margin-top: 50px;
}
</style>