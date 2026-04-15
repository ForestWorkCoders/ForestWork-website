<script setup>
import { ref } from 'vue'

// 定義給 Sidebar 的資料
const mahjongSidebarData = {
    name: '雀魂麻將 · Mahjong Soul',
    image_light: '/images/mahjongSoul/logo-black.png',
    image_dark: '/images/mahjongSoul/logo-white.png',
    desc: [
        'Mahjong Soul is an online game that adopted the classic Japanese Mahjong gameplay. Here, you can hone your mahjong skills with players from worldwide or spend leisure time with friends, bond with various charismatic characters, and experience an abundance of unique stories.',
        '《雀魂麻將》（MahjongSoul）是Catfood Studio（貓糧工作室）開發的麻將遊戲。該作於2018年6月8日正式發布，於2020年7月15日在steam上線國際中文服。'
    ],
    socialLinks: [
        { icon: 'i-heroicons-globe-alt', url: 'https://mahjongsoul.yo-star.com/' }, // 官網
        { icon: 'i-simple-icons-x', url: 'https://twitter.com/MahjongSoul_EN' },   // Twitter (X)
        { icon: 'i-simple-icons-discord', url: 'https://discord.gg/mahjongsoul' }  // Discord
    ]
}

// 定義頂部選單 (適配 Nuxt UI 的 UTabs)
const items = [
    { label: 'ONGOING TOURNAMENTS', description: '進行中的比賽', slot: 'ongoing' },
    { label: 'PAST TOURNAMENTS', description: '已結束的比賽', slot: 'past' },
    { label: 'UPCOMING TOURNAMENTS', description: '即將開始的比賽', slot: 'upcoming' }
]

const searchQuery = ref('')

// 模擬從 Supabase 抓來的資料 (未來這會替換成 useAsyncData)
const mockTournaments = [
    { id: 1, title: '林間盃 2025 夏季個人邀請賽', tier: 'Tier B', region: 'ASIA' },
    { id: 2, title: '林間盃 2025 5月份個人積分賽', tier: 'Tier C', region: 'ASIA' },
    { id: 3, title: '林間盃 2025 4月份個人積分賽', tier: 'Tier C', region: 'ASIA' }
]

const pastTournaments = Array.from({ length: 42 }, (_, i) => {
    const year = 2025 - Math.floor(i / 12)
    const month = 12 - (i % 12)
    return {
        id: `past_${i}`,
        title: `林間盃 ${year} ${month}月份個人積分賽`,
        tier: 'Tier C',
        region: 'ASIA'
    }
})

// 分頁狀態管理
const currentPage = ref(1)
const itemsPerPage = 6 // 每一頁顯示 6 個賽事

// 計算當前頁面要顯示的資料 (Slice)
const paginatedPastTournaments = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage
    const end = start + itemsPerPage
    return pastTournaments.slice(start, end)
})
</script>

