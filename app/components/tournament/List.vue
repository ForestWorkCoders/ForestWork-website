<script setup lang="ts">
// A game's tournaments in three tabs (ongoing / past / upcoming) with one title search.
// Past is paged. `tournaments` is what /api/<game>/tournaments returns.

interface Listed { id: string | number; title: string }

const props = defineProps<{
  tournaments: { ongoing?: Listed[]; past?: Listed[]; upcoming?: Listed[] } | null | undefined
  gameSlug: string
}>()

type Key = 'ongoing' | 'past' | 'upcoming'

const TABS: { slot: Key; label: string; shortLabel: string; description: string; placeholder: string; emptyIcon: string; empty: string; noMatch: string }[] = [
  { slot: 'ongoing', label: 'ONGOING TOURNAMENTS', shortLabel: 'ONGOING', description: '進行中的比賽', placeholder: 'Search Ongoing Tournaments...', emptyIcon: 'i-lucide-calendar-days', empty: '目前沒有進行中的賽事', noMatch: '找不到符合條件的進行中賽事' },
  { slot: 'past', label: 'PAST TOURNAMENTS', shortLabel: 'PAST', description: '已結束的比賽', placeholder: 'Search Past Tournaments...', emptyIcon: 'i-lucide-inbox', empty: '尚無歷史賽事紀錄', noMatch: '找不到符合條件的歷史賽事' },
  { slot: 'upcoming', label: 'UPCOMING TOURNAMENTS', shortLabel: 'UPCOMING', description: '即將開始的比賽', placeholder: 'Search Future Tournaments...', emptyIcon: 'i-lucide-calendar-days', empty: '目前沒有即將開始的賽事', noMatch: '找不到符合條件的即將開始賽事' },
]

const PAGE_SIZE = 7
const query = ref('')
const page = ref(1)

// A new search starts the past list from page 1 again
watch(query, () => { page.value = 1 })

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  const pick = (list?: Listed[]) => (list ?? []).filter(t => !q || t.title.toLowerCase().includes(q))
  return { ongoing: pick(props.tournaments?.ongoing), past: pick(props.tournaments?.past), upcoming: pick(props.tournaments?.upcoming) }
})

// Only past is paged
const shown = (key: Key) => key === 'past'
  ? filtered.value.past.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE)
  : filtered.value[key]
</script>

<template>
  <UTabs :items="TABS" class="w-full" :ui="{
    list: 'bg-gray-100 dark:bg-default',
    indicator: 'bg-emerald-600 dark:bg-emerald-500 text-white shadow-sm'
  }">
    <template #default="{ item }">
      <div class="text-center py-1.5 sm:py-2 transition-colors duration-200">
        <div class="font-bold text-xs sm:text-sm tracking-wider uppercase transition-colors">
          <!-- Short word on phones, so the label is never cut -->
          <span class="inline sm:hidden">{{ item.shortLabel }}</span>
          <span class="hidden sm:inline">{{ item.label }}</span>
          <div class="text-xs text-gray-500 dark:text-gray-200 mt-0.5 sm:mt-1 transition-colors opacity-90">
            {{ item.description }}
          </div>
        </div>
      </div>
    </template>

    <template v-for="tab in TABS" :key="tab.slot" #[tab.slot]>
      <div class="mt-2 space-y-4">
        <UInput v-model="query" icon="i-lucide-search" :placeholder="tab.placeholder" color="info" variant="outline"
          class="w-full" :ui="{
            base: 'bg-white dark:bg-default border-gray-200 dark:border-default text-gray-900 dark:text-white transition-colors duration-200',
            leadingIcon: 'text-gray-500 dark:text-gray-400 transition-colors'
          }" />
      </div>

      <div class="mt-4 space-y-6">
        <div v-if="filtered[tab.slot].length">
          <div class="space-y-3">
            <TournamentCard v-for="tourney in shown(tab.slot)" :key="tourney.id" :tourney="tourney"
              :game-slug="gameSlug" />
          </div>

          <div v-if="tab.slot === 'past' && filtered.past.length > PAGE_SIZE"
            class="flex justify-center pt-4 mt-6 border-t border-gray-200 dark:border-default transition-colors duration-200">
            <UPagination v-model:page="page" :total="filtered.past.length" :items-per-page="PAGE_SIZE" color="neutral"
              variant="subtle" />
          </div>
        </div>

        <div v-else
          class="mt-4 p-12 text-center border border-gray-200 dark:border-default rounded-lg bg-white/50 dark:bg-default">
          <UIcon :name="tab.emptyIcon" class="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p class="text-gray-500 dark:text-gray-400">{{ query ? tab.noMatch : tab.empty }}</p>
        </div>
      </div>
    </template>
  </UTabs>
</template>
