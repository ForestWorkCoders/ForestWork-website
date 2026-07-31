<script setup>
import { ref, computed } from 'vue'
import { use } from 'echarts/core'
import { RadarChart } from 'echarts/charts'
import { TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'

use([RadarChart, TooltipComponent, CanvasRenderer])

const props = defineProps({
  tournamentId: { type: String, required: true }
})

// ----------------------------------------------------
// 数据获取 (不再需要中间层 API，直接透过 useAsyncData + RPC)
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
  { label: 'Overall', key: 'overall' },
  { label: 'Arena', key: 'arena' },
  { label: 'Rails', key: 'rails' },
  { label: 'Snipers', key: 'snipers' },
  { label: 'Rockets', key: 'rockets' },
  { label: 'Rays', key: 'rays' }
]
const activeTabIndex = ref(0)
const currentCategory = computed(() => tabs[activeTabIndex.value].key)

// ----------------------------------------------------
// 表格配置与动态数据映射
// ----------------------------------------------------
const tableColumns = [
  { accessorKey: 'rank', header: 'Rank' },
  { accessorKey: 'player', header: 'Player' },
  { accessorKey: 'score', header: 'Score' },
  { accessorKey: 'kills', header: 'Kills' },
  { accessorKey: 'deaths', header: 'Deaths' },
  { accessorKey: 'kdr', header: 'KDR' },
  { accessorKey: 'aces', header: 'Aces' },
  { accessorKey: 'headshots', header: 'Clutch' },
  // { accessorKey: 'double_kills', header: '2K' },
  // { accessorKey: 'triple_kills', header: '3K' },
  // { accessorKey: 'quad_kills', header: '4K' },
  // { accessorKey: 'penta_kills', header: '5K' }
]

const currentTableData = computed(() => {
  if (!players.value) return []

  // 第一步：提取当前 Tab 的所有相关数据，保留未格式化的数字(rawScore)用于数学比对
  let unsortedData = players.value.map(p => {
    const detail = p.details[currentCategory.value] || {}
    const rawScore = p.scores[currentCategory.value] || 0

    // 提取击杀和死亡，准备计算
    const k = detail.kills || 0
    const d = detail.deaths || 0
    // 斯巴达式除零保护：死亡为 0 时 KDR 就是击杀数本身
    const kdrValue = d === 0 ? k : (k / d)

    return {
      player: p.nickname,
      avatar: p.avatar,
      _rawScore: rawScore, // 这个下划线开头的变量只在暗中用于精准排序
      score: rawScore.toFixed(2),
      kills: detail.kills || 0,
      deaths: detail.deaths || 0,
      kdr: kdrValue.toFixed(2),
      aces: detail.aces || 0,
      headshots: detail.headshots || 0,
      // double_kills: detail.double_kills || 0,
      // triple_kills: detail.triple_kills || 0,
      // quad_kills: detail.quad_kills || 0,
      // penta_kills: detail.penta_kills || 0
    }
  })

  if (currentCategory.value !== 'overall') {
    unsortedData = unsortedData.filter(item => item._rawScore > 0)
  }

  // 第二步：极其暴力的降序排序 (Highest first)
  unsortedData.sort((a, b) => b._rawScore - a._rawScore)

  // 第三步：既然真正的强者已经浮到了最上面，现在赋予他们应得的 Rank
  return unsortedData.map((item, index) => ({
    ...item,
    rank: index + 1
  }))
})

