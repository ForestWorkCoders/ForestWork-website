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
  slot: string      // also the tab's value (and its ?tab= name)
  hidden?: boolean  // leave the tab out (e.g. no data to show)
}

const props = defineProps<{
  tournament: Record<string, any> | null | undefined
  pending: boolean
  error: { message: string } | null | undefined
  game: TournamentGame
  tabs: TournamentTab[]
}>()

const route = useRoute()
const router = useRouter()

const allTabs = computed<TournamentTab[]>(() => [
  { label: '賽事資訊 · Information', slot: 'info', hidden: !props.tournament?.content_url },
  ...props.tabs
])
const visibleTabs = computed(() =>
  allTabs.value.filter(t => !t.hidden).map(t => ({ ...t, value: t.slot }))
)

// Finished events open on the result, everything else on the first tab
const defaultTab = computed(() => {
  const finished = props.tournament?.status?.includes('已結束')
  if (finished && visibleTabs.value.some(t => t.value === 'result')) return 'result'
  return visibleTabs.value[0]?.value
})

// ?tab= names the open tab; an unknown name falls back to the default. Not written on first load.
const activeTab = computed({
  get() {
    const q = route.query.tab
    return typeof q === 'string' && visibleTabs.value.some(t => t.value === q) ? q : defaultTab.value
  },
  set(value) {
    router.replace({ query: { ...route.query, tab: value }, hash: route.hash })
  }
})

// Tab bar: keep the active tab in view, and fade the right edge while more tabs are off-screen
const tabsRoot = ref<HTMLElement | null>(null)
const fadeRight = ref(false)
let stopListening: (() => void) | undefined

function getList() {
  return tabsRoot.value?.querySelector<HTMLElement>('[role="tablist"]') ?? null
}

function updateFade() {
  const list = getList()
  fadeRight.value = !!list && list.scrollLeft + list.clientWidth < list.scrollWidth - 1
}

const FADE_PX = 40 // width of the right-edge fade (2.5rem); the active tab stays clear of it

function revealActive(smooth: boolean) {
  const list = getList()
  const trigger = list?.querySelector<HTMLElement>('[role="tab"][data-state="active"]')
  if (!list || !trigger) return
  const l = list.getBoundingClientRect()
  const t = trigger.getBoundingClientRect()
  let delta = 0
  if (t.left < l.left) delta = t.left - l.left
  else if (t.right > l.right - FADE_PX) delta = t.right - (l.right - FADE_PX)
  if (delta) {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    list.scrollBy({ left: delta, behavior: smooth && !reduce ? 'smooth' : 'auto' })
  }
}

watch(tabsRoot, (el) => {
  stopListening?.()
  stopListening = undefined
  const list = getList()
  if (!el || !list) return
  list.addEventListener('scroll', updateFade, { passive: true })
  const observer = new ResizeObserver(updateFade)
  observer.observe(list)
  stopListening = () => {
    list.removeEventListener('scroll', updateFade)
    observer.disconnect()
  }
  updateFade()
  // Jump straight to the active tab on load, and again once web fonts have changed the tab widths
  revealActive(false)
  document.fonts?.ready.then(() => revealActive(false))
}, { flush: 'post' })

watch(activeTab, () => nextTick(() => revealActive(true)))
onBeforeUnmount(() => stopListening?.())

const breadcrumb = computed(() => [
  { label: '首頁 · Home', icon: 'i-lucide-home', to: '/' },
  { label: props.game.name, icon: props.game.icon, to: props.game.to },
  { label: props.tournament?.title || '載入中...', icon: 'i-lucide-swords' },
])
</script>

