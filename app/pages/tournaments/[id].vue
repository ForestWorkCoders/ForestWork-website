<script setup>
const route = useRoute()

// 呼叫我們剛寫好的 API，並帶上網址列的 ID
const { data: tourney, pending, error } = await useFetch(`/api/mahjong/tournaments/${route.params.id}`)

// 2. 取得真實的排行榜資料 (串接我們的 Nitro API)
const { data: leaderboardData, pending: leaderboardPending } = await useFetch(`/api/mahjong/tournaments/${route.params.id}/leaderboard`)

// 3. 取得對局紀錄資料 (同樣串接 Nitro API)
const { data: matchHistory, pending: matchesPending } = await useFetch(`/api/mahjong/tournaments/${route.params.id}/matches`)

// 定義下方的導覽標籤
const tabs = [
    { label: '賽事資訊 · Information', slot: 'info' },
    { label: '賽事結果 · Result', slot: 'result' },
    { label: '玩家數據 · Player Stats', slot: 'stats' },
    { label: '直播記錄 · VODs', slot: 'vods' }
]


// ==========================================
// ★ UI 測試用假資料 (未來由 API 替換) ★
// ==========================================

// 1. 總積分榜資料
// 1. 固定欄位
const baseColumns = [
    { accessorKey: 'rank', header: '排名' },
    { accessorKey: 'player', header: '玩家 (Player)' },
    { accessorKey: 'played', header: '出賽' },
    { accessorKey: 'total_pts', header: '總積分' }
]

// 2. 自動生成 Game 1 到 Game 16
const gameColumns = Array.from({ length: 16 }, (_, i) => ({
    accessorKey: `game_${i + 1}`,
    header: `G${i + 1}`, // 縮寫成 G1, G2... 節省寬度
    class: 'text-center font-mono text-xs' // 讓數字置中並使用等寬字體
}))

// 拿掉 mock 字眼，變成正式的變數
const leaderboardColumns = [...baseColumns, ...gameColumns]

// 2. 對局紀錄資料 (依回合與桌次分組)
const mockMatchHistory = [
    {
        id: 'round-1-a1',
        round: '第一回合',
        table: 'G1A組',
        time: '2022-01-05 20:00',
        color: 'text-blue-600 dark:text-blue-400',
        players: [
            { seat: '東', name: 'Alpha', score: 35000, pts: 35.0 },
            { seat: '南', name: 'Beta', score: 25300, pts: 5.3 },
            { seat: '西', name: '派派', score: 11500, pts: -28.5 },
            { seat: '北', name: 'C組', score: 28200, pts: 8.2 }
        ]
    },
    {
        id: 'round-1-a2',
        round: '第一回合',
        table: 'G1B組',
        time: '2022-01-05 20:00',
        color: 'text-emerald-600 dark:text-emerald-400',
        players: [
            { seat: '東', name: 'Gamma', score: 40000, pts: 40.0 },
            { seat: '南', name: 'Delta', score: 20000, pts: 0.0 },
            { seat: '西', name: 'Echo', score: 10000, pts: -30.0 },
            { seat: '北', name: 'Zeta', score: 30000, pts: 10.0 }
        ]
    }
]
</script>

<template>
    <div v-if="error" class="min-h-screen flex items-center justify-center text-white">
        <p class="text-xl">載入失敗：{{ error.message }}</p>
    </div>

    <div v-else-if="pending" class="min-h-screen flex items-center justify-center text-white">
        <UIcon name="i-heroicons-arrow-path" class="animate-spin w-8 h-8" />
    </div>

    <div v-else
        class="min-h-screen bg-gray-50 dark:bg-[#1a1b26] bg-[url('https://webusstatic.yo-star.com/mj-us-tournament-h5/prod/assets/bg.e1efdef8.png')] bg-cover bg-fixed bg-center">

        <div class="min-h-screen bg-black/50 backdrop-blur-sm pt-20 pb-12">

            <UContainer class="max-w-6xl">
                <div
                    class="bg-white/90 dark:bg-[#1a1b26] text-gray-900 dark:text-white rounded-t-xl overflow-hidden shadow-2xl flex flex-col md:flex-row p-8 md:p-16 gap-12 items-center md:items-start border border-gray-200 dark:border-gray-800 transition-colors duration-300">

                    <div class="flex flex-col items-center gap-6 shrink-0">
                        <UAvatar :src="tourney.imageUrl" :alt="tourney.title" size="3xl"
                            class="w-48 h-48 text-5xl drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                            :ui="{ rounded: 'rounded-xl', fallback: { text: 'font-bold text-gray-400' } }" />

                        <UButton color="info" variant="outline" icon="i-heroicons-arrow-down-tray"
                            class="w-full justify-center font-bold tracking-widest text-sm hover:bg-white hover:text-black transition-colors">
                            Rules · 賽規
                        </UButton>
                    </div>

                    <div class="flex-1 w-full space-y-8">
                        <h1 class="text-3xl md:text-5xl font-bold tracking-tight">{{ tourney.title }}</h1>

                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-8 gap-x-6">

                            <div class="space-y-1">
                                <p class="text-xs font-bold text-gray-400 tracking-wider">時程 · Duration</p>
                                <p class="text-sm font-semibold">{{ tourney.duration }}</p>
                            </div>

                            <div class="space-y-1">
                                <p class="text-xs font-bold text-gray-400 tracking-wider">狀態 · Status</p>
                                <p class="text-sm font-semibold"
                                    :class="tourney.status.includes('進行中') ? 'text-green-400' : 'text-gray'">
                                    {{ tourney.status }}
                                </p>
                            </div>

                            <div class="space-y-1">
                                <p class="text-xs font-bold text-gray-400 tracking-wider">主辦方 · Organizer</p>
                                <p class="text-sm font-semibold">{{ tourney.organizer }}</p>
                            </div>

                            <div class="space-y-1">
                                <p class="text-xs font-bold text-gray-400 tracking-wider">參賽賽區 · Venue</p>
                                <p class="text-sm font-semibold">{{ tourney.region }}</p>
                            </div>

                            <div class="space-y-1">
                                <p class="text-xs font-bold text-gray-400 tracking-wider">賽事級別 · Tier</p>
                                <p class="text-sm font-semibold">Tier {{ tourney.tier }}</p>
                            </div>

                        </div>
                    </div>
                </div>

                <div class="bg-white/90 dark:bg-[#1a1b26] w-full border-b border-gray-700">
                    <UTabs :items="tabs" class="w-full" :ui="{
                        list: {
                            background: 'bg-transparent',
                            rounded: 'rounded-none',
                            padding: 'p-0',
                            marker: { background: 'bg-emerald-600/20 dark:bg-emerald-500/20', rounded: 'rounded-none' },
                            tab: {
                                rounded: 'rounded-none',
                                active: 'text-emerald-400 border-b-2 border-emerald-400',
                                inactive: 'text-gray-400 hover:text-white',
                                padding: 'py-4 px-6',
                                font: 'font-bold tracking-wider'
                            }
                        }
                    }">
                        <template #info>
                            <div
                                class="bg-white/90 dark:bg-[#1a1b26] w-full h-[600px] mt-2 rounded-lg flex items-center justify-center">
                                <span class="text-gray-500 font-bold tracking-widest">CONTENT PLACEHOLDER</span>
                            </div>
                        </template>

                        <template #result>
                            <div class="bg-white/90 dark:bg-[#1a1b26] px-4 md:px-6 mt-2 space-y-12 animate-fade-in">

                                <section>
                                    <div class="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-2">
                                        <h2 class="text-2xl font-bold text-gray-900 dark:text-white tracking-wide">
                                            總積分榜 <span
                                                class="text-gray-400 dark:text-gray-500 font-normal text-lg ml-2">Leaderboard</span>
                                        </h2>
                                        <div
                                            class="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-md border border-amber-200 dark:border-amber-800/50">
                                            <UIcon name="i-heroicons-information-circle" class="w-4 h-4" />
                                            <span>需完成 8 場對局始可進入正式排名 (低於 8 場標記為 DNF)</span>
                                        </div>
                                    </div>

                                    <div
                                        class="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                                        <UTable :columns="leaderboardColumns" :data="leaderboardData || []"
                                            :loading="leaderboardPending" :ui="{
                                                wrapper: 'overflow-x-auto w-full',
                                                base: 'min-w-[1200px]',
                                                th: {
                                                    color: 'text-gray-500 dark:text-gray-400',
                                                    font: 'font-bold tracking-wider',
                                                    base: 'whitespace-nowrap px-3 py-4'
                                                },
                                                td: {
                                                    color: 'text-gray-900 dark:text-gray-200',
                                                    base: 'px-3 py-3 border-r border-gray-50 dark:border-gray-800/50 last:border-r-0'
                                                }
                                            }">
                                            <template #rank-cell="{ row }">
                                                <span v-if="row.original.rank === 'DNF'"
                                                    class="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-bold rounded">
                                                    DNF
                                                </span>
                                                <span v-else class="font-bold text-lg" :class="{
                                                    'text-amber-500': row.original.rank === 1,
                                                    'text-gray-400': row.original.rank === 2,
                                                    'text-amber-700 dark:text-amber-600': row.original.rank === 3
                                                }">
                                                    #{{ row.original.rank }}
                                                </span>
                                            </template>

                                            <template #player-cell="{ row }">
                                                <div class="flex items-center gap-3">
                                                    <UAvatar :src="row.original.avatar" :alt="row.original.player"
                                                        size="sm"
                                                        :ui="{ fallback: { text: 'font-bold text-gray-500' } }" />
                                                    <span
                                                        :class="row.original.rank === 'DNF' ? 'text-gray-400 dark:text-gray-500 line-through decoration-gray-300 dark:decoration-gray-700' : 'font-semibold whitespace-nowrap'">
                                                        {{ row.original.player }}
                                                    </span>
                                                </div>
                                            </template>

                                            <template v-for="i in 16" :key="i" #[`game_${i}-cell`]="{ row }">
                                                <span
                                                    v-if="row.original[`game_${i}`] !== undefined && row.original[`game_${i}`] !== null"
                                                    :class="row.original[`game_${i}`] > 0 ? 'text-emerald-500 font-semibold' : row.original[`game_${i}`] < 0 ? 'text-red-400 font-semibold' : 'text-gray-400'">
                                                    {{ row.original[`game_${i}`] > 0 ? '+' : '' }}{{
                                                        row.original[`game_${i}`] }}
                                                </span>
                                                <span v-else class="text-gray-300 dark:text-gray-700">-</span>
                                            </template>
                                        </UTable>
                                    </div>
                                </section>

                                <section>
                                    <div class="mb-6 border-b border-gray-200 dark:border-gray-800 pb-4">
                                        <h2 class="text-2xl font-bold text-gray-900 dark:text-white tracking-wide">
                                            對局紀錄 <span
                                                class="text-gray-400 dark:text-gray-500 font-normal text-lg ml-2">Match
                                                Details</span>
                                        </h2>
                                    </div>

                                    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

                                        <div v-if="matchesPending"
                                            class="col-span-full py-12 flex justify-center text-gray-500">
                                            <UIcon name="i-heroicons-arrow-path" class="animate-spin w-8 h-8" />
                                        </div>

                                        <div v-else-if="!matchHistory || matchHistory.length === 0"
                                            class="col-span-full py-12 text-center text-gray-500 bg-gray-50 dark:bg-gray-800/20 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                                            目前尚無對局紀錄
                                        </div>

                                        <div v-else v-for="match in matchHistory" :key="match.id"
                                            class="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col">
                                            <div
                                                class="px-5 py-3 border-b border-gray-100 dark:border-gray-700/50 flex justify-between items-center bg-gray-50/80 dark:bg-[#18212f]">

                                                <NuxtLink :to="match.paipu_url" target="_blank"
                                                    class="flex items-center gap-2 group cursor-pointer">
                                                    <span
                                                        class="font-black tracking-widest text-sm text-blue-600 dark:text-blue-400 group-hover:text-blue-500 dark:group-hover:text-blue-300 transition-colors">
                                                        {{ match.table }}
                                                        <UIcon name="i-heroicons-arrow-top-right-on-square"
                                                            class="inline-block w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </span>
                                                    <span
                                                        class="text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded group-hover:bg-gray-300 dark:group-hover:bg-gray-700 transition-colors">
                                                        {{ match.round }}
                                                    </span>
                                                </NuxtLink>

                                                <span class="text-xs text-gray-500 dark:text-gray-400 font-mono">{{
                                                    match.time }}</span>
                                            </div>

                                            <div class="p-0 flex-1 bg-white dark:bg-[#1e293b]">
                                                <table class="w-full text-sm text-left">
                                                    <thead
                                                        class="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                                                        <tr>
                                                            <th class="px-4 py-3 font-medium w-12">起莊</th>
                                                            <th class="px-4 py-3 font-medium">玩家</th>
                                                            <th class="px-4 py-3 font-medium text-right">得分</th>
                                                            <th class="px-4 py-3 font-medium text-right">積分</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody class="divide-y divide-gray-50 dark:divide-gray-800/50">
                                                        <tr v-for="p in match.players" :key="p.seat"
                                                            class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">

                                                            <td class="px-4 py-3 font-bold transition-colors" :class="{
                                                                'text-amber-500 dark:text-amber-400 drop-shadow-sm': p.score === Math.max(...match.players.map(x => x.score)),
                                                                'text-gray-400 dark:text-gray-500': p.score !== Math.max(...match.players.map(x => x.score))
                                                            }">
                                                                {{ p.seat }}
                                                            </td>

                                                            <td
                                                                class="px-4 py-3 font-medium text-gray-900 dark:text-gray-200">
                                                                {{ p.name }}</td>

                                                            <td
                                                                class="px-4 py-3 text-right font-mono tracking-wide text-gray-800 dark:text-gray-300">
                                                                {{
                                                                p.score.toLocaleString() }}</td>

                                                            <td class="px-4 py-3 text-right font-mono font-bold"
                                                                :class="p.pts > 0 ? 'text-emerald-600 dark:text-emerald-400' : p.pts < 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'">
                                                                {{ p.pts > 0 ? '+' : '' }}{{ p.pts }}
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                    </div>
                                </section>

                            </div>
                        </template>
                        <template #stats>
                            <div class="h-[600px] mt-2 bg-gray-200 dark:bg-[#cbd5e1] rounded-lg"></div>
                        </template>
                        <template #vods>
                            <div class="h-[600px] mt-2 bg-gray-200 dark:bg-[#cbd5e1] rounded-lg"></div>
                        </template>

                    </UTabs>
                </div>
            </UContainer>

        </div>
    </div>
</template>