<template>
    <div
        class="min-h-screen bg-gray-50 dark:bg-[#1a1b26] bg-[url('https://webusstatic.yo-star.com/mj-us-tournament-h5/prod/assets/bg.e1efdef8.png')] bg-cover bg-fixed bg-center transition-colors duration-300">

        <div class="min-h-screen bg-white/70 dark:bg-black/60 backdrop-blur-md py-8 transition-colors duration-300">
            <UContainer>
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    <div class="lg:col-span-8 space-y-4">

                        <UTabs :items="items" class="w-full" :ui="{
                            list: {
                                background: 'bg-gray-100 dark:bg-[#0f172a]',
                                marker: { background: 'bg-white dark:bg-slate-800' }
                            }
                        }">
                            <template #default="{ item, selected }">
                                <div class="text-center py-2 transition-colors duration-200">
                                    <div class="font-bold text-sm tracking-wider transition-colors"
                                        :class="selected
                                            ? 'text-gray-900 dark:text-white'
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'">
                                        {{ item.label }}
                                    </div>

                                    <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 transition-colors">
                                        {{ item.description }}
                                    </div>
                                </div>

                            </template>



                            <template #ongoing>
                                <div class="mt-2 space-y-4">
                                    <UInput v-model="searchQuery" icon="i-heroicons-magnifying-glass-20-solid"
                                        placeholder="Search Ongoing Tournaments..." color="gray" variant="outline"
                                        class="w-full" :ui="{
                                            base: 'bg-white dark:bg-[#0f172a] border-gray-200 dark:border-[#1e293b] text-gray-900 dark:text-white transition-colors duration-200',
                                            icon: { base: 'text-gray-500 dark:text-gray-400 transition-colors' }
                                        }" />
                                </div>
                                <div class="mt-4 space-y-6">
                                    <div class="space-y-3">
                                        <TournamentCard v-for="tourney in mockTournaments" :key="tourney.id"
                                            :tourney="tourney" />
                                    </div>
                                </div>
                            </template>

                            <template #past>
                                <div class="mt-2 space-y-4">
                                    <UInput v-model="searchQuery" icon="i-heroicons-magnifying-glass-20-solid"
                                        placeholder="Search Past Tournaments..." color="gray" variant="outline"
                                        class="w-full" :ui="{
                                            base: 'bg-white dark:bg-[#0f172a] border-gray-200 dark:border-[#1e293b] text-gray-900 dark:text-white transition-colors duration-200',
                                            icon: { base: 'text-gray-500 dark:text-gray-400 transition-colors' }
                                        }" />
                                </div>
                                <div class="mt-4 space-y-6">
                                    <div class="space-y-3">
                                        <TournamentCard v-for="tourney in paginatedPastTournaments" :key="tourney.id"
                                            :tourney="tourney" />
                                    </div>

                                    <div v-if="pastTournaments.length > itemsPerPage"
                                        class="flex justify-center pt-4 border-t border-gray-200 dark:border-slate-800 transition-colors duration-200">
                                        <UPagination :model-value="currentPage" :page="currentPage"
                                            @update:model-value="currentPage = $event"
                                            @update:page="currentPage = $event" :page-count="itemsPerPage"
                                            :items-per-page="itemsPerPage" :total="pastTournaments.length" :ui="{
                                                wrapper: 'flex items-center gap-1',
                                                rounded: '!rounded-full',
                                                default: {
                                                    activeButton: { variant: 'solid', color: 'gray', class: 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' },
                                                    inactiveButton: { variant: 'ghost', color: 'gray', class: 'hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors' }
                                                }
                                            }" />
                                    </div>

                                </div>
                            </template>

                            <template #upcoming>
                                <div class="mt-2 space-y-4">
                                    <UInput v-model="searchQuery" icon="i-heroicons-magnifying-glass-20-solid"
                                        placeholder="Search Future Tournaments..." color="gray" variant="outline"
                                        class="w-full" :ui="{
                                            base: 'bg-white dark:bg-[#0f172a] border-gray-200 dark:border-[#1e293b] text-gray-900 dark:text-white transition-colors duration-200',
                                            icon: { base: 'text-gray-500 dark:text-gray-400 transition-colors' }
                                        }" />
                                </div>
                                <div
                                    class="mt-4 p-12 text-center border border-gray-200 dark:border-slate-800 rounded-lg bg-white/50 dark:bg-[#0f172a]/50">
                                    <UIcon name="i-heroicons-calendar-days"
                                        class="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                    <p class="text-gray-500 dark:text-gray-400">目前沒有即將開始的賽事</p>
                                </div>
                            </template>
                        </UTabs>

                    </div>

                    <div class="lg:col-span-4 space-y-6">
                        <GameSidebar :gameName="mahjongSidebarData.name"
                            :coverImageLight="mahjongSidebarData.image_light"
                            :coverImageDark="mahjongSidebarData.image_dark" :description="mahjongSidebarData.desc"
                            :links="mahjongSidebarData.socialLinks" />
                    </div>

                </div>
            </UContainer>
        </div>
    </div>
</template>