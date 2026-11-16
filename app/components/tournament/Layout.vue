<script setup lang="ts">
// Page shell of every tournament page: background, breadcrumb, header card and the tab bar.
// The Info tab is built in; the page lists its other tabs and fills each one through a
// slot of the same name. With no other tabs (e.g. a mahjong event) there is no tab bar.

export interface TournamentGame {
  name: string        // breadcrumb label
  icon: string        // breadcrumb icon
  to: string          // game page
  background: string  // image URL behind the page
  rules: string       // rules page
}

export interface TournamentTab {
  label: string
  slot: string
}

const props = defineProps<{
  tournament: Record<string, any> | null | undefined
  pending: boolean
  error: { message: string } | null | undefined
  game: TournamentGame
  tabs: TournamentTab[]
}>()

const allTabs = computed(() => [{ label: '賽事資訊 · Information', slot: 'info' }, ...props.tabs])

const breadcrumb = computed(() => [
  { label: '首頁 · Home', icon: 'i-lucide-home', to: '/' },
  { label: props.game.name, icon: props.game.icon, to: props.game.to },
  { label: props.tournament?.title || '載入中...', icon: 'i-lucide-swords' },
])
</script>

<template>
  <div v-if="error" class="min-h-screen flex items-center justify-center text-white">
    <p class="text-xl font-bold text-red-400">載入失敗：{{ error.message }}</p>
  </div>

  <div v-else-if="pending || !tournament" class="min-h-screen flex items-center justify-center text-white">
    <UIcon name="i-lucide-refresh-cw" class="animate-spin w-8 h-8" />
  </div>

  <div v-else class="min-h-screen bg-gray-50 dark:bg-default bg-cover bg-fixed bg-center"
    :style="{ backgroundImage: `url('${game.background}')` }">
    <div class="min-h-screen bg-black/50 backdrop-blur-sm pt-20 pb-12">
      <UContainer class="max-w-6xl">
        <div class="mb-8 px-2 animate-fade-in">
          <UBreadcrumb :items="breadcrumb" separator="i-lucide-chevron-right" />
        </div>

        <div
          class="bg-white/90 dark:bg-default text-gray-900 dark:text-white rounded-t-xl overflow-hidden shadow-2xl flex flex-col md:flex-row p-8 md:p-16 gap-12 items-center md:items-start border border-gray-200 dark:border-default transition-colors duration-300">

          <div class="flex flex-col items-center gap-6 shrink-0">
            <UAvatar :src="tournament.imageUrl" :alt="tournament.title" size="3xl"
              class="w-48 h-48 text-5xl drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />

            <UButton :to="game.rules" target="_blank" color="info" variant="outline" icon="i-lucide-book-open"
              class="w-full justify-center font-bold tracking-widest text-sm transition-colors">
              Rules · 賽規
            </UButton>
          </div>

          <div class="flex-1 w-full space-y-8">
            <h1 class="text-3xl md:text-5xl font-bold tracking-tight md:mb-12">{{ tournament.title }}</h1>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-8 gap-x-6">
              <div class="space-y-1">
                <p class="text-xs font-bold text-gray-400 tracking-wider">時程 · Duration</p>
                <p class="text-sm font-semibold">{{ tournament.duration }}</p>
              </div>
              <div class="space-y-1">
                <p class="text-xs font-bold text-gray-400 tracking-wider">狀態 · Status</p>
                <p class="text-sm font-semibold"
                  :class="tournament.status?.includes('進行中') ? 'text-green-400' : 'text-gray'">
                  {{ tournament.status }}
                </p>
              </div>
              <div class="space-y-1">
                <p class="text-xs font-bold text-gray-400 tracking-wider">主辦方 · Organizer</p>
                <p class="text-sm font-semibold">{{ tournament.organizer }}</p>
              </div>
              <div class="space-y-1">
                <p class="text-xs font-bold text-gray-400 tracking-wider">參賽賽區 · Venue</p>
                <p class="text-sm font-semibold">{{ tournament.region }}</p>
              </div>
              <div class="space-y-1">
                <p class="text-xs font-bold text-gray-400 tracking-wider">賽事級別 · Tier</p>
                <p class="text-sm font-semibold">Tier {{ tournament.tier }}</p>
              </div>
            </div>
          </div>
        </div>

        <div
          class="bg-white dark:bg-elevated w-full border-x border-b border-gray-200 dark:border-default rounded-b-xl shadow-sm">
          <!-- The bar scrolls sideways when the labels don't fit (phones), instead of cutting them to "…" -->
          <UTabs v-if="allTabs.length > 1" :items="allTabs" class="w-full" :ui="{
            list: 'overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
            trigger: 'shrink-0'
          }">
            <template v-for="tab in allTabs" :key="tab.slot" #[tab.slot]>
              <div class="px-6 py-8 animate-fade-in">
                <slot :name="tab.slot">
                  <TournamentInfo v-if="tab.slot === 'info'" :content-url="tournament.content_url || null" />
                </slot>
              </div>
            </template>
          </UTabs>
          <TournamentInfo v-else :content-url="tournament.content_url || null" />
        </div>
      </UContainer>
    </div>
  </div>
</template>
