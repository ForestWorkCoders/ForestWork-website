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

// 總積分榜資料
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

// ==========================================
// ★ 玩家數據 (Player Stats) 假資料 ★
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

// 擷取前三名給上方的雷達圖區塊使用
const top3Players = mockPlayerStats.slice(0, 3)
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


                                                <span
                                                    class="font-black tracking-widest text-sm text-blue-600 dark:text-blue-400 group-hover:text-blue-500 dark:group-hover:text-blue-300 transition-colors">
                                                    {{ match.round }}
                                                </span>
                                                <NuxtLink :to="match.paipu_url" target="_blank"
                                                    class="flex items-center gap-2 group cursor-pointer">
                                                    <span
                                                        class="text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded group-hover:bg-gray-300 dark:group-hover:bg-gray-700 transition-colors">
                                                        雀魂牌譜
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
                            <div class="px-4 md:px-6 mt-8 space-y-8 animate-fade-in pb-12">

                                <section>
                                    <h2 class="text-2xl font-bold text-gray-900 dark:text-white tracking-wide mb-6">
                                        頂尖選手 <span class="text-gray-400 dark:text-gray-500 font-normal text-lg ml-2">Top
                                            Performers</span>
                                    </h2>

                                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div v-for="(player, index) in top3Players" :key="player.player"
                                            class="bg-white dark:bg-[#18212f] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col relative group">
                                            <div
                                                class="absolute -right-4 -top-8 text-[120px] font-black text-gray-50 dark:text-white/[0.02] pointer-events-none transition-transform group-hover:scale-110">
                                                #{{ index + 1 }}
                                            </div>

                                            <div
                                                class="p-6 flex flex-col items-center z-10 border-b border-gray-100 dark:border-gray-800/50">
                                                <UAvatar :src="player.avatar" :alt="player.player" size="xl"
                                                    class="ring-4 ring-gray-50 dark:ring-[#1e293b] shadow-lg mb-3" />
                                                <h3 class="text-xl font-bold text-gray-900 dark:text-white">{{
                                                    player.player }}</h3>
                                                <div
                                                    class="mt-2 flex items-center gap-1 text-amber-500 dark:text-amber-400 font-black text-2xl">
                                                    <span>{{ player.avg_rank.toFixed(2) }}</span>
                                                    <span
                                                        class="text-xs text-gray-400 font-medium tracking-widest ml-1">AVG
                                                        RANK</span>
                                                </div>
                                            </div>

                                            <div
                                                class="p-6 flex-1 flex flex-col items-center justify-center min-h-[280px] bg-gray-50/50 dark:bg-transparent">
                                                <div
                                                    class="relative w-full aspect-square max-w-[220px] rounded-full border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center">
                                                    <UIcon name="i-heroicons-chart-pie"
                                                        class="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
                                                    <span
                                                        class="absolute mt-12 text-xs text-gray-400 font-mono tracking-widest">RADAR
                                                        CHART AREA</span>

                                                    <span
                                                        class="absolute -top-4 text-[10px] font-bold text-gray-500">和牌率</span>
                                                    <span
                                                        class="absolute -right-6 top-1/4 text-[10px] font-bold text-gray-500">自摸</span>
                                                    <span
                                                        class="absolute -right-6 bottom-1/4 text-[10px] font-bold text-gray-500">副露</span>
                                                    <span
                                                        class="absolute -bottom-4 text-[10px] font-bold text-gray-500">速度</span>
                                                    <span
                                                        class="absolute -left-6 bottom-1/4 text-[10px] font-bold text-gray-500">立直</span>
                                                    <span
                                                        class="absolute -left-6 top-1/4 text-[10px] font-bold text-gray-500">防禦</span>
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                </section>

                                <section>
                                    <div
                                        class="mb-6 border-b border-gray-200 dark:border-gray-800 pb-4 flex justify-between items-end">
                                        <h2 class="text-2xl font-bold text-gray-900 dark:text-white tracking-wide">
                                            綜合數據 <span
                                                class="text-gray-400 dark:text-gray-500 font-normal text-lg ml-2">Overall
                                                Statistics</span>
                                        </h2>
                                    </div>

                                    <div
                                        class="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm w-full overflow-hidden">
                                        <UTable :columns="statsColumns" :data="mockPlayerStats" :ui="{
                                            wrapper: 'overflow-x-auto w-full',
                                            base: 'min-w-[1600px]', /* 因為有 16 個欄位，必須撐開確保不擠壓 */
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
                                            <template #rank-cell="{ row }">
                                                <span class="font-black text-lg"
                                                    :class="row.original.rank <= 3 ? 'text-amber-500' : 'text-gray-500'">
                                                    #{{ row.original.rank }}
                                                </span>
                                            </template>

                                            <template #player-cell="{ row }">
                                                <div class="flex items-center gap-3">
                                                    <UAvatar :src="row.original.avatar" :alt="row.original.player"
                                                        size="sm" />
                                                    <span class="font-bold text-sm">{{ row.original.player }}</span>
                                                </div>
                                            </template>

                                            <template
                                                v-for="col in ['win_rate', 'deal_in_rate', 'tsumo_rate', 'dama_rate', 'exhaustive_draw_rate', 'draw_tenpai_rate', 'call_rate', 'riichi_rate', 'busting_rate']"
                                                :key="col" #[`${col}-cell`]="{ row }">
                                                <span class="font-mono text-sm"
                                                    :class="col === 'deal_in_rate' || col === 'busting_rate' ? 'text-red-400' : 'text-emerald-400'">
                                                    {{ row.original[col].toFixed(1) }}%
                                                </span>
                                            </template>

                                            <template v-for="col in ['avg_turns', 'avg_rank']" :key="col"
                                                #[`${col}-cell`]="{ row }">
                                                <span
                                                    class="font-mono text-sm font-bold text-gray-700 dark:text-gray-300">
                                                    {{ row.original[col].toFixed(2) }}
                                                </span>
                                            </template>

                                            <template v-for="col in ['avg_win_score', 'avg_deal_in_score']" :key="col"
                                                #[`${col}-cell`]="{ row }">
                                                <span class="font-mono text-sm text-amber-600 dark:text-amber-400">
                                                    {{ row.original[col].toLocaleString() }}
                                                </span>
                                            </template>

                                        </UTable>
                                    </div>
                                </section>

                            </div>
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