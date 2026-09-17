<script setup>
import { ref, computed } from 'vue'
import { use } from 'echarts/core'
import { RadarChart } from 'echarts/charts'
import { TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'
import { createSortableColumns } from '~/utils/table'

use([RadarChart, TooltipComponent, CanvasRenderer])

const props = defineProps({
  tournamentId: { type: String, required: true }
})

// ----------------------------------------------------
// 数据获取 (useAsyncData + Supabase RPC)
// ----------------------------------------------------
const supabase = useSupabaseClient()

const { data: players, pending } = await useAsyncData(`pb2-stats-${props.tournamentId}`, async () => {
  const { data, error } = await supabase
    .schema('plazmaburst')
    .rpc('get_tournament_player_stats', { t_id: props.tournamentId })

  if (error) {
    console.error('Failed to fetch stats:', error)
    return []
  }
  return data || []
})

// ----------------------------------------------------
// 标签页状态机
// ----------------------------------------------------
const tabs = [
  { label: 'Overall', value: 'overall', icon: 'i-lucide-trophy' },
  { label: 'Arena', value: 'arena', icon: 'i-lucide-crosshair' },
  { label: 'Rails', value: 'rails', icon: 'i-lucide-zap' },
  { label: 'Snipers', value: 'snipers', icon: 'i-lucide-target' },
  { label: 'Rockets', value: 'rockets', icon: 'i-lucide-flame' },
  { label: 'Rays', value: 'rays', icon: 'i-lucide-sun' }
]
const currentCategory = ref('overall')

// ----------------------------------------------------
// 表格配置：接入全局 createSortableColumns，赋予点击排序与冻结尺寸
// ----------------------------------------------------
const rawColumns = [
  {
    id: 'rank',
    accessorKey: 'rank',
    header: 'Rank',
    // 关键：TanStack 尺寸与 CSS 尺寸必须绝对 1:1 对齐（60px），杜绝重叠穿模
    size: 60,
    class: 'text-center w-[60px] min-w-[60px] max-w-[60px] z-[2] bg-white dark:bg-[#1e293b] border-r border-gray-100 dark:border-slate-800/80 px-1'
  },
  {
    id: 'player',
    accessorKey: 'player',
    header: 'Player',
    // 关键：TanStack 尺寸必须严格等于 110px
    size: 110,
    class: 'text-left w-[110px] min-w-[110px] max-w-[110px] z-[1] bg-white dark:bg-[#1e293b] pl-2 pr-1'
  },
  {
    id: 'score',
    accessorKey: 'score',
    header: 'Score',
    class: 'text-center w-[75px] min-w-[75px] px-2'
  },
  {
    id: 'kills',
    accessorKey: 'kills',
    header: 'Kills',
    class: 'text-center w-[65px] min-w-[65px] px-2'
  },
  {
    id: 'deaths',
    accessorKey: 'deaths',
    header: 'Deaths',
    class: 'text-center w-[65px] min-w-[65px] px-2'
  },
  {
    id: 'kdr',
    accessorKey: 'kdr',
    header: 'KDR',
    class: 'text-center w-[70px] min-w-[70px] px-2'
  },
  {
    id: 'aces',
    accessorKey: 'aces',
    header: 'Aces',
    class: 'text-center w-[65px] min-w-[65px] px-2'
  },
  {
    id: 'headshots',
    accessorKey: 'headshots',
    header: 'Clutch',
    class: 'text-center w-[70px] min-w-[70px] px-2'
  }
]

const tableColumns = computed(() => createSortableColumns(rawColumns))

// ----------------------------------------------------
// 数据清洗与动态计算
// ----------------------------------------------------
const currentTableData = computed(() => {
  if (!players.value) return []

  let unsortedData = players.value.map(p => {
    const detail = p.details?.[currentCategory.value] || {}
    const rawScore = p.scores?.[currentCategory.value] || 0

    const k = detail.kills || 0
    const d = detail.deaths || 0
    const kdrValue = d === 0 ? k : (k / d)

    return {
      player: p.nickname,
      avatar: p.avatar,
      _rawScore: rawScore,
      score: rawScore.toFixed(2),
      kills: detail.kills || 0,
      deaths: detail.deaths || 0,
      kdr: kdrValue.toFixed(2),
      aces: detail.aces || 0,
      headshots: detail.headshots || 0
    }
  })

  if (currentCategory.value !== 'overall') {
    unsortedData = unsortedData.filter(item => item._rawScore > 0)
  }

  unsortedData.sort((a, b) => b._rawScore - a._rawScore)

  return unsortedData.map((item, index) => ({
    ...item,
    rank: index + 1
  }))
})

// ----------------------------------------------------
// 雷达图配置 (Top 3 领奖台)
// ----------------------------------------------------
const top3Charts = computed(() => {
  if (!players.value) return []

  return players.value.slice(0, 3).map(p => {
    const rawData = [
      Number((p.scores?.arena ?? 0).toFixed(2)),
      Number((p.scores?.rails ?? 0).toFixed(2)),
      Number((p.scores?.snipers ?? 0).toFixed(2)),
      Number((p.scores?.rockets ?? 0).toFixed(2)),
      Number((p.scores?.rays ?? 0).toFixed(2))
    ]

    return {
      name: p.nickname,
      avatar: p.avatar,
      overallScore: p.scores?.overall ? Number(p.scores.overall).toFixed(2) : '0.00',
      option: {
        tooltip: {
          trigger: 'item',
          backgroundColor: 'rgba(17, 24, 39, 0.9)',
          textStyle: { color: 'rgba(255, 255, 255, 0.8)', fontWeight: 'bold' },
          borderWidth: 0,
          formatter: () => `
            Arena: ${rawData[0]}<br/>
            Rails: ${rawData[1]}<br/>
            Snipers: ${rawData[2]}<br/>
            Rockets: ${rawData[3]}<br/>
            Rays: ${rawData[4]}
          `
        },
        radar: {
          indicator: [
            { name: 'Arena', max: 100 },
            { name: 'Rails', max: 100 },
            { name: 'Snipers', max: 100 },
            { name: 'Rockets', max: 100 },
            { name: 'Rays', max: 100 }
          ],
          radius: '65%',
          splitNumber: 5,
          axisName: { color: 'rgba(156, 163, 175, 0.8)', fontSize: 11, fontWeight: 'bold' },
          splitLine: {
            lineStyle: {
              color: [
                'transparent',
                'transparent',
                'rgba(156, 163, 175, 0.2)',
                'rgba(156, 163, 175, 0.2)',
                'rgba(156, 163, 175, 0.2)'
              ]
            }
          },
          splitArea: { show: false },
          axisLine: { lineStyle: { color: 'rgba(156, 163, 175, 0.2)' } }
        },
        series: [{
          type: 'radar',
          data: [{
            value: rawData,
            itemStyle: { color: 'rgb(16, 185, 129)' },
            areaStyle: { color: 'rgba(16, 185, 129, 0.2)' },
            lineStyle: { width: 2 }
          }]
        }]
      }
    }
  })
})
</script>

<template>
  <div class="px-4 md:px-6 mt-8 space-y-8 animate-fade-in pb-12">
    <!-- 加载骨架 -->
    <div v-if="pending" class="flex justify-center py-12">
      <UIcon name="i-lucide-refresh-cw" class="w-8 h-8 animate-spin text-gray-500" />
    </div>

    <template v-else-if="players && players.length > 0">
      <!-- 1. 頂尖選手领奖台区域 (与雀魂完全对齐的卡片层级) -->
      <section>
        <div class="flex flex-col sm:flex-row sm:items-end gap-3 mb-6">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white tracking-wide">
            頂尖選手 <span class="text-gray-400 dark:text-gray-500 font-normal text-lg ml-2">Top Performers</span>
          </h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div v-for="(chart, index) in top3Charts" :key="chart.name || index"
            class="bg-white dark:bg-[#18212f] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col relative group">
            <!-- 浮雕大名次水印 -->
            <div
              class="absolute -right-4 -top-8 text-[120px] font-black text-gray-50 dark:text-white/[0.02] pointer-events-none transition-transform group-hover:scale-110">
              #{{ index + 1 }}
            </div>

            <!-- 卡片头部信息 -->
            <div class="p-6 flex flex-col items-center z-10 border-b border-gray-100 dark:border-gray-800/50">
              <UAvatar :src="chart.avatar" :alt="chart.name" size="xl"
                class="ring-4 ring-gray-50 dark:ring-[#1e293b] shadow-lg mb-3 shrink-0 bg-gray-100 dark:bg-gray-800" />
              <h3 class="text-xl font-bold text-gray-900 dark:text-white">{{ chart.name }}</h3>
              <div class="mt-2 flex items-center gap-1 text-emerald-500 dark:text-emerald-400 font-black text-2xl">
                <span>{{ chart.overallScore }}</span>
                <span class="text-xs text-gray-400 font-medium tracking-widest ml-1">SCORE</span>
              </div>

              <div class="mt-1 flex items-center gap-1.5 text-sm font-semibold text-gray-500 dark:text-gray-400">
                <UIcon name="i-lucide-crosshair" class="w-4 h-4 opacity-70" />
                <span>综合战术评分</span>
              </div>
            </div>

            <!-- 雷达图容器 (统一呼吸感底色) -->
            <div
              class="p-6 flex-1 flex flex-col items-center justify-center min-h-[280px] bg-gray-50/50 dark:bg-transparent">
              <div class="relative w-full aspect-square max-w-[220px]">
                <ClientOnly>
                  <VChart v-if="chart.option" :option="chart.option" class="w-full h-full" autoresize />
                  <template #fallback>
                    <div class="w-full h-full flex items-center justify-center">
                      <UIcon name="i-lucide-refresh-cw" class="w-8 h-8 text-gray-400 animate-spin" />
                    </div>
                  </template>
                </ClientOnly>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 2. 綜合數據表格區域 (100% 鏡像對齊雀魂的 DOM 結構) -->
      <section>
        <div class="mb-6 border-b border-gray-200 dark:border-gray-800 pb-4 flex justify-between items-end">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white tracking-wide">
            綜合數據 <span class="text-gray-400 dark:text-gray-500 font-normal text-lg ml-2">Overall Statistics</span>
          </h2>
        </div>

        <!-- 核心修復：使用與雀魂完全相同的外層卡片容器，移除多餘的 bg-gray-900 與雙重邊框 -->
        <div
          class="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm w-full overflow-hidden detailed-stats-section">

          <!-- 模式切換 Tabs：不要在外層加 p-4 border-b，直接讓 Tabs 作為卡片頂部通欄 -->
          <UTabs :items="tabs" v-model="currentCategory" class="w-full" :ui="{
            wrapper: 'w-full',
            list: {
              background: 'bg-gray-100 dark:bg-[#0f172a]',
              // 翡翠绿药丸高亮
              indicator: 'bg-emerald-600 dark:bg-emerald-500 text-white shadow-sm',
              tab: {
                base: 'font-semibold transition-colors py-2'
              }
            }
          }">
            <!-- 核心修复：Nuxt UI 会自动依据 tabs 里的 icon 渲染且仅渲染一个图标！ -->
            <!-- 我们在插槽里只需要控制文字：移动端 hidden，大于 640px (sm:) 时 inline 展开 -->
            <template #default="{ item }">
              <span class="hidden sm:inline text-xs sm:text-sm whitespace-nowrap ml-1">
                {{ item.label }}
              </span>
            </template>
          </UTabs>

          <!-- 緊跟表格，直接吃滿底色，不再有雙層邊框嵌套 -->
          <BaseEsportsTable :columns="tableColumns" :data="currentTableData" :pinned-left="['rank', 'player']"
            min-width-class="min-w-[850px]">

            <!-- 排名插槽：保证在 60px 宽度内绝对居中不溢出 -->
            <template #rank-cell="{ row }">
              <div class="flex items-center justify-center w-full">
                <span class="font-black text-xs sm:text-base italic px-1.5 py-0.5 rounded transition-colors" :class="row.original.rank === 1
                  ? 'text-yellow-400 bg-yellow-400/10'
                  : row.original.rank === 2
                    ? 'text-slate-300 bg-slate-300/10'
                    : row.original.rank === 3
                      ? 'text-amber-600 bg-amber-600/10'
                      : 'text-gray-400 dark:text-gray-500'
                  ">
                  #{{ row.original.rank }}
                </span>
              </div>
            </template>

            <!-- 选手插槽：彻底锁定 min-w-0 确保单行优雅截断 -->
            <template #player-cell="{ row }">
              <div class="flex items-center gap-1.5 w-full min-w-0">
                <UAvatar :src="row.original.avatar" :alt="row.original.player" size="2xs"
                  class="shrink-0 ring-1 ring-gray-200 dark:ring-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold"
                  :ui="{ fallback: 'font-bold text-[9px] uppercase' }" />
                <span class="font-bold text-xs text-gray-900 dark:text-gray-100 truncate block min-w-0">
                  {{ row.original.player }}
                </span>
              </div>
            </template>

            <!-- 得分高亮 -->
            <template #score-cell="{ row }">
              <span class="font-mono font-bold text-emerald-500 text-sm">
                {{ row.original.score }}
              </span>
            </template>

            <!-- KDR 正負語義變色 -->
            <template #kdr-cell="{ row }">
              <span class="font-mono font-semibold text-sm"
                :class="parseFloat(row.original.kdr) >= 1.0 ? 'text-emerald-500' : 'text-rose-500'">
                {{ row.original.kdr }}
              </span>
            </template>

            <!-- 擊殺與死亡 -->
            <template #kills-cell="{ row }">
              <span class="font-mono text-sm text-gray-800 dark:text-gray-200 font-medium">
                {{ row.original.kills }}
              </span>
            </template>
            <template #deaths-cell="{ row }">
              <span class="font-mono text-sm text-gray-500 dark:text-gray-400">
                {{ row.original.deaths }}
              </span>
            </template>

            <!-- Aces & Clutch 表現 -->
            <template #aces-cell="{ row }">
              <span class="font-mono text-sm"
                :class="row.original.aces > 0 ? 'text-amber-500 font-bold' : 'text-gray-400 dark:text-gray-600'">
                {{ row.original.aces }}
              </span>
            </template>
            <template #headshots-cell="{ row }">
              <span class="font-mono text-sm"
                :class="row.original.headshots > 0 ? 'text-purple-500 dark:text-purple-400 font-bold' : 'text-gray-400 dark:text-gray-600'">
                {{ row.original.headshots }}
              </span>
            </template>
          </BaseEsportsTable>
        </div>
      </section>
    </template>

    <div v-else class="text-center py-12 text-gray-500">
      No stats available for this tournament yet.
    </div>
  </div>
</template>