// ----------------------------------------------------
// 雷达图配置 (前三名)
// ----------------------------------------------------
const top3Charts = computed(() => {
  if (!players.value) return []

  // 只截取前3名渲染雷达图
  return players.value.slice(0, 3).map(p => {

    // 1. 提取物理真实数据
    const rawData = [
      Number((p.scores.arena).toFixed(2)) || 0,
      Number((p.scores.rails).toFixed(2)) || 0,
      Number((p.scores.snipers).toFixed(2)) || 0,
      Number((p.scores.rockets).toFixed(2)) || 0,
      Number((p.scores.rays).toFixed(2)) || 0
    ]

    return {
      name: p.nickname,
      avatar: p.avatar,
      overallScore: p.scores.overall ? Number(p.scores.overall).toFixed(2) : '0.00',

      // 2. 组装 ECharts 专属 Option
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
          // 直接定义 5 维武器/地图指标，满分全部钉死在 100
          indicator: [
            { name: 'Arena', max: 100 },
            { name: 'Rails', max: 100 },
            { name: 'Snipers', max: 100 },
            { name: 'Rockets', max: 100 },
            { name: 'Rays', max: 100 }
          ],
          radius: '65%',
          splitNumber: 5, // 将 0-100 分成 5 圈 (20, 40, 60, 80, 100)
          axisName: { color: 'rgba(156, 163, 175, 0.8)', fontSize: 11, fontWeight: 'bold' },

          // 🔥 核心魔法：复刻你的去噪逻辑！从内到外，只显示 60, 80, 100 的蜘蛛网
          splitLine: {
            lineStyle: {
              color: [
                'transparent',                 // 20 分线: 隐形
                'transparent',                 // 40 分线: 隐形
                'rgba(156, 163, 175, 0.2)',    // 60 分线: 显形 (及格线)
                'rgba(156, 163, 175, 0.2)',    // 80 分线: 显形
                'rgba(156, 163, 175, 0.2)'     // 100 分线: 显形
              ]
            }
          },
          splitArea: { show: false }, // 隐藏雷达图默认的丑陋黑白交替背景
          axisLine: { lineStyle: { color: 'rgba(156, 163, 175, 0.2)' } } // 从中心射出的对角线
        },
        series: [{
          type: 'radar',
          data: [{
            value: rawData,
            itemStyle: { color: 'rgb(16, 185, 129)' }, // Emerald 500
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
  <div class="space-y-8">
    <div v-if="pending" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-500" />
    </div>

    <template v-else-if="players && players.length > 0">
      <div class="flex flex-col sm:flex-row sm:items-end gap-3 mb-6">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white tracking-wide">
          頂尖選手 <span class="text-gray-400 dark:text-gray-500 font-normal text-lg ml-2">Top Performers</span>
        </h2>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div v-for="(chart, index) in top3Charts" :key="index"
          class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 flex flex-col items-center shadow-sm relative">

          <div class="absolute top-4 left-4 font-black text-2xl"
            :class="index === 0 ? 'text-amber-400' : index === 1 ? 'text-gray-400' : 'text-amber-700'">
            #{{ index + 1 }}
          </div>

          <UAvatar :src="chart.avatar" :alt="chart.name" size="xl" class="mb-2" />
          <h3 class="font-bold text-lg">{{ chart.name }}</h3>
          <div class="text-3xl font-black text-emerald-500 my-2">{{ chart.overallScore }}</div>
          <div class="text-xs text-gray-500 uppercase tracking-widest mb-4">Final Score</div>

          <div class="w-full max-w-[200px] aspect-square">
            <ClientOnly>
              <VChart v-if="chart.option" :option="chart.option" class="w-full h-full" autoresize />

              <template #fallback>
                <div class="w-full h-full flex items-center justify-center">
                  <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-gray-400 animate-spin" />
                </div>
              </template>
            </ClientOnly>
          </div>
        </div>
      </div>

      <div class="mb-6 border-b border-gray-200 dark:border-gray-800 pb-4 flex justify-between items-end">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white tracking-wide">
          綜合數據 <span class="text-gray-400 dark:text-gray-500 font-normal text-lg ml-2">Overall Statistics</span>
        </h2>
      </div>

      <div
        class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
        <UTabs :items="tabs" v-model="activeTabIndex" class="px-4 pt-4" />

        <UTable :columns="tableColumns" :data="currentTableData" :ui="{ wrapper: 'overflow-x-auto' }">
          <template #rank-cell="{ row }">
            <span class="font-black text-lg" :class="row.original.rank <= 3 ? 'text-amber-500' : 'text-gray-500'">
              #{{ row.original.rank }}
            </span>
          </template>

          <template #player-cell="{ row }">
            <div class="flex items-center gap-3">
              <UAvatar :src="row.original.avatar" :alt="row.original.player" size="sm" />
              <span class="font-bold text-sm">{{ row.original.player }}</span>
            </div>
          </template>

          <template #score-cell="{ row }">
            <span class="font-mono font-bold text-emerald-500">{{ row.original.score }}</span>
          </template>

          <template #kdr-cell="{ row }">
            <span class="font-mono font-bold"
              :class="parseFloat(row.original.kdr) >= 1.00 ? 'text-emerald-500' : 'text-rose-500'">
              {{ row.original.kdr }}
            </span>
          </template>
        </UTable>
      </div>
    </template>

    <div v-else class="text-center py-12 text-gray-500">
      No stats available for this tournament yet.
    </div>
  </div>
</template>
