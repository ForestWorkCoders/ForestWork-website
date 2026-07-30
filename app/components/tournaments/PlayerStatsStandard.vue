<script setup>
import { ref, computed, h, resolveComponent } from 'vue'

const props = defineProps({
  tournamentId: {
    type: String,
    required: true
  }
})

const { data: matchData, pending, error } = await useFetch(
  `/api/mahjong/tournaments/${props.tournamentId}/stats`
)

const playstyleData = ref([])

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
  { accessorKey: 'win_rate', header: '和牌率', class: 'text-right' },
  { accessorKey: 'deal_in_rate', header: '放銃率', class: 'text-right' },
  { accessorKey: 'tsumo_rate', header: '自摸率', class: 'text-right' },
  { accessorKey: 'dama_rate', header: '默聽率', class: 'text-right' },
  { accessorKey: 'exhaustive_draw_rate', header: '流局率', class: 'text-right' },
  { accessorKey: 'draw_tenpai_rate', header: '流局聽牌率', class: 'text-right' },
  { accessorKey: 'call_rate', header: '副露率', class: 'text-right' },
  { accessorKey: 'riichi_rate', header: '立直率', class: 'text-right' },
  { accessorKey: 'avg_turns', header: '平均和牌巡數', class: 'text-right' },
  { accessorKey: 'avg_win_score', header: '平均打點', class: 'text-right' },
  { accessorKey: 'avg_deal_in_score', header: '平均銃點', class: 'text-right' },
])
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
            <div
              class="relative w-full aspect-square max-w-[220px] rounded-full border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center">
              <UIcon name="i-lucide-chart-pie" class="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
              <span class="absolute mt-12 text-xs text-gray-400 font-mono tracking-widest">RADAR CHART AREA</span>
              <span class="absolute -top-4 text-[10px] font-bold text-gray-500">和牌率</span>
              <span class="absolute -right-6 top-1/4 text-[10px] font-bold text-gray-500">自摸</span>
              <span class="absolute -right-6 bottom-1/4 text-[10px] font-bold text-gray-500">副露</span>
              <span class="absolute -bottom-4 text-[10px] font-bold text-gray-500">速度</span>
              <span class="absolute -left-6 bottom-1/4 text-[10px] font-bold text-gray-500">立直</span>
              <span class="absolute -left-6 top-1/4 text-[10px] font-bold text-gray-500">防禦</span>
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
            <UTable :columns="matchColumns" :data="matchData" :ui="{
              wrapper: 'overflow-x-auto w-full',
              base: 'min-w-[1600px]',
              th: { color: 'text-gray-500 dark:text-gray-400', font: 'font-bold tracking-wider', base: 'whitespace-nowrap px-4 py-4 bg-gray-50 dark:bg-[#18212f]' },
              td: { color: 'text-gray-900 dark:text-gray-200', base: 'px-4 py-3 border-b border-gray-50 dark:border-gray-800/50' }
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
            <UTable :columns="playstyleColumns" :data="playstyleData" :ui="{
              wrapper: 'overflow-x-auto w-full',
              base: 'min-w-[1600px]',
              th: { color: 'text-gray-500 dark:text-gray-400', font: 'font-bold tracking-wider', base: 'whitespace-nowrap px-4 py-4 bg-gray-50 dark:bg-[#18212f]' },
              td: { color: 'text-gray-900 dark:text-gray-200', base: 'px-4 py-3 border-b border-gray-50 dark:border-gray-800/50' }
            }">
              <template #nickname-cell="{ row }">
                <div class="flex items-center gap-3">
                  <UAvatar :src="row.original.avatar" :alt="row.original.nickname" size="sm" />
                  <span class="font-bold text-sm">{{ row.original.nickname }}</span>
                </div>
              </template>

              <template #deal_in_rate-cell="{ row }">
                <span class="text-red-400 font-mono">{{ row.original.deal_in_rate }}%</span>
              </template>
            </UTable>
          </template>

        </UTabs>
      </div>
    </section>

  </div>
</template>