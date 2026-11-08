<script setup>
import { ref, computed } from 'vue'
import { createSortableColumns } from '~/utils/table'
import { use } from 'echarts/core'
import { RadarChart } from 'echarts/charts'
import { TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'

use([RadarChart, TooltipComponent, CanvasRenderer])

const props = defineProps({
  tournamentId: { type: String, required: true }
})

const { data: matchData, pending, error } = await useFetch(
  `/api/mahjong/tournaments/${props.tournamentId}/stats`
)

const { data: playstyleData, pending: playstylePending } = await useFetch(
  `/api/mahjong/tournaments/${props.tournamentId}/playstyle`
)

const top3Players = computed(() => {
  if (!matchData.value) return []

  return matchData.value
    // 1. 过滤：只允许打满 8 局及以上的硬核玩家入场
    .filter(player => player.play_count >= 8)
    // 2. 排序：主要按平均顺位升序 (越低越牛)；如果顺位相同，按打的场数降序 (场数越多含金量越高)
    .sort((a, b) => {
      if (a.avg_rank === b.avg_rank) {
        return b.play_count - a.play_count // Tie-breaker
      }
      return a.avg_rank - b.avg_rank
    })
    // 3. 截取：只拿前三名上领奖台
    .slice(0, 3)
})

// ====== 雷达图数据引擎 ======
// ----------------------------------------------------
// 魔法引擎：将麻将的真实数据，转化为 0-100 的雷达图分数
// ----------------------------------------------------
const radarConfigs = computed(() => {
  if (!top3Players.value || !playstyleData.value) return []

  return top3Players.value.map(matchPlayer => {

    const tacticalData = playstyleData.value.find(
      p => p.player_id === matchPlayer.player_id
    )

    // 如果因为极端原因没找到这个人，返回防爆数据
    if (!tacticalData) return null

    // 1. 提取真实数据 (注意：现在是从 tacticalData 里取值，而不是 matchPlayer)
    const rawData = {
      win: Number(tacticalData.win_rate) || 0,
      power: Number(tacticalData.avg_win_score) || 0,
      call: Number(tacticalData.call_rate) || 0,
      def: Number(tacticalData.deal_in_rate) || 0,
      riichi: Number(tacticalData.riichi_rate) || 0,
      tsumo: Number(tacticalData.tsumo_rate) || 0
    }

    // 2. 防御轴单独做数学反转 (满分20，0放铳=20，20放铳=0)
    const reversedDef = Math.max(20 - rawData.def, 0)

    // 3. 返回 ECharts 专属的声明式 Option
    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        textStyle: { color: 'rgba(255, 255, 255, 0.8)', fontWeight: 'bold' },
        borderWidth: 0,
        // 自定义 Tooltip 显示真实的业务数据
        formatter: () => `
          和牌: ${rawData.win}%<br/>
          打点: ${rawData.power}<br/>
          副露: ${rawData.call}%<br/>
          放铳: ${rawData.def}% <br/>
          立直: ${rawData.riichi}%<br/>
          自摸: ${rawData.tsumo}%
        `
      },
      radar: {
        // ECharts 天生支持给每个维度设定独立的满分线！
        indicator: [
          { name: '和牌', max: 50 },     // 50% 为满格
          { name: '打点', max: 10000 },   // 10000 分满格
          { name: '副露', max: 80 },     // 80% 为满格
          { name: '放铳', max: 20 },     // 反转后的放铳值（20为满格）
          { name: '立直', max: 80 },     // 80% 为满格
          { name: '自摸', max: 80 }      // 80% 为满格
        ],
        radius: '65%', // 控制雷达图的大小留出文字空间
        splitNumber: 5,
        axisName: { color: 'rgba(156, 163, 175, 0.8)', fontSize: 11, fontWeight: 'bold' },
        splitLine: { lineStyle: { color: 'rgba(156, 163, 175, 0.15)' } },
        splitArea: { show: false }, // 隐藏背景色块交替
        axisLine: { lineStyle: { color: 'rgba(156, 163, 175, 0.2)' } }
      },
      series: [{
        type: 'radar',
        data: [{
          value: [rawData.win, rawData.power, rawData.call, reversedDef, rawData.riichi, rawData.tsumo],
          itemStyle: { color: 'rgb(16, 185, 129)' }, // Emerald 500
          areaStyle: { color: 'rgba(16, 185, 129, 0.2)' },
          lineStyle: { width: 2 }
        }]
      }]
    }
  })
})

const items = [{
  value: 'match_stats',
  slot: 'match',
  label: '宏观战绩 (Match Stats)',
  icon: 'i-lucide-trophy'
}, {
  value: 'playstyle_stats',
  slot: 'playstyle',
  label: '打法风格 (Playstyle Stats)',
  icon: 'i-lucide-chart-pie'
}]


