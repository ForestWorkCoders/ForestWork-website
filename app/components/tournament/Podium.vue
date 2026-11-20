<script setup lang="ts">
// Top-3 podium cards with a radar chart each, shared by every game's Player Stats tab.
// The game picks and orders the entries and works out the axis values; this only draws.
import { use } from 'echarts/core'
import { RadarChart } from 'echarts/charts'
import { TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'

use([RadarChart, TooltipComponent, CanvasRenderer])

export interface PodiumAxis {
  name: string
  max: number
  value: number           // plotted
  display: string | number // shown in the tooltip
}

export interface PodiumEntry {
  key: string
  name: string
  avatar?: string
  value: string            // headline number, already formatted
  sub: string
  axes: PodiumAxis[] | null // null = no radar data (yet)
}

const props = defineProps<{
  entries: PodiumEntry[]
  valueLabel: string       // e.g. AVG RANK, SCORE
  subIcon: string
  emptyText?: string
}>()

const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

function radarOption(axes: PodiumAxis[]) {
  const dark = isDark.value
  const AXIS_GREY = dark ? '#94a3b8' : '#475569'
  const LINE_GREY = dark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(100, 116, 139, 0.25)'
  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(17, 24, 39, 0.9)',
      textStyle: { color: 'rgba(255, 255, 255, 0.8)', fontWeight: 'bold' },
      borderWidth: 0,
      formatter: () => axes.map(a => `${a.name}: ${a.display}`).join('<br/>'),
    },
    radar: {
      indicator: axes.map(a => ({ name: a.name, max: a.max })),
      radius: '65%',
      splitNumber: 5,
      axisName: { color: AXIS_GREY, fontSize: 12, fontWeight: 'bold' },
      splitLine: { lineStyle: { color: LINE_GREY } },
      splitArea: { show: false },
      axisLine: { lineStyle: { color: LINE_GREY } },
    },
    series: [{
      type: 'radar',
      data: [{
        value: axes.map(a => a.value),
        itemStyle: { color: dark ? '#8BCBB2' : '#4C7766' },
        areaStyle: { color: dark ? 'rgba(139, 203, 178, 0.2)' : 'rgba(76, 119, 102, 0.2)' },
        lineStyle: { width: 2, color: dark ? '#8BCBB2' : '#4C7766' },
      }],
    }],
  }
}

// Gold / silver / bronze by place: the headline uses the Standings medal shades (AA in both modes),
// the big #n watermark the same hue, faint
const MEDALS = [
  { value: 'text-yellow-700 dark:text-yellow-400', mark: 'text-yellow-500/20 dark:text-yellow-400/10' },
  { value: 'text-slate-500 dark:text-slate-300', mark: 'text-slate-400/25 dark:text-slate-300/10' },
  { value: 'text-amber-800 dark:text-amber-600', mark: 'text-amber-700/20 dark:text-amber-600/10' },
]

const cards = computed(() => props.entries.map(e => ({ ...e, option: e.axes ? radarOption(e.axes) : null })))</script>

<template>
  <section>
    <div class="flex flex-col sm:flex-row sm:items-end gap-3 mb-6">
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white tracking-wide">
        頂尖選手 · Top Performers
      </h2>
    </div>

    <p v-if="!cards.length"
      class="text-sm text-muted py-6 text-center border border-dashed border-gray-200 dark:border-default rounded-xl">
      {{ emptyText }}
    </p>

    <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div v-for="(card, index) in cards" :key="card.key"
        class="bg-white dark:bg-elevated rounded-xl border border-gray-200 dark:border-default shadow-sm overflow-hidden flex flex-col relative group">

        <div
          class="absolute -right-4 -top-8 text-[120px] font-extrabold pointer-events-none transition-transform group-hover:scale-110"
          :class="MEDALS[index]?.mark">
          #{{ index + 1 }}
        </div>

        <div class="p-6 flex flex-col items-center z-10 border-b border-gray-100 dark:border-default">
          <UAvatar :src="card.avatar" :alt="card.name" size="xl"
            class="ring-4 ring-gray-50 dark:ring-default shadow-lg mb-3 shrink-0 bg-gray-100 dark:bg-accented" />
          <h3 class="text-xl font-bold text-gray-900 dark:text-white">{{ card.name }}</h3>
          <div class="mt-2 flex items-center gap-1 font-extrabold text-2xl" :class="MEDALS[index]?.value">
            <span>{{ card.value }}</span>
            <span class="text-xs text-muted font-semibold tracking-widest ml-1">{{ valueLabel }}</span>
          </div>

          <div class="mt-1 flex items-center gap-1.5 text-sm font-semibold text-muted">
            <UIcon :name="subIcon" class="w-4 h-4 opacity-70" />
            <span>{{ card.sub }}</span>
          </div>
        </div>

        <div v-if="card.option"
          class="p-6 flex-1 flex flex-col items-center justify-center min-h-[280px] bg-gray-50/50 dark:bg-transparent">
          <div class="relative w-full aspect-square max-w-[220px]">
            <ClientOnly>
              <VChart :option="card.option" class="w-full h-full" autoresize />
              <template #fallback>
                <div class="w-full h-full flex items-center justify-center">
                  <UIcon name="i-lucide-refresh-cw" class="w-8 h-8 text-dimmed animate-spin" />
                </div>
              </template>
            </ClientOnly>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
