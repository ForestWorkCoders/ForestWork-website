<script setup>
import { ref, computed } from 'vue'
import { createSortableColumns } from '~/utils/table'

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
    class: 'text-center w-[60px] min-w-[60px] max-w-[60px] z-[2] bg-white dark:bg-elevated border-r border-gray-100 dark:border-default px-1'
  },
  {
    id: 'player',
    accessorKey: 'player',
    header: 'Player',
    // 关键：TanStack 尺寸必须严格等于 110px
    size: 110,
    class: 'text-left w-[110px] min-w-[110px] max-w-[110px] z-[1] bg-white dark:bg-elevated pl-2 pr-1'
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
// Top 3 podium: overall score + one radar axis per weapon class (0–100)
// ----------------------------------------------------
const RADAR_AXES = [
  ['Arena', 'arena'], ['Rails', 'rails'], ['Snipers', 'snipers'], ['Rockets', 'rockets'], ['Rays', 'rays']
]

const podiumEntries = computed(() => (players.value ?? []).slice(0, 3).map(p => ({
  key: p.nickname,
  name: p.nickname,
  avatar: p.avatar,
  value: p.scores?.overall ? Number(p.scores.overall).toFixed(2) : '0.00',
  sub: '綜合戰術評分',
  axes: RADAR_AXES.map(([name, key]) => {
    const v = Number((p.scores?.[key] ?? 0).toFixed(2))
    return { name, max: 100, value: v, display: v }
  })
})))
</script>

<template>
  <div class="px-4 md:px-6 mt-8 space-y-8 animate-fade-in pb-12">
    <!-- 加载骨架 -->
    <div v-if="pending" class="flex justify-center py-12">
      <UIcon name="i-lucide-refresh-cw" class="w-8 h-8 animate-spin text-dimmed" />
    </div>

    <template v-else-if="players && players.length > 0">
      <TournamentPodium :entries="podiumEntries" value-label="SCORE" value-class="text-emerald-700 dark:text-emerald-400"
        sub-icon="i-lucide-crosshair" />

      <!-- 2. 綜合數據表格區域 (100% 鏡像對齊雀魂的 DOM 結構) -->
      <section>
        <div class="mb-6 border-b border-gray-200 dark:border-default pb-4 flex justify-between items-end">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white tracking-wide">
            綜合數據 <span class="text-muted font-normal text-lg ml-2">Overall Statistics</span>
          </h2>
        </div>

        <!-- 核心修復：使用與雀魂完全相同的外層卡片容器，移除多餘的 bg-gray-900 與雙重邊框 -->
        <div
          class="bg-white dark:bg-elevated rounded-xl border border-gray-200 dark:border-default shadow-sm w-full overflow-hidden detailed-stats-section">

          <!-- 模式切換 Tabs：不要在外層加 p-4 border-b，直接讓 Tabs 作為卡片頂部通欄 -->
          <UTabs :items="tabs" v-model="currentCategory" class="w-full">
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
                <span class="font-extrabold text-xs sm:text-base italic px-1.5 py-0.5 rounded transition-colors" :class="row.original.rank === 1
                  ? 'text-yellow-700 dark:text-yellow-400 bg-yellow-400/10'
                  : row.original.rank === 2
                    ? 'text-slate-500 dark:text-slate-300 bg-slate-300/10'
                    : row.original.rank === 3
                      ? 'text-amber-800 dark:text-amber-600 bg-amber-600/10'
                      : 'text-muted'
                  ">
                  #{{ row.original.rank }}
                </span>
              </div>
            </template>

            <!-- 选手插槽：彻底锁定 min-w-0 确保单行优雅截断 -->
            <template #player-cell="{ row }">
              <div class="flex items-center gap-1.5 w-full min-w-0">
                <UAvatar :src="row.original.avatar" :alt="row.original.player" size="xs"
                  class="shrink-0 ring-1 ring-gray-200 dark:ring-default bg-gray-100 dark:bg-accented text-gray-700 dark:text-gray-300 font-bold"
                  :ui="{ fallback: 'font-bold uppercase' }" />
                <span class="font-bold text-xs text-gray-900 dark:text-gray-100 truncate block min-w-0">
                  {{ row.original.player }}
                </span>
              </div>
            </template>

            <!-- 得分高亮 -->
            <template #score-cell="{ row }">
              <span class="font-mono font-bold text-emerald-700 dark:text-emerald-500 text-sm">
                {{ row.original.score }}
              </span>
            </template>

            <!-- KDR 正負語義變色 -->
            <template #kdr-cell="{ row }">
              <span class="font-mono font-semibold text-sm"
                :class="parseFloat(row.original.kdr) >= 1.0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'">
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
              <span class="font-mono text-sm text-muted">
                {{ row.original.deaths }}
              </span>
            </template>

            <!-- Aces & Clutch 表現 -->
            <template #aces-cell="{ row }">
              <span class="font-mono text-sm"
                :class="row.original.aces > 0 ? 'text-amber-700 dark:text-amber-500 font-bold' : 'text-muted'">
                {{ row.original.aces }}
              </span>
            </template>
            <template #headshots-cell="{ row }">
              <span class="font-mono text-sm"
                :class="row.original.headshots > 0 ? 'text-purple-700 dark:text-purple-400 font-bold' : 'text-muted'">
                {{ row.original.headshots }}
              </span>
            </template>
          </BaseEsportsTable>
        </div>
      </section>
    </template>

    <div v-else class="text-center py-12 text-muted">
      No stats available for this tournament yet.
    </div>
  </div>
</template>