<template>
  <div v-if="error" class="min-h-screen flex items-center justify-center text-white">
    <p class="text-xl font-bold text-red-700 dark:text-red-400">載入失敗：{{ error.message }}</p>
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
          class="bg-white/90 dark:bg-default text-gray-900 dark:text-white rounded-t-xl overflow-hidden shadow-2xl grid grid-cols-[auto_1fr] md:flex md:flex-row p-5 md:p-16 gap-4 md:gap-12 items-center md:items-start border border-gray-200 dark:border-default transition-colors duration-300">

          <!-- Phones: avatar and title share a row, then the rules button, then the meta grid.
               The two wrappers only exist from md up (display: contents before that). -->
          <div class="contents md:flex md:flex-col md:items-center md:gap-6 md:shrink-0">
            <UAvatar :src="tournament.imageUrl" :alt="tournament.title" size="3xl"
              class="row-start-1 col-start-1 w-16 h-16 text-xl md:w-48 md:h-48 md:text-5xl shrink-0 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />

            <UButton :to="game.rules" target="_blank" color="primary" variant="outline" icon="i-lucide-book-open"
              class="row-start-2 col-span-2 justify-self-start w-fit md:w-full justify-center font-bold tracking-widest text-sm transition-colors">
              Rules · 賽規
            </UButton>
          </div>

          <div class="contents md:block md:flex-1 md:w-full md:space-y-8">
            <h1 class="row-start-1 col-start-2 min-w-0 text-2xl md:text-5xl font-bold tracking-tight md:mb-12">{{ tournament.title }}</h1>

            <div class="row-start-3 col-span-2 grid grid-cols-2 lg:grid-cols-3 gap-y-3 gap-x-4 md:gap-y-8 md:gap-x-6">
              <div class="space-y-1">
                <p class="text-xs font-bold text-toned tracking-wider">時程 · Duration</p>
                <p class="text-sm font-semibold">{{ tournament.duration }}</p>
              </div>
              <div class="space-y-1">
                <p class="text-xs font-bold text-toned tracking-wider">狀態 · Status</p>
                <p class="text-sm font-semibold"
                  :class="tournament.status?.includes('進行中') ? 'text-green-700 dark:text-green-400' : ''">
                  {{ tournament.status }}
                </p>
              </div>
              <div class="space-y-1">
                <p class="text-xs font-bold text-toned tracking-wider">主辦方 · Organizer</p>
                <p class="text-sm font-semibold">{{ tournament.organizer }}</p>
              </div>
              <div class="space-y-1">
                <p class="text-xs font-bold text-toned tracking-wider">參賽賽區 · Venue</p>
                <p class="text-sm font-semibold">{{ tournament.region }}</p>
              </div>
              <div class="space-y-1">
                <p class="text-xs font-bold text-toned tracking-wider">賽事級別 · Tier</p>
                <p class="text-sm font-semibold">Tier {{ tournament.tier }}</p>
              </div>
            </div>
          </div>
        </div>

        <div
          class="bg-white dark:bg-default w-full border-x border-b border-gray-200 dark:border-default rounded-b-xl shadow-sm">
          <!-- The bar scrolls sideways when the labels don't fit (phones), instead of cutting them to "…" -->
          <div v-if="visibleTabs.length > 1" ref="tabsRoot">
            <UTabs v-model="activeTab" :items="visibleTabs" class="w-full" :ui="{
              list: ['overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
                fadeRight && '[mask-image:linear-gradient(to_right,#000_calc(100%-2.5rem),transparent)]'],
              trigger: 'shrink-0'
            }">
              <template v-for="tab in visibleTabs" :key="tab.slot" #[tab.slot]>
                <div class="px-6 py-8 animate-fade-in">
                  <slot :name="tab.slot">
                    <TournamentInfo v-if="tab.slot === 'info'" :content-url="tournament.content_url || null" />
                  </slot>
                </div>
              </template>
            </UTabs>
          </div>
          <!-- One tab left: show it without a bar. None left: Info's empty state. -->
          <div v-else-if="visibleTabs.length === 1" :class="{ 'px-6 py-8': visibleTabs[0]!.slot !== 'info' }">
            <slot :name="visibleTabs[0]!.slot">
              <TournamentInfo v-if="visibleTabs[0]!.slot === 'info'" :content-url="tournament.content_url || null" />
            </slot>
          </div>
          <TournamentInfo v-else :content-url="tournament.content_url || null" />
        </div>
      </UContainer>
    </div>
  </div>
</template>