const matchColumns = createSortableColumns([
  // 注意這裡：你的 SQL 返回的是 nickname，所以 accessorKey 必須是對應的字段名！
  { accessorKey: 'nickname', header: '选手' },
  { accessorKey: 'play_count', header: '场数' },
  { accessorKey: 'avg_rank', header: '平均顺位', class: 'font-bold' },
  { accessorKey: 'east_count', header: '東風次數' },
  { accessorKey: 'avg_rank_east', header: '東風平均順位' },
  { accessorKey: 'south_count', header: '南風次數' },
  { accessorKey: 'avg_rank_south', header: '南風平均順位' },
  { accessorKey: 'west_count', header: '西風次數' },
  { accessorKey: 'avg_rank_west', header: '西風平均順位' },
  { accessorKey: 'top_rate_pct', header: '一位率' },
  { accessorKey: 'top2_rate_pct', header: '连对率' },
  { accessorKey: 'busting_rate', header: '被飛率' },
  { accessorKey: 'avg_score', header: '平均馬點' },
  { accessorKey: 'highest_point', header: '最高馬點' },
  { accessorKey: 'lowest_point', header: '最低馬點' }
])

const matchPercentStyles = [
  { key: 'top_rate_pct', color: 'text-amber-500 dark:text-amber-400 font-semibold' },
  { key: 'top2_rate_pct', color: 'text-blue-500 dark:text-blue-400 font-semibold' },
  { key: 'avoid_last_rate_pct', color: 'text-emerald-500 dark:text-emerald-400 font-semibold' },
  { key: 'busting_rate', color: 'text-red-500 dark:text-red-400 font-semibold' }
]

const playstyleColumns = createSortableColumns([
  { accessorKey: 'nickname', header: '选手' },
  { accessorKey: 'win_rate', header: '和牌率' },
  { accessorKey: 'deal_in_rate', header: '放铳率' },
  { accessorKey: 'tsumo_rate', header: '自摸率' },
  { accessorKey: 'dama_rate', header: '默听率' },
  { accessorKey: 'exhaustive_draw_rate', header: '流局率' },
  { accessorKey: 'draw_tenpai_rate', header: '流局听牌率' },
  { accessorKey: 'call_rate', header: '副露率' },
  { accessorKey: 'riichi_rate', header: '立直率' },
  { accessorKey: 'avg_turns', header: '平均和牌巡数' },
  { accessorKey: 'avg_win_score', header: '平均打点' },
  { accessorKey: 'avg_deal_in_score', header: '平均铳点' },
  { accessorKey: 'babei_rate_pct', header: '拔北率' },
  { accessorKey: 'avg_baopai', header: '平均宝牌' },
  { accessorKey: 'li_baopai_rate_pct', header: '里宝率' }
])

const playPercentStyles = [
  { key: 'win_rate', color: 'text-emerald-500 dark:text-emerald-400' },
  { key: 'deal_in_rate', color: 'text-red-500 dark:text-red-400' },
  { key: 'tsumo_rate', color: 'text-blue-500 dark:text-blue-400' },
  { key: 'dama_rate', color: 'text-purple-500 dark:text-purple-400' },
  { key: 'exhaustive_draw_rate', color: 'text-gray-500 dark:text-gray-400' },
  { key: 'draw_tenpai_rate', color: 'text-amber-500 dark:text-amber-400' },
  { key: 'call_rate', color: 'text-orange-500 dark:text-orange-400' },
  { key: 'riichi_rate', color: 'text-rose-500 dark:text-rose-400' },
  { key: 'babei_rate_pct', color: 'text-teal-500 dark:text-teal-400' },
  { key: 'li_baopai_rate_pct', color: 'text-pink-500 dark:text-pink-400' }
]
</script>

