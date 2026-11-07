<script setup>
import { computed } from 'vue'

const props = defineProps({
    tournamentId: { type: String, required: true }
})

// 1. 獲取資料 (這裡可以接同一支 API，或者你另外寫的 Relay API)
const { data: phasesData, pending, error } = await useFetch(`/api/mahjong/tournaments/${props.tournamentId}/relay-leaderboard`)

// 2. 動態生成表頭欄位 (隊伍專用版)
const getColumns = (gameCount) => {
    const baseCols = [
        { id: 'rank', accessorKey: 'rank', header: 'RANK', class: 'text-center w-20' },
        // 將 PLAYER 改為 TEAM，並加寬一點以容納隊伍名稱
        { id: 'team', accessorKey: 'name', header: 'TEAM (隊伍)', class: 'min-w-[180px]' },
        { id: 'total', accessorKey: 'total', header: 'TOTAL', class: 'text-center w-24' }
    ]

    const roleNames = {
        1: '先鋒戰',
        2: '中堅戰',
        3: '大將戰'
    }

    const gameCols = Array.from({ length: gameCount }, (_, i) => {
        const gameIndex = i + 1
        return {
            id: `game_${gameIndex}`,
            accessorKey: `game_${gameIndex}`,
            // 如果有對應的職位就顯示中文，如果超過 3 局就退回 G4, G5
            header: roleNames[gameIndex] || `G${gameIndex}`,
            class: 'text-center text-gray-500 w-20 font-bold tracking-widest' // 加寬一點以塞下三個中文字
        }
    })

    return [...baseCols, ...gameCols]
}

// 3. 晉級/淘汰 高亮邏輯 (沿用完美設計)
const getRankColor = (phase, rank) => {
    if (phase.isFinal) {
        if (rank === 1) return 'text-yellow-400 bg-yellow-400/10'
        if (rank === 2) return 'text-slate-300 bg-slate-300/10'
        if (rank === 3) return 'text-amber-600 bg-amber-600/10'
        return 'text-gray-500'
    } else {
        const isPromoted = phase.promotedRanks
            ? phase.promotedRanks.includes(rank)
            : rank <= (phase.promotionCount || 0)

        const isDisqualified = phase.disqualifiedRanks
            ? phase.disqualifiedRanks.includes(rank)
            : false

        if (isPromoted) {
            return 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 shadow-[0_0_10px_rgba(52,211,153,0.1)]'
        }
        if (isDisqualified) {
            return 'text-red-400 bg-red-400/10 border border-red-400/20 opacity-75'
        }
        return 'text-gray-500'
    }
}
</script>

<template>
    <div class="space-y-16">
        <div v-if="pending" class="flex justify-center py-12">
            <UIcon name="i-lucide-loader-2" class="animate-spin w-8 h-8 text-emerald-500" />
        </div>
        <div v-else-if="error"
            class="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-500 text-center font-bold tracking-wide">
            載入失敗: {{ error.message }}
        </div>

        <div v-else-if="!phasesData || phasesData.length === 0"
            class="text-center py-16 bg-gray-50 dark:bg-[#1e293b] rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
            <UIcon name="i-heroicons-document-magnifying-glass" class="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 class="text-lg font-bold text-gray-900 dark:text-white">尚無賽程與積分資料</h3>
            <p class="text-sm text-gray-500 mt-1">No phases data available for this tournament.</p>
        </div>

        <template v-else v-for="phase in phasesData" :key="phase.id">
            <section class="space-y-6 animate-fade-in">

                <div class="border-b border-gray-200 dark:border-gray-800 pb-4 flex items-center justify-between">
                    <h2
                        class="text-3xl font-black tracking-tight text-gray-900 dark:text-white uppercase flex items-center gap-3">
                        <UIcon :name="phase.isFinal ? 'i-heroicons-trophy' : 'i-heroicons-flag'"
                            :class="phase.isFinal ? 'text-yellow-500 w-8 h-8' : 'text-emerald-500 w-7 h-7'" />
                        <span :class="phase.isFinal ? 'text-yellow-500' : 'text-emerald-500'">
                            {{ phase.title }}
                        </span>
                        <span class="text-gray-400 dark:text-gray-500 font-normal text-xl tracking-wider">
                            {{ phase.subtitle }}
                        </span>
                    </h2>
                </div>

                <div
                    class="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                    <UTable :columns="getColumns(phase.gameCount)" :data="phase.leaderboard"
                        :ui="{ td: { padding: 'py-4 px-4' }, th: { padding: 'py-3 px-4', color: 'text-gray-500 dark:text-gray-400' } }">
                        <template #rank-cell="{ row }">
                            <div class="text-center font-black text-xl italic px-2 py-1 rounded transition-colors"
                                :class="getRankColor(phase, row.original.rank)">
                                #{{ row.original.rank }}
                            </div>
                        </template>

                        <template #team-cell="{ row }">
                            <div class="flex items-center gap-3 group">
                                <UAvatar :src="row.original.avatar" :alt="row.original.name" size="sm"
                                    class="ring-1 ring-gray-200 dark:ring-gray-700 bg-white shadow-sm transition-transform group-hover:scale-105"
                                    :ui="{ rounded: 'rounded-md' }" />
                                <span class="font-bold text-gray-900 dark:text-gray-100 tracking-wide">{{
                                    row.original.name }}</span>
                            </div>
                        </template>

                        <template #total-cell="{ row }">
                            <div class="text-center font-black text-lg font-mono text-gray-900 dark:text-white">
                                {{ row.original.total }}
                            </div>
                        </template>

                        <template v-for="i in phase.gameCount" :key="i" #[`game_${i}-cell`]="{ row }">
                            <div class="text-center font-mono text-sm font-medium"
                                :class="row.original[`game_${i}`] > 0 ? 'text-emerald-600 dark:text-emerald-400' : row.original[`game_${i}`] < 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-600'">
                                {{ row.original[`game_${i}`] > 0 ? '+' : '' }}{{ row.original[`game_${i}`] ?? '-' }}
                            </div>
                        </template>

                    </UTable>
                </div>

                <div
                    class="mt-4 p-6 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800/60 bg-gray-50/50 dark:bg-gray-900/20 flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 transition-colors">
                    <UIcon name="i-lucide-sticky-note" class="w-6 h-6 mb-2 opacity-50" />
                    <span class="text-sm font-medium tracking-wide">備註保留區塊 · Sidenotes</span>
                    <p class="text-xs mt-1 opacity-70">未來的裁判備註或賽事附註將顯示於此</p>
                </div>

                <div v-if="phase.matches && phase.matches.length > 0" class="mt-8">
                    <div class="mb-4 border-b border-gray-100 dark:border-gray-800/50 pb-2">
                        <h3
                            class="text-lg font-bold text-gray-800 dark:text-gray-200 tracking-wide flex items-center gap-2">
                            <UIcon name="i-lucide-swords" class="w-5 h-5 text-gray-400" />
                            階段對局紀錄
                        </h3>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <TournamentsMatchCard v-for="match in phase.matches" :key="match.id" :match="match" />
                    </div>
                </div>

            </section>
        </template>
    </div>
</template>