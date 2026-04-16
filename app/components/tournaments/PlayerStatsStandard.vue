<script setup>
// 接收外部傳入的賽事 ID (為未來的 API 串接做準備)
const props = defineProps({
  tournamentId: {
    type: String,
    required: true
  }
})

// ==========================================
// ★ 玩家數據 (Player Stats) 假資料 ★
// TODO：await useFetch(`/api/mahjong/tournaments/${props.tournamentId}/stats`)
// ==========================================
const statsColumns = [
  { accessorKey: 'rank', header: '排名' },
  { accessorKey: 'player', header: '玩家 (Player)' },
  { accessorKey: 'played', header: '對局數' },
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
  { accessorKey: 'avg_rank', header: '平均順位', class: 'text-right' },
  { accessorKey: 'busting_rate', header: '被飛率', class: 'text-right' }
]

const mockPlayerStats = [
  {
    rank: 1, avatar: 'https://i.pravatar.cc/150?u=1', player: 'Alpha', played: 16,
    win_rate: 28.5, deal_in_rate: 10.2, tsumo_rate: 35.0, dama_rate: 12.0, exhaustive_draw_rate: 15.0,
    draw_tenpai_rate: 40.0, call_rate: 32.5, riichi_rate: 22.0, avg_turns: 11.2,
    avg_win_score: 6500, avg_deal_in_score: 4200, avg_rank: 1.85, busting_rate: 0.0
  },
  {
    rank: 2, avatar: 'https://i.pravatar.cc/150?u=2', player: 'Beta', played: 16,
    win_rate: 25.0, deal_in_rate: 12.5, tsumo_rate: 30.0, dama_rate: 8.0, exhaustive_draw_rate: 16.0,
    draw_tenpai_rate: 35.0, call_rate: 45.0, riichi_rate: 15.0, avg_turns: 10.5,
    avg_win_score: 5200, avg_deal_in_score: 5000, avg_rank: 2.10, busting_rate: 5.0
  },
  {
    rank: 3, avatar: 'https://i.pravatar.cc/150?u=3', player: 'Gamma', played: 15,
    win_rate: 22.0, deal_in_rate: 15.0, tsumo_rate: 25.0, dama_rate: 15.0, exhaustive_draw_rate: 14.0,
    draw_tenpai_rate: 50.0, call_rate: 20.0, riichi_rate: 30.0, avg_turns: 12.8,
    avg_win_score: 8000, avg_deal_in_score: 6500, avg_rank: 2.30, busting_rate: 10.0
  }
]

const top3Players = mockPlayerStats.slice(0, 3)
</script>

<template>
  <div class="px-4 md:px-6 mt-8 space-y-8 animate-fade-in pb-12">

    <section>
      <div class="flex flex-col sm:flex-row sm:items-end gap-3 mb-6">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white tracking-wide">
          頂尖選手 <span class="text-gray-400 dark:text-gray-500 font-normal text-lg ml-2">Top Performers</span>
        </h2>
        
        <div class="flex items-center gap-1.5 px-2.5 py-1 mb-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 text-blue-600 dark:text-blue-400 text-[11px] font-bold tracking-widest uppercase">
          <UIcon name="i-heroicons-beaker" class="w-3.5 h-3.5" />
          <span>Example Data · 真實數據即將上線</span>
        </div>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div 
          v-for="(player, index) in top3Players" 
          :key="player.player"
          class="bg-white dark:bg-[#18212f] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col relative group"
        >
          <div class="absolute -right-4 -top-8 text-[120px] font-black text-gray-50 dark:text-white/[0.02] pointer-events-none transition-transform group-hover:scale-110">
            #{{ index + 1 }}
          </div>

          <div class="p-6 flex flex-col items-center z-10 border-b border-gray-100 dark:border-gray-800/50">
            <UAvatar 
              :src="player.avatar" 
              :alt="player.player" 
              size="xl" 
              class="ring-4 ring-gray-50 dark:ring-[#1e293b] shadow-lg mb-3"
            />
            <h3 class="text-xl font-bold text-gray-900 dark:text-white">{{ player.player }}</h3>
            <div class="mt-2 flex items-center gap-1 text-amber-500 dark:text-amber-400 font-black text-2xl">
              <span>{{ player.avg_rank.toFixed(2) }}</span>
              <span class="text-xs text-gray-400 font-medium tracking-widest ml-1">AVG RANK</span>
            </div>
          </div>

          <div class="p-6 flex-1 flex flex-col items-center justify-center min-h-[280px] bg-gray-50/50 dark:bg-transparent">
            <div class="relative w-full aspect-square max-w-[220px] rounded-full border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center">
              <UIcon name="i-heroicons-chart-pie" class="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
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
          綜合數據 <span class="text-gray-400 dark:text-gray-500 font-normal text-lg ml-2">Overall Statistics</span>
        </h2>
      </div>

      <div class="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm w-full overflow-hidden">
        <UTable 
          :columns="statsColumns" 
          :data="mockPlayerStats"
          :ui="{
            wrapper: 'overflow-x-auto w-full',
            base: 'min-w-[1600px]',
            th: { color: 'text-gray-500 dark:text-gray-400', font: 'font-bold tracking-wider', base: 'whitespace-nowrap px-4 py-4 bg-gray-50 dark:bg-[#18212f]' },
            td: { color: 'text-gray-900 dark:text-gray-200', base: 'px-4 py-3 border-b border-gray-50 dark:border-gray-800/50' }
          }"
        >
          <template #rank-cell="{ row }">
            <span class="font-black text-lg" :class="row.original.rank <= 3 ? 'text-amber-500' : 'text-gray-500'">#{{ row.original.rank }}</span>
          </template>
          <template #player-cell="{ row }">
            <div class="flex items-center gap-3">
              <UAvatar :src="row.original.avatar" :alt="row.original.player" size="sm" />
              <span class="font-bold text-sm">{{ row.original.player }}</span>
            </div>
          </template>
          <template v-for="col in ['win_rate', 'deal_in_rate', 'tsumo_rate', 'dama_rate', 'exhaustive_draw_rate', 'draw_tenpai_rate', 'call_rate', 'riichi_rate', 'busting_rate']" :key="col" #[`${col}-cell`]="{ row }">
            <span class="font-mono text-sm" :class="col === 'deal_in_rate' || col === 'busting_rate' ? 'text-red-400' : 'text-emerald-400'">{{ row.original[col].toFixed(1) }}%</span>
          </template>
          <template v-for="col in ['avg_turns', 'avg_rank']" :key="col" #[`${col}-cell`]="{ row }">
            <span class="font-mono text-sm font-bold text-gray-700 dark:text-gray-300">{{ row.original[col].toFixed(2) }}</span>
          </template>
          <template v-for="col in ['avg_win_score', 'avg_deal_in_score']" :key="col" #[`${col}-cell`]="{ row }">
            <span class="font-mono text-sm text-amber-600 dark:text-amber-400">{{ row.original[col].toLocaleString() }}</span>
          </template>
        </UTable>
      </div>
    </section>

  </div>
</template>