<script setup lang="ts">
// "Ongoing now" on the home page: every game's running tournaments, grouped by game.
// Hidden entirely when nothing is running. A game whose API fails is just left out.

interface Listed { id: string | number; title: string }

const GAMES = [
  { slug: 'mahjongsoul', name: '雀魂麻將 · Mahjong Soul', api: '/api/mahjong/tournaments' },
  { slug: 'plazmaburst', name: 'Plazma Burst 2', api: '/api/plazmaburst/tournaments' },
]

const lists = await Promise.all(GAMES.map(g =>
  useFetch<{ ongoing?: Listed[] } | null>(g.api, { key: `ongoing-${g.slug}`, default: () => null }).then(r => r.data)))

const groups = computed(() => GAMES
  .map((g, i) => ({ ...g, ongoing: lists[i]?.value?.ongoing ?? [] }))
  .filter(g => g.ongoing.length))
</script>

<template>
  <section v-if="groups.length" class="max-w-3xl mx-auto mb-20">
    <div class="text-center mb-8">
      <h2 class="text-3xl font-bold text-gray-900 dark:text-white mb-3 flex items-center justify-center gap-3">
        <span class="relative flex h-3 w-3">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </span>
        Ongoing now · 進行中賽事
      </h2>
    </div>

    <div class="space-y-6">
      <div v-for="g in groups" :key="g.slug">
        <NuxtLink :to="`/games/${g.slug}`"
          class="inline-block mb-2 text-xs font-bold tracking-wider text-muted hover:text-primary transition-colors">
          {{ g.name }}
        </NuxtLink>
        <div class="space-y-3">
          <TournamentCard v-for="tourney in g.ongoing" :key="tourney.id" :tourney="tourney" :game-slug="g.slug" />
        </div>
      </div>
    </div>
  </section>
</template>
