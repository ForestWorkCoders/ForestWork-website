<script setup lang="ts">
// The VODs tab of every tournament page. Pass the tournament's videos; with none
// it shows an empty state. The data shape (and the old placeholder content) is in
// app/types/vods.ts.
import type { VodStream, VodArchive, VodMontage } from '~/types/vods'

const props = withDefaults(defineProps<{
  streams?: VodStream[]
  archives?: VodArchive[]
  montages?: VodMontage[]
}>(), { streams: () => [], archives: () => [], montages: () => [] })

const isEmpty = computed(() => !props.streams.length && !props.archives.length && !props.montages.length)
</script>

<template>
  <div class="px-4 md:px-6 mt-8 space-y-12 animate-fade-in pb-12">

    <div v-if="isEmpty" class="text-muted text-center py-8">
      尚未有影音記錄。
    </div>

    <section v-if="streams.length > 0">
      <div class="flex items-center justify-between mb-4 border-b border-gray-200 dark:border-default pb-2">
        <h2 class="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <span class="relative flex h-3 w-3">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          實況轉播 <span class="text-muted font-normal text-sm ml-1">Live Streams</span>
        </h2>
      </div>
      
      <div class="flex overflow-x-auto gap-5 pb-4 snap-x [&::-webkit-scrollbar]:hidden">
        <a v-for="stream in streams" :key="stream.id" :href="stream.url" target="_blank" class="snap-start shrink-0 w-[300px] md:w-[400px] group flex flex-col gap-3">
          <div class="relative aspect-video rounded-xl overflow-hidden bg-gray-200 dark:bg-accented border border-gray-200 dark:border-default">
            <img :src="stream.thumbnail" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div class="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              <UIcon name="i-lucide-play" class="w-12 h-12 text-white opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all drop-shadow-lg" />
            </div>
            <div class="absolute top-3 left-3 px-2 py-1 rounded bg-black/70 backdrop-blur-sm flex items-center gap-1.5 text-xs font-bold text-white">
              <span :class="stream.platform === 'twitch' ? 'text-purple-700 dark:text-purple-400' : 'text-red-700 dark:text-red-500'">●</span>
              {{ stream.platform === 'twitch' ? 'Twitch' : 'YouTube' }}
            </div>
            <div class="absolute bottom-3 left-3 px-2 py-1 rounded bg-red-600 text-white text-xs font-bold tracking-wider flex items-center gap-1">
              <UIcon name="i-lucide-users" class="w-3.5 h-3.5" /> {{ stream.viewers }}
            </div>
          </div>
          <h3 class="font-bold text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-amber-700 dark:group-hover:text-amber-500 transition-colors">{{ stream.title }}</h3>
        </a>
      </div>
    </section>

    <section v-if="archives.length > 0">
      <div class="flex items-center justify-between mb-4 border-b border-gray-200 dark:border-default pb-2">
        <h2 class="text-xl font-bold text-gray-900 dark:text-white">
          賽事存檔 <span class="text-muted font-normal text-sm ml-1">Archives</span>
        </h2>
      </div>
      
      <div class="flex overflow-x-auto gap-5 pb-4 snap-x [&::-webkit-scrollbar]:hidden">
        <a v-for="arc in archives" :key="arc.id" :href="arc.url" target="_blank" class="snap-start shrink-0 w-[280px] md:w-[320px] group flex flex-col gap-2">
          <div class="relative aspect-video rounded-xl overflow-hidden bg-gray-200 dark:bg-accented border border-gray-200 dark:border-default">
            <img :src="arc.thumbnail" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div class="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-white text-xs font-mono font-bold tracking-wider">
              {{ arc.duration }}
            </div>
          </div>
          <div class="flex flex-col">
            <h3 class="font-semibold text-sm text-gray-900 dark:text-gray-200 line-clamp-2 group-hover:text-amber-700 dark:group-hover:text-amber-500 transition-colors leading-tight">{{ arc.title }}</h3>
            <span class="text-xs text-muted mt-1">{{ arc.date }}</span>
          </div>
        </a>
      </div>
    </section>

    <section v-if="montages.length > 0">
      <div class="flex items-center justify-between mb-4 border-b border-gray-200 dark:border-default pb-2">
        <h2 class="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <UIcon name="i-lucide-zap" class="w-5 h-5 text-amber-500" />
          精華短片 <span class="text-muted font-normal text-sm ml-1">Shorts & Highlights</span>
        </h2>
      </div>
      
      <div class="flex overflow-x-auto gap-4 pb-4 snap-x [&::-webkit-scrollbar]:hidden">
        <a v-for="montage in montages" :key="montage.id" :href="montage.url" target="_blank" class="snap-start shrink-0 w-[140px] md:w-[180px] group flex flex-col gap-2">
          <div class="relative aspect-[9/16] rounded-xl overflow-hidden bg-gray-200 dark:bg-elevated border border-gray-200 dark:border-default shadow-sm">
            <img :src="montage.thumbnail" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 group-hover:opacity-100 transition-opacity"></div>
            
            <div class="absolute bottom-3 left-3 right-3 flex justify-between items-end">
              <span class="text-white text-xs font-bold tracking-wider flex items-center gap-1">
                <UIcon name="i-lucide-eye" class="w-3.5 h-3.5" /> {{ montage.views }}
              </span>
              <UIcon name="i-lucide-circle-play" class="w-6 h-6 text-white/80 group-hover:text-white transition-colors" />
            </div>
          </div>
          <h3 class="font-semibold text-xs md:text-sm text-gray-800 dark:text-gray-300 line-clamp-2 leading-snug group-hover:text-amber-700 dark:group-hover:text-amber-500 transition-colors">{{ montage.title }}</h3>
        </a>
      </div>
    </section>

  </div>
</template>