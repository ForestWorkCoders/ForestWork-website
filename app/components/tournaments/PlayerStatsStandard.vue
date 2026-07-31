<script setup>
import { ref, computed, h, resolveComponent } from 'vue'
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

// 默认让 nickname 列死死钉在左侧
const columnPinning = ref({
  left: ['nickname'],
  right: []
})

function buildSortableColumns(rawColumns) {
  return rawColumns.map(col => ({
    accessorKey: col.accessorKey,
    header: ({ column }) => {
      // 我们只保留 UIcon，抛弃 UButton
      const UIcon = resolveComponent('UIcon')
      const isSorted = column.getIsSorted()

      // 直接渲染原生的 <button> 标签
      return h('button', {
        // 使用原生 flex 布局，加上 group 类名方便做悬停特效
        class: 'flex items-center gap-1.5 focus:outline-none group w-full whitespace-nowrap flex-nowrap',
        onClick: () => column.toggleSorting(isSorted === 'asc')
      }, [
        // 节点 1：确保绝对会渲染出来的表头文字
        h('span', {
          class: 'font-bold tracking-wider text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors whitespace-nowrap'
        }, col.header),

        // 节点 2：动态排序图标
        h(UIcon, {
          name: isSorted
            ? (isSorted === 'asc' ? 'i-lucide-arrow-up-narrow-wide' : 'i-lucide-arrow-down-narrow-wide')
            : 'i-lucide-arrow-up-down',
          // 如果没排序，图标稍微变淡；排序了就高亮
          class: [
            'shrink-0 w-4 h-4',
            isSorted ? 'text-emerald-500' : 'text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity'
          ].join(' ')
        })
      ])
    }
  }))
}

const matchColumns = buildSortableColumns([
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

const playstyleColumns = buildSortableColumns([
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

const percentStyles = [
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
                    <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-gray-400 animate-spin" />
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

          <template #match>
            <UTable v-model:column-pinning="columnPinning" :columns="matchColumns" :data="matchData" :ui="{
              wrapper: 'overflow-x-auto w-full',
              base: 'min-w-[1600px] border-collapse',
              th: {
                color: 'text-gray-500 dark:text-gray-400',
                font: 'font-bold tracking-wider',
                base: 'whitespace-nowrap px-4 py-4 bg-gray-50 dark:bg-[#18212f]'
              },
              td: {
                color: 'text-gray-900 dark:text-gray-200',
                base: 'px-4 py-3 border-b border-gray-50 dark:border-gray-800/50'
              }
            }">
              <template #nickname-cell="{ row }">
                <div class="flex items-center gap-3">
                  <UAvatar :src="row.original.avatar" :alt="row.original.nickname" size="sm" />
                  <span class="font-bold text-sm">{{ row.original.nickname }}</span>
                </div>
              </template>

              <template #avoid_last_rate_pct-cell="{ row }">
                <span class="text-emerald-500 font-mono">{{ row.original.avoid_last_rate_pct }}%</span>
              </template>
            </UTable>
          </template>

          <template #playstyle>
            <UTable v-model:column-pinning="columnPinning" :columns="playstyleColumns" :data="playstyleData" :ui="{
              wrapper: 'overflow-x-auto w-full',
              base: 'min-w-[1800px]', /* 随着列数增加，稍微放宽基础宽度 */
              th: {
                color: 'text-gray-500 dark:text-gray-400',
                font: 'font-bold tracking-wider',
                base: 'whitespace-nowrap px-4 py-4 bg-gray-50 dark:bg-[#18212f]'
              },
              td: {
                color: 'text-gray-900 dark:text-gray-200',
                base: 'px-4 py-3 border-b border-gray-50 dark:border-gray-800/50'
              }
            }">

              <template #nickname-cell="{ row }">
                <div class="flex items-center gap-3">
                  <UAvatar :src="row.original.avatar" :alt="row.original.nickname" size="sm" />
                  <span class="font-bold text-sm">{{ row.original.nickname }}</span>
                </div>
              </template>

              <template v-for="col in percentStyles" #[`${col.key}-cell`]="{ row }" :key="col.key">
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

            </UTable>
          </template>

        </UTabs>
      </div>
    </section>

  </div>
</template>