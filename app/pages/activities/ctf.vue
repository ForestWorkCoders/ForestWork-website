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
  <div class="h-dvh w-full bg-[#0f141c]">
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
  </div>
</template>