<template>
  <div class="px-4 md:px-6 mt-8 space-y-8 animate-fade-in pb-12">

    <section>
      <div class="flex flex-col sm:flex-row sm:items-end gap-3 mb-6">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white tracking-wide">
          頂尖選手 <span class="text-gray-400 dark:text-gray-500 font-normal text-lg ml-2">Top Performers</span>
        </h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div v-for="(player, index) in top3Players" :key="player.nickname || index"
          class="bg-white dark:bg-[#18212f] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col relative group">

          <div
            class="absolute -right-4 -top-8 text-[120px] font-black text-gray-50 dark:text-white/[0.02] pointer-events-none transition-transform group-hover:scale-110">
            #{{ index + 1 }}
          </div>

          <div class="p-6 flex flex-col items-center z-10 border-b border-gray-100 dark:border-gray-800/50">
            <UAvatar :src="player.avatar" :alt="player.nickname" size="xl"
              class="ring-4 ring-gray-50 dark:ring-[#1e293b] shadow-lg mb-3" />
            <h3 class="text-xl font-bold text-gray-900 dark:text-white">{{ player.nickname }}</h3>
            <div class="mt-2 flex items-center gap-1 text-amber-500 dark:text-amber-400 font-black text-2xl">
              <span>{{ player.avg_rank?.toFixed(2) ?? '-' }}</span>
              <span class="text-xs text-gray-400 font-medium tracking-widest ml-1">AVG RANK</span>
            </div>

            <div class="mt-1 flex items-center gap-1.5 text-sm font-semibold text-gray-500 dark:text-gray-400">
              <UIcon name="i-lucide-swords" class="w-4 h-4 opacity-70" />
              <span>{{ player.play_count }} 场对局</span>
            </div>
          </div>

          <div
            class="p-6 flex-1 flex flex-col items-center justify-center min-h-[280px] bg-gray-50/50 dark:bg-transparent">
            <div class="relative w-full aspect-square max-w-[220px]">
              <ClientOnly>
                <VChart v-if="radarConfigs[index]" :option="radarConfigs[index]" class="w-full h-full" autoresize />
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

    <section>
      <div class="mb-6 border-b border-gray-200 dark:border-gray-800 pb-4 flex justify-between items-end">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white tracking-wide">
          综合数据 <span class="text-gray-400 dark:text-gray-500 font-normal text-lg ml-2">Overall Statistics</span>
        </h2>
      </div>

      <div
        class="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm w-full overflow-hidden detailed-stats-section">
        <UTabs :items="items" default-value="match_stats" class="w-full">

          <!-- 1. 宏观战绩 Tab -->
          <template #match>
            <BaseEsportsTable :columns="matchColumns" :data="matchData" :loading="pending" :pinned-left="['nickname']"
              min-width-class="min-w-[1600px]">
              <!-- 选手列保持头像 + 名字 -->
              <template #nickname-cell="{ row }">
                <div class="flex items-center gap-3">
                  <UAvatar :src="row.original.avatar" :alt="row.original.nickname" size="sm" />
                  <span class="font-bold text-sm text-gray-900 dark:text-gray-100">{{ row.original.nickname }}</span>
                </div>
              </template>

              <!-- 平均顺位加粗高亮 -->
              <template #avg_rank-cell="{ row }">
                <span class="font-mono font-black text-amber-500 dark:text-amber-400 text-sm">
                  {{ row.original.avg_rank != null ? row.original.avg_rank.toFixed(2) : '-' }}
                </span>
              </template>

              <!-- 核心优化：动态驱动所有百分比字段（一位率、连对率、避四率、被飞率），带防空与 % -->
              <template v-for="col in matchPercentStyles" #[`${col.key}-cell`]="{ row }" :key="col.key">
                <span :class="['font-mono text-sm', col.color]">
                  {{ row.original[col.key] != null ? `${row.original[col.key]}%` : '-' }}
                </span>
              </template>

              <!-- 最高马点（正分高光绿） -->
              <template #highest_point-cell="{ row }">
                <span class="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                  {{ row.original.highest_point != null ? `+${row.original.highest_point}` : '-' }}
                </span>
              </template>

              <!-- 最低马点（负分警示红） -->
              <template #lowest_point-cell="{ row }">
                <span class="font-mono font-semibold text-red-600 dark:text-red-400">
                  {{ row.original.lowest_point ?? '-' }}
                </span>
              </template>
            </BaseEsportsTable>
          </template>

          <!-- 2. 打法风格 Tab -->
          <template #playstyle>
            <BaseEsportsTable :columns="playstyleColumns" :data="playstyleData" :loading="playstylePending"
              :pinned-left="['nickname']" min-width-class="min-w-[1800px]">
              <template #nickname-cell="{ row }">
                <div class="flex items-center gap-3">
                  <UAvatar :src="row.original.avatar" :alt="row.original.nickname" size="sm" />
                  <span class="font-bold text-sm">{{ row.original.nickname }}</span>
                </div>
              </template>

              <template v-for="col in playPercentStyles" #[`${col.key}-cell`]="{ row }" :key="col.key">
                <span :class="['font-mono', col.color]">
                  {{ row.original[col.key] != null ? `${row.original[col.key]}%` : '-' }}
                </span>
              </template>

              <template #avg_win_score-cell="{ row }">
                <span class="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                  {{ row.original.avg_win_score != null ? `+${row.original.avg_win_score}` : '-' }}
                </span>
              </template>

              <template #avg_deal_in_score-cell="{ row }">
                <span class="font-mono font-semibold text-red-600 dark:text-red-400">
                  {{ row.original.avg_deal_in_score != null ? `-${row.original.avg_deal_in_score}` : '-' }}
                </span>
              </template>

              <template #avg_baopai-cell="{ row }">
                <span class="font-mono font-bold text-amber-500">
                  {{ row.original.avg_baopai ?? '-' }}
                </span>
              </template>
            </BaseEsportsTable>
          </template>

        </UTabs>
      </div>
    </section>

  </div>
</template>