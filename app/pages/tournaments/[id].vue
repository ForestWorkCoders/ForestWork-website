<script setup>
const route = useRoute()

// 唯一的 API 呼叫：取得賽事基本資訊 (Hero Section 使用)
const { data: tourney, pending, error } = await useFetch(`/api/mahjong/tournaments/${route.params.id}`)

// 定義下方的導覽標籤
const tabs = [
    { label: '賽事資訊 · Information', slot: 'info' },
    { label: '賽事結果 · Result', slot: 'result' },
    { label: '玩家數據 · Player Stats', slot: 'stats' },
    { label: '直播記錄 · VODs', slot: 'vods' }
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

                        <UButton to="/games/mahjongsoul/rules" target="_blank" color="info" variant="outline"
                            icon="i-lucide-download"
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
                                <TournamentsLeaderboardStandard :tournament-id="route.params.id" />
                                <TournamentsMatchHistoryStandard :tournament-id="route.params.id" />
                            </div>
                        </template>
                        <template #stats>
                            <TournamentsPlayerStatsStandard :tournament-id="route.params.id" />
                        </template>
                        <template #vods>
                            <TournamentsVodsStandard :tournament-id="route.params.id" />
                        </template>

                    </UTabs>
                </div>
            </UContainer>

        </div>
    </div>
</template>