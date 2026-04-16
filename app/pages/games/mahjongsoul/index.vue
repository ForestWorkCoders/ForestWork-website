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
        { icon: 'i-simple-icons-discord', url: 'https://discord.gg/mahjongsoul' },  // Discord
        { icon: 'i-lucide-badge-question-mark', url: '/games/mahjongsoul/how-to' } // How-To
    ]
}

// 定義頂部選單 (適配 Nuxt UI 的 UTabs)
const items = [
    { label: 'ONGOING TOURNAMENTS', description: '進行中的比賽', slot: 'ongoing' },
    { label: 'PAST TOURNAMENTS', description: '已結束的比賽', slot: 'past' },
    { label: 'UPCOMING TOURNAMENTS', description: '即將開始的比賽', slot: 'upcoming' }
]

const searchQuery = ref('')

// ★ 現在回傳的是一個包含三個陣列的物件
const { data: allTournaments, pending, error } = await useFetch('/api/mahjong/tournaments')

// 分頁狀態管理 (專門給 PAST 使用)
const currentPage = ref(1)
const itemsPerPage = 6

// 計算當前頁面要顯示的 PAST 賽事
const paginatedPastTournaments = computed(() => {
    // 注意這裡改成讀取 .past 陣列
    if (!allTournaments.value?.past) return []
    const start = (currentPage.value - 1) * itemsPerPage
    const end = start + itemsPerPage
    return allTournaments.value.past.slice(start, end)
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
                                    <UInput v-model="searchQuery" icon="i-lucide-search"
                                        placeholder="Search Ongoing Tournaments..." color="gray" variant="outline"
                                        class="w-full" :ui="{
                                            base: 'bg-white dark:bg-[#0f172a] border-gray-200 dark:border-[#1e293b] text-gray-900 dark:text-white transition-colors duration-200',
                                            icon: { base: 'text-gray-500 dark:text-gray-400 transition-colors' }
                                        }" />
                                </div>
                                <div class="mt-4 space-y-4">
                                    <div v-if="allTournaments?.ongoing?.length" class="space-y-3">
                                        <TournamentsCard v-for="tourney in allTournaments.ongoing" :key="tourney.id"
                                            :tourney="tourney" />
                                    </div>

                                    <div v-else
                                        class="mt-4 p-12 text-center border border-gray-200 dark:border-slate-800 rounded-lg bg-white/50 dark:bg-[#0f172a]/50">
                                        <UIcon name="i-lucide-calendar-days"
                                            class="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                        <p class="text-gray-500 dark:text-gray-400">目前沒有進行中的賽事</p>
                                    </div>
                                </div>
                            </template>

                            <template #past>
                                <div class="mt-2 space-y-4">
                                    <UInput v-model="searchQuery" icon="i-lucide-search"
                                        placeholder="Search Past Tournaments..." color="gray" variant="outline"
                                        class="w-full" :ui="{
                                            base: 'bg-white dark:bg-[#0f172a] border-gray-200 dark:border-[#1e293b] text-gray-900 dark:text-white transition-colors duration-200',
                                            icon: { base: 'text-gray-500 dark:text-gray-400 transition-colors' }
                                        }" />
                                </div>
                                <div class="mt-4 space-y-6">

                                    <div v-if="allTournaments?.past?.length">
                                        <div class="space-y-3">
                                            <TournamentsCard v-for="tourney in paginatedPastTournaments"
                                                :key="tourney.id" :tourney="tourney" />
                                        </div>

                                        <div v-if="allTournaments.past.length > itemsPerPage"
                                            class="flex justify-center pt-4 mt-6 border-t border-gray-200 dark:border-slate-800 transition-colors duration-200">
                                            <UPagination :model-value="currentPage" :page="currentPage"
                                                @update:model-value="currentPage = $event"
                                                @update:page="currentPage = $event" :page-count="itemsPerPage"
                                                :items-per-page="itemsPerPage" :total="allTournaments.past.length" :ui="{
                                                    wrapper: 'flex items-center gap-1',
                                                    rounded: '!rounded-full',
                                                    default: {
                                                        activeButton: { variant: 'solid', color: 'gray', class: 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' },
                                                        inactiveButton: { variant: 'ghost', color: 'gray', class: 'hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors' }
                                                    }
                                                }" />
                                        </div>
                                    </div>

                                    <div v-else
                                        class="mt-4 p-12 text-center border border-gray-200 dark:border-slate-800 rounded-lg bg-white/50 dark:bg-[#0f172a]/50">
                                        <UIcon name="i-lucide-inbox" class="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                        <p class="text-gray-500 dark:text-gray-400">尚無歷史賽事紀錄</p>
                                    </div>

                                </div>
                            </template>

                            <template #upcoming>
                                <div class="mt-2 space-y-4">
                                    <UInput v-model="searchQuery" icon="i-lucide-search"
                                        placeholder="Search Future Tournaments..." color="gray" variant="outline"
                                        class="w-full" :ui="{
                                            base: 'bg-white dark:bg-[#0f172a] border-gray-200 dark:border-[#1e293b] text-gray-900 dark:text-white transition-colors duration-200',
                                            icon: { base: 'text-gray-500 dark:text-gray-400 transition-colors' }
                                        }" />
                                </div>
                                <div class="mt-4">
                                    <div v-if="allTournaments?.upcoming?.length" class="space-y-3">
                                        <TournamentsCard v-for="tourney in allTournaments.upcoming" :key="tourney.id"
                                            :tourney="tourney" />
                                    </div>

                                    <div v-else
                                        class="mt-4 p-12 text-center border border-gray-200 dark:border-slate-800 rounded-lg bg-white/50 dark:bg-[#0f172a]/50">
                                        <UIcon name="i-lucide-calendar-days"
                                            class="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                        <p class="text-gray-500 dark:text-gray-400">目前沒有即將開始的賽事</p>
                                    </div>
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