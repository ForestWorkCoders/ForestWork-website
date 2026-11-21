<script setup lang="ts">
// Home page tournaments, grouped by game: "Ongoing now" (running tournaments) and
// "Latest results" (each game's newest past tournament, the APIs return past newest-first).
// Each block is hidden when empty, the whole section when both are. A game whose API fails is just left out.

interface Listed { id: string | number; title: string }

const GAMES = [
  { slug: 'mahjongsoul', name: '雀魂麻將 · Mahjong Soul', api: '/api/mahjong/tournaments' },
  { slug: 'plazmaburst', name: 'Plazma Burst 2', api: '/api/plazmaburst/tournaments' },
]

const lists = await Promise.all(GAMES.map(g =>
  useFetch<{ ongoing?: Listed[]; past?: Listed[] } | null>(g.api, { key: `ongoing-${g.slug}`, default: () => null }).then(r => r.data)))

const groups = computed(() => GAMES
  .map((g, i) => ({ ...g, ongoing: lists[i]?.value?.ongoing ?? [] }))
  .filter(g => g.ongoing.length))

const latest = computed(() => GAMES
  .map((g, i) => ({ ...g, latest: lists[i]?.value?.past?.[0] }))
  .filter((g): g is typeof g & { latest: Listed } => !!g.latest))
</script>

<template>
  <section v-if="groups.length || latest.length" class="max-w-3xl mx-auto mb-12 space-y-10">
    <div v-if="groups.length">
      <div class="text-center mb-8">
        <h2 class="text-3xl font-bold text-gray-900 dark:text-white mb-3 flex items-center justify-center gap-3">
          <span class="relative flex h-3 w-3">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span class="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
          </span>
          進行中賽事 · Ongoing now
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
    </div>

    <div v-if="latest.length">
      <div class="text-center mb-8">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          最新戰報 · Latest results
        </h2>
      </div>

      <div class="space-y-6">
        <div v-for="g in latest" :key="g.slug">
          <NuxtLink :to="`/games/${g.slug}`"
            class="inline-block mb-2 text-xs font-bold tracking-wider text-muted hover:text-primary transition-colors">
            {{ g.name }}
          </NuxtLink>
          <div class="space-y-3">
            <TournamentCard :tourney="g.latest" :game-slug="g.slug" />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
