<!-- app/pages/activities/ctf.vue -->
<script setup lang="ts">
import type { CtfHost } from '~/utils/ctfHost'

// Discord Activity entry for the CTF terminal. Outside Discord it sends the player to the website page.
definePageMeta({
  layout: false
})

useSeoMeta({
  title: 'CTF · Activity · ForestWork',
  robots: 'noindex'
})

const activity = useDiscordActivity()

onMounted(async () => {
  const embedded = await activity.start()
  if (!embedded) {
    await navigateTo('/games/ctf', { replace: true })
  }
})

const host = computed<CtfHost>(() => {
  const user = activity.user.value
  const name = user?.global_name || user?.username || ''
  const supabaseHost = activity.supabaseHost()
  return {
    operator: user,
    headers: () => ({ Authorization: `Bearer ${activity.ticket.value}` }),
    openExternal: url => activity.openExternal(url),
    download: url => activity.openExternal(url),
    mediaUrl: (url) => {
      let parsed: URL
      try {
        parsed = new URL(url)
      } catch {
        return null
      }
      if (supabaseHost && parsed.host === supabaseHost) return activity.remapUrl(parsed).toString()
      return null
    },
    notice: name ? `Signed in through Discord as ${name}.` : undefined,
    mobileNotice: 'Best on desktop: some challenges need desktop tools.',
    unauthorizedMessage: 'Your Activity session has expired. Close and relaunch the Activity to keep submitting.'
  }
})
</script>

<template>
  <div class="relative h-dvh w-full overflow-hidden bg-[#0f141c]">
    <CtfTerminal
      v-if="activity.status.value === 'ready'"
      :host="host"
      class="h-dvh max-w-none!" />

    <div
      v-else-if="activity.status.value === 'error'"
      class="h-dvh flex items-center justify-center px-6 text-center font-mono text-sm text-rose-400">
      Couldn't sign in through Discord. Close and relaunch the Activity.
    </div>

    <div
      v-else
      class="h-dvh flex items-center justify-center font-mono text-sm text-emerald-400">
      Signing in through Discord…
    </div>

    <!-- Picture-in-picture is far too small for the terminal: cover it (kept mounted underneath). Shown by CSS only. -->
    <div
      role="status"
      class="ctf-small-window absolute inset-0 z-50 hidden flex-col items-center justify-center gap-1.5 overflow-hidden bg-[#0f141c] px-4 text-center font-mono select-none">
      <div class="text-xs font-bold tracking-widest text-emerald-400 uppercase">
        &gt; SYSTEM_HALT: VIEWPORT_GEOMETRY_RESTRICTED
      </div>
      <p class="text-xs leading-snug text-zinc-300">
        目前視窗高度受限，無法使用 CTF 終端。<br>
        請放大或彈出視窗，以解除限制。<br>
        <span class="text-rose-400">Window too small: enlarge or pop out the Activity.</span>
      </p>
    </div>
  </div>
</template>

<style scoped>
/* Same height threshold as the skill test Activity (max-height: 329px). */
@media (max-height: 329px) {
  .ctf-small-window {
    display: flex;
  }
}
</style>
