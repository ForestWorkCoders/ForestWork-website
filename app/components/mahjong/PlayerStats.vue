<script setup>
import { ref, computed } from 'vue'
import { createSortableColumns } from '~/utils/table'

const props = defineProps({
  tournamentId: { type: String, required: true }
})

const { data: matchData, pending, error } = await useFetch(
  `/api/mahjong/tournaments/${props.tournamentId}/stats`
)

const { data: playstyleData, pending: playstylePending } = await useFetch(
  `/api/mahjong/tournaments/${props.tournamentId}/playstyle`
)

// A player needs this many games to get on the podium
const PODIUM_MIN_GAMES = 8

const top3Players = computed(() => {
  if (!matchData.value) return []

  return matchData.value
    // 1. 过滤：只允许打满 PODIUM_MIN_GAMES 局及以上的硬核玩家入场
    .filter(player => player.play_count >= PODIUM_MIN_GAMES)
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

// Radar axes from the player's playstyle row. Each axis has its own full mark;
// 放銃 is reversed (0% dealt in = full 20, 20% or more = 0) so bigger is always better.
function playstyleAxes(p) {
  if (!p) return null
  const n = (v) => Number(v) || 0
  const dealIn = n(p.deal_in_rate)
  return [
    { name: '和牌', max: 50, value: n(p.win_rate), display: `${n(p.win_rate)}%` },
    { name: '打點', max: 10000, value: n(p.avg_win_score), display: n(p.avg_win_score) },
    { name: '副露', max: 80, value: n(p.call_rate), display: `${n(p.call_rate)}%` },
    { name: '放銃', max: 20, value: Math.max(20 - dealIn, 0), display: `${dealIn}%` },
    { name: '立直', max: 80, value: n(p.riichi_rate), display: `${n(p.riichi_rate)}%` },
    { name: '自摸', max: 80, value: n(p.tsumo_rate), display: `${n(p.tsumo_rate)}%` }
  ]
}

const podiumEntries = computed(() => top3Players.value.map(player => ({
  key: player.player_id ?? player.nickname,
  name: player.nickname,
  avatar: player.avatar,
  value: player.avg_rank?.toFixed(2) ?? '–',
  sub: `${player.play_count} 場對局`,
  axes: playstyleAxes(playstyleData.value?.find(p => p.player_id === player.player_id))
})))

const items = [{
  value: 'match_stats',
  slot: 'match',
  label: '宏觀戰績 · Match Stats',
  icon: 'i-lucide-trophy'
}, {
  value: 'playstyle_stats',
  slot: 'playstyle',
  label: '打法風格 · Playstyle Stats',
  icon: 'i-lucide-chart-pie'
}]


const matchColumns = createSortableColumns([
  // 注意這裡：你的 SQL 返回的是 nickname，所以 accessorKey 必須是對應的字段名！
  { accessorKey: 'nickname', header: '選手' },
  { accessorKey: 'play_count', header: '場數' },
  { accessorKey: 'avg_rank', header: '平均順位', class: 'font-bold' },
  { accessorKey: 'east_count', header: '東風次數' },
  { accessorKey: 'avg_rank_east', header: '東風平均順位' },
  { accessorKey: 'south_count', header: '南風次數' },
  { accessorKey: 'avg_rank_south', header: '南風平均順位' },
  { accessorKey: 'west_count', header: '西風次數' },
  { accessorKey: 'avg_rank_west', header: '西風平均順位' },
  { accessorKey: 'top_rate_pct', header: '一位率' },
  { accessorKey: 'top2_rate_pct', header: '連對率' },
  { accessorKey: 'busting_rate', header: '被飛率' },
  { accessorKey: 'avg_score', header: '平均馬點' },
  { accessorKey: 'highest_point', header: '最高馬點' },
  { accessorKey: 'lowest_point', header: '最低馬點' }
])

const matchPercentStyles = [
  { key: 'top_rate_pct', color: 'text-amber-700 dark:text-amber-400 font-semibold' },
  { key: 'top2_rate_pct', color: 'text-blue-700 dark:text-blue-400 font-semibold' },
  { key: 'avoid_last_rate_pct', color: 'text-emerald-700 dark:text-emerald-400 font-semibold' },
  { key: 'busting_rate', color: 'text-red-700 dark:text-red-400 font-semibold' }
]

const playstyleColumns = createSortableColumns([
  { accessorKey: 'nickname', header: '選手' },
  { accessorKey: 'win_rate', header: '和牌率' },
  { accessorKey: 'deal_in_rate', header: '放銃率' },
  { accessorKey: 'tsumo_rate', header: '自摸率' },
  { accessorKey: 'dama_rate', header: '默聽率' },
  { accessorKey: 'exhaustive_draw_rate', header: '流局率' },
  { accessorKey: 'draw_tenpai_rate', header: '流局聽牌率' },
  { accessorKey: 'call_rate', header: '副露率' },
  { accessorKey: 'riichi_rate', header: '立直率' },
  { accessorKey: 'avg_turns', header: '平均和牌巡數' },
  { accessorKey: 'avg_win_score', header: '平均打點' },
  { accessorKey: 'avg_deal_in_score', header: '平均銃點' },
  { accessorKey: 'babei_rate_pct', header: '拔北率' },
  { accessorKey: 'avg_baopai', header: '平均寶牌' },
  { accessorKey: 'li_baopai_rate_pct', header: '裏寶率' }
])

const playPercentStyles = [
  { key: 'win_rate', color: 'text-emerald-700 dark:text-emerald-400' },
  { key: 'deal_in_rate', color: 'text-red-700 dark:text-red-400' },
  { key: 'tsumo_rate', color: 'text-blue-700 dark:text-blue-400' },
  { key: 'dama_rate', color: 'text-purple-700 dark:text-purple-400' },
  { key: 'exhaustive_draw_rate', color: 'text-muted' },
  { key: 'draw_tenpai_rate', color: 'text-amber-700 dark:text-amber-400' },
  { key: 'call_rate', color: 'text-orange-700 dark:text-orange-400' },
  { key: 'riichi_rate', color: 'text-rose-700 dark:text-rose-400' },
  { key: 'babei_rate_pct', color: 'text-teal-700 dark:text-teal-400' },
  { key: 'li_baopai_rate_pct', color: 'text-pink-700 dark:text-pink-400' }
]
</script>

<template>
  <div class="px-4 md:px-6 mt-8 space-y-8 animate-fade-in pb-12">

    <!-- Early in a cup nobody has enough games yet; the podium says so instead of showing nothing -->
    <TournamentPodium :entries="podiumEntries" value-label="AVG RANK"
      sub-icon="i-lucide-swords"
      :empty-text="`尚無選手打滿 ${PODIUM_MIN_GAMES} 場 · No player has ${PODIUM_MIN_GAMES} games yet`" />

    <section>
      <div class="mb-6 border-b border-gray-200 dark:border-default pb-4 flex justify-between items-end">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white tracking-wide">
          綜合數據 · Overall Statistics
        </h2>
      </div>

      <div
        class="bg-white dark:bg-elevated rounded-xl border border-gray-200 dark:border-default shadow-sm w-full overflow-hidden detailed-stats-section">
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
                <span class="font-mono font-extrabold text-gray-900 dark:text-white text-sm">
                  {{ row.original.avg_rank != null ? row.original.avg_rank.toFixed(2) : '–' }}
                </span>
              </template>

              <!-- 核心优化：动态驱动所有百分比字段（一位率、连对率、避四率、被飞率），带防空与 % -->
              <template v-for="col in matchPercentStyles" #[`${col.key}-cell`]="{ row }" :key="col.key">
                <span :class="['font-mono text-sm', col.color]">
                  {{ row.original[col.key] != null ? `${row.original[col.key]}%` : '–' }}
                </span>
              </template>

              <!-- 最高马点（正分高光绿） -->
              <template #highest_point-cell="{ row }">
                <span class="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                  {{ row.original.highest_point != null ? `+${row.original.highest_point}` : '–' }}
                </span>
              </template>

              <!-- 最低马点（负分警示红） -->
              <template #lowest_point-cell="{ row }">
                <span class="font-mono font-semibold text-red-700 dark:text-red-400">
                  {{ row.original.lowest_point ?? '–' }}
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
                  {{ row.original[col.key] != null ? `${row.original[col.key]}%` : '–' }}
                </span>
              </template>

              <template #avg_win_score-cell="{ row }">
                <span class="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                  {{ row.original.avg_win_score != null ? `+${row.original.avg_win_score}` : '–' }}
                </span>
              </template>

              <template #avg_deal_in_score-cell="{ row }">
                <span class="font-mono font-semibold text-red-700 dark:text-red-400">
                  {{ row.original.avg_deal_in_score != null ? `-${row.original.avg_deal_in_score}` : '–' }}
                </span>
              </template>

              <template #avg_baopai-cell="{ row }">
                <span class="font-mono font-bold text-amber-700 dark:text-amber-500">
                  {{ row.original.avg_baopai ?? '–' }}
                </span>
              </template>
            </BaseEsportsTable>
          </template>

        </UTabs>
      </div>
    </section>

  </div>
</template>