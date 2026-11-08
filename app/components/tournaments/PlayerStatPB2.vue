<script setup>
import { ref, computed } from 'vue'
import { Radar } from 'vue-chartjs'
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip } from 'chart.js'

// 注册 Chart.js 核心组件
ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip)

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
  return players.value.slice(0, 3).map(p => ({
    name: p.nickname,
    avatar: p.avatar,
    overallScore: p.scores.overall ? p.scores.overall.toFixed(2) : '0.00',
    chartData: {
      labels: ['Arena', 'Rails', 'Snipers', 'Rockets', 'Rays'],
      datasets: [{
        backgroundColor: 'rgba(16, 185, 129, 0.2)', // Tailwind emerald-500/20
        borderColor: 'rgb(16, 185, 129)',
        pointBackgroundColor: 'rgb(16, 185, 129)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgb(16, 185, 129)',
        data: [
          p.scores.arena || 0, 
          p.scores.rails || 0, 
          p.scores.snipers || 0, 
          p.scores.rockets || 0, 
          p.scores.rays || 0
        ]
      }]
    }
  }))
})

// 锁定雷达图刻度为 0 - 100，并隐藏多余图例
const chartOptions = {
  responsive: true,
  maintainAspectRatio: true,
  scales: {
    r: {
      min: 0,
      max: 100,
      ticks: { 
        stepSize: 10,
        display: false // 依然隐藏刻度数字，保持雷达图干净
      },
      grid: { 
        // 核心魔法：只有遇到 0 或者 >= 60 的刻度时，才画出蜘蛛网
        color: (context) => {
          if (context.tick.value === 0 || context.tick.value >= 60) {
            return 'rgba(156, 163, 175, 0.2)'; // Tailwind gray-400 的 20% 透明度
          }
          return 'transparent'; // 把 10, 20, 30, 40, 50 的网格线彻底隐形
        }
      },
      angleLines: { 
        color: 'rgba(156, 163, 175, 0.2)' // 保持从中心射出的 5 条对角线
      }
    }
  },
  plugins: {
    legend: { display: false },
    tooltip: { enabled: true }
  }
}
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
            <Radar :data="chart.chartData" :options="chartOptions" />
          </div>
        </div>
      </div>

      <div class="mb-6 border-b border-gray-200 dark:border-gray-800 pb-4 flex justify-between items-end">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white tracking-wide">
          綜合數據 <span class="text-gray-400 dark:text-gray-500 font-normal text-lg ml-2">Overall Statistics</span>
        </h2>
      </div>

      <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
        <UTabs :items="tabs" v-model="activeTabIndex" class="px-4 pt-4" />
        
        <UTable 
          :columns="tableColumns" 
          :data="currentTableData"
          :ui="{ wrapper: 'overflow-x-auto' }"
        >
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
            <span 
              class="font-mono font-bold" 
              :class="parseFloat(row.original.kdr) >= 1.00 ? 'text-emerald-500' : 'text-rose-500'"
            >
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

