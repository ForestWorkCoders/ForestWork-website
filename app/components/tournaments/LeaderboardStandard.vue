<script setup>
import { computed } from 'vue'

// 定義接收外部傳入的賽事 ID
const props = defineProps({
    tournamentId: {
        type: String,
        required: true
    }
})

// 呼叫 API 取得排行榜資料
const { data: leaderboardData, pending: leaderboardPending } = await useFetch(`/api/mahjong/tournaments/${props.tournamentId}/leaderboard`)

// 定義欄位 (從原本的 [id].vue 搬過來)
const leaderboardColumns = computed(() => {
    const baseColumns = [
        { accessorKey: 'rank', header: '排名' },
        { accessorKey: 'player', header: '玩家 (Player)' },
        { accessorKey: 'played', header: '出賽' },
        { accessorKey: 'total_pts', header: '總積分' }
    ]

    // 如果 API 還沒載入，先給個空陣列防呆；如果有資料，就依照 meta.totalGames 產出欄位
    const gamesCount = leaderboardData.value?.meta?.totalGames || 0
    const gameColumns = Array.from({ length: gamesCount }, (_, i) => ({
        accessorKey: `game_${i + 1}`, header: `G${i + 1}`, class: 'text-center font-mono text-xs'
    }))

    return [...baseColumns, ...gameColumns]
})
</script>

<template>
    <section>
        <div class="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-3">
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white tracking-wide">
                總積分榜 <span class="text-gray-400 dark:text-gray-500 font-normal text-lg ml-2">Leaderboard</span>
            </h2>
            <div v-if="leaderboardData?.meta"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 text-amber-600 dark:text-amber-400 text-xs font-bold tracking-wider">
                <UIcon name="i-lucide-info" class="w-4 h-4 shrink-0" />
                <span>需完成 {{ leaderboardData.meta.dnfThreshold }} 場對局始可進入正式排名(低於 {{
                    leaderboardData.meta.dnfThreshold }}
                    場標記為DNF)
                </span>
            </div>
        </div>

        <div
            class="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm w-full overflow-hidden">
            <UTable :columns="leaderboardColumns" :data="leaderboardData?.data || []" :loading="leaderboardPending" :ui="{
                wrapper: 'overflow-x-auto w-full',
                base: 'min-w-[1200px]',
                th: { color: 'text-gray-500 dark:text-gray-400', font: 'font-bold tracking-wider', base: 'whitespace-nowrap px-3 py-4' },
                td: { color: 'text-gray-900 dark:text-gray-200', base: 'px-3 py-3 border-r border-gray-50 dark:border-gray-800/50 last:border-r-0' }
            }">
                <template #rank-cell="{ row }">
                    <span v-if="row.original.rank === 'DNF'"
                        class="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-bold rounded">DNF</span>
                    <span v-else class="font-bold text-lg"
                        :class="{ 'text-amber-500': row.original.rank === 1, 'text-gray-400': row.original.rank === 2, 'text-amber-700 dark:text-amber-600': row.original.rank === 3 }">
                        #{{ row.original.rank }}
                    </span>
                </template>
                <template #player-cell="{ row }">
                    <div class="flex items-center gap-3">
                        <UAvatar :src="row.original.avatar" :alt="row.original.player" size="sm"
                            :ui="{ fallback: { text: 'font-bold text-gray-500' } }" />
                        <span
                            :class="row.original.rank === 'DNF' ? 'text-gray-400 dark:text-gray-500 line-through decoration-gray-300 dark:decoration-gray-700' : 'font-semibold whitespace-nowrap'">
                            {{ row.original.player }}
                        </span>
                    </div>
                </template>
                <template v-for="i in (leaderboardData?.meta?.totalGames || 16)" :key="i" #[`game_${i}-cell`]="{ row }">
                    <span v-if="row.original[`game_${i}`] !== undefined && row.original[`game_${i}`] !== null"
                        :class="row.original[`game_${i}`] > 0 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : row.original[`game_${i}`] < 0 ? 'text-red-500 dark:text-red-400 font-semibold' : 'text-gray-400 dark:text-gray-500'">
                        {{ row.original[`game_${i}`] > 0 ? '+' : '' }}{{ row.original[`game_${i}`] }}
                    </span>
                    <span v-else class="text-gray-300 dark:text-gray-700">-</span>
                </template>
            </UTable>
        </div>

                <div
                class="mt-4 p-6 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800/60 bg-gray-50/50 dark:bg-gray-900/20 flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 transition-colors">
                <UIcon name="i-lucide-sticky-note" class="w-6 h-6 mb-2 opacity-50" />
                <span class="text-sm font-medium tracking-wide">備註保留區塊 · Sidenotes</span>
                <p class="text-xs mt-1 opacity-70">未來的裁判備註或賽事附註將顯示於此</p>
            </div>
    </section>
</template>