<script setup>
const route = useRoute()

// ==========================================
// 1. 取得 PB2 專屬賽事資料
// ==========================================
const { data: tourney, pending, error } = await useFetch(`/api/plazmaburst/tournaments/${route.params.id}`)

// ==========================================
// 2. 取得 Content URL
// ==========================================
const contentUrl = computed(() => {
    return tourney.value?.content_url || null
})

// ==========================================
// 3. PB2 專屬動態麵包屑導航
// ==========================================
const breadcrumbLinks = computed(() => {
    return [
        { label: '首頁 · Home', icon: 'i-lucide-home', to: '/' },
        { label: 'Plazma Burst 2', icon: 'i-lucide-gamepad-2', to: '/games/plazmaburst' }, // 修改為 PB2 大廳
        { label: tourney.value?.title || '載入中...', icon: 'i-lucide-swords' }
    ]
})

// ==========================================
// 4. 定義 PB2 專屬導覽標籤
// ==========================================
const tabs = computed(() => {
    return [
        { label: '賽事資訊 · Information', slot: 'info' },
        { label: '參賽隊伍 · Teams', slot: 'teams' },
        { label: '賽事結果 · Result', slot: 'result' },
        { label: '玩家數據 · Player Stats', slot: 'stats' },
        { label: '直播記錄 · VODs', slot: 'vods' }
    ]
})
</script>

<template>
    <div v-if="error" class="min-h-screen flex items-center justify-center text-white">
        <p class="text-xl font-bold text-red-400">載入失敗：{{ error.message }}</p>
    </div>

    <div v-else-if="pending" class="min-h-screen flex items-center justify-center text-white">
        <UIcon name="i-lucide-refresh-cw" class="animate-spin w-10 h-10 text-blue-500" />
    </div>

    <div v-else class="min-h-screen bg-gray-50 dark:bg-[#0f111a]">
        <!-- 這裡可以換成 PB2 風格的背景圖 -->
        <div class="min-h-screen pt-20 pb-12">
            <UContainer class="max-w-6xl">

                <!-- 麵包屑 -->
                <div class="mb-8 px-2 animate-fade-in">
                    <UBreadcrumb :items="breadcrumbLinks" separator="i-lucide-chevron-right" :ui="{
                        wrapper: 'flex flex-wrap items-center gap-1.5',
                        li: 'flex items-center gap-1.5',
                        base: 'text-sm font-bold tracking-wide transition-colors',
                        active: 'text-gray-900 dark:text-white cursor-default',
                        inactive: 'text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400',
                        icon: { base: 'w-4 h-4', active: 'text-blue-500', inactive: 'text-gray-500' },
                        separator: { base: 'w-4 h-4 text-gray-400' }
                    }" />
                </div>

                <!-- 賽事 Header -->
                <div
                    class="bg-white dark:bg-[#1a1c23] text-gray-900 dark:text-white rounded-t-xl overflow-hidden shadow-xl flex flex-col md:flex-row p-8 md:p-12 gap-10 items-center md:items-start border border-gray-200 dark:border-gray-800">

                    <div class="flex flex-col items-center gap-6 shrink-0">
                        <UAvatar :src="tourney.imageUrl" :alt="tourney.title" size="3xl"
                            class="w-48 h-48 ring-4 ring-gray-100 dark:ring-gray-800 shadow-lg"
                            :ui="{ rounded: 'rounded-2xl', fallback: { text: 'font-bold text-gray-400' } }" />

                        <UButton to="/games/plazmaburst/rules" target="_blank" color="primary" variant="soft"
                            icon="i-lucide-book-open"
                            class="w-full justify-center font-bold tracking-widest text-sm transition-colors">
                            Rules · 賽規
                        </UButton>
                    </div>

                    <div class="flex-1 w-full space-y-8">
                        <h1 class="text-3xl md:text-5xl font-black tracking-tight">{{ tourney.title }}</h1>

                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-6">
                            <div class="space-y-1">
                                <p class="text-xs font-bold text-gray-500 uppercase tracking-wider">時程 · Duration</p>
                                <p class="text-sm font-bold">{{ tourney.duration }}</p>
                            </div>
                            <div class="space-y-1">
                                <p class="text-xs font-bold text-gray-500 uppercase tracking-wider">狀態 · Status</p>
                                <p class="text-sm font-bold"
                                    :class="tourney.status.includes('進行中') ? 'text-blue-500' : 'text-gray-600 dark:text-gray-300'">
                                    {{ tourney.status }}
                                </p>
                            </div>
                            <div class="space-y-1">
                                <p class="text-xs font-bold text-gray-500 uppercase tracking-wider">主辦方 · Organizer</p>
                                <p class="text-sm font-bold">{{ tourney.organizer }}</p>
                            </div>
                            <div class="space-y-1">
                                <p class="text-xs font-bold text-gray-500 uppercase tracking-wider">參賽賽區 · Venue</p>
                                <p class="text-sm font-bold">{{ tourney.region }}</p>
                            </div>
                            <div class="space-y-1">
                                <p class="text-xs font-bold text-gray-500 uppercase tracking-wider">隊伍數量 · Size</p>
                                <p class="text-sm font-bold">{{ tourney.team_count || 'TBD' }}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 導覽與內容區塊 -->
                <div
                    class="bg-white dark:bg-[#1a1c23] w-full border-x border-b border-gray-200 dark:border-gray-800 rounded-b-xl shadow-sm">
                    <UTabs :items="tabs" class="w-full" :ui="{
                        list: {
                            background: 'bg-gray-50 dark:bg-[#15171e]',
                            rounded: 'rounded-none',
                            padding: 'p-0',
                            marker: { background: 'bg-blue-500/10 dark:bg-blue-500/20', rounded: 'rounded-none' },
                            tab: {
                                rounded: 'rounded-none',
                                active: 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500',
                                inactive: 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white',
                                padding: 'py-5 px-6',
                                font: 'font-bold tracking-wider'
                            }
                        }
                    }">

                        <!-- 賽事資訊 -->
                        <template #info>
                            <div class="px-6 py-8 animate-fade-in">
                                <TournamentsInfo :content-url="contentUrl" />
                            </div>
                        </template>

                        <!-- 參賽隊伍 (現在是預設第一個 Tab) -->
                        <template #teams>
                            <div class="px-6 py-8 animate-fade-in">
                                <!-- 這裡放入 PB2 專屬的隊伍列表組件 -->
                                <TournamentsPB2Teams :tournament-id="route.params.id" />
                            </div>
                        </template>

                        <!-- 賽事結果 (引入我們寫好的總控台) -->
                        <template #result>
                            <div class="px-6 py-8 animate-fade-in">
                                <Pb2ResultsDashboard :tournament-id="route.params.id" />
                            </div>
                        </template>

                        <!-- 玩家數據 -->
                        <template #stats>
                            <div class="px-6 py-8 animate-fade-in">
                                <TournamentsPlayerStatsStandard :tournament-id="route.params.id" />
                            </div>
                        </template>

                        <!-- 直播記錄 -->
                        <template #vods>
                            <div class="px-6 py-8 animate-fade-in">
                                <TournamentsVodsStandard :tournament-id="route.params.id" />
                            </div>
                        </template>
                    </UTabs>
                </div>

            </UContainer>
        </div>
    </div>
</template>