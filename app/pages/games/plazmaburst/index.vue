<script setup lang="ts">
import { ref } from 'vue'

// 定義給 Sidebar 的資料
const plazmaBurstSidebarData = {
    name: '超时空战士 2 · Plazma Burst 2',
    image_light: '/images/plazmaBurst/logo-black.png',
    image_dark: '/images/plazmaBurst/logo-white.png',
    desc: [
        'Plazma Burst 2 (usually abbreviated as PB2) is a side-scroller flash game created by Eric Gurt, initially released as beta version on January 26, 2011, March 10, 2011 as standard version and March 25, 2011 for Y8 Games. This was the second game in Eric Gurt\'s Plazma Burst series of games and a sequel to Forward to the Past, which will likely be succeeded by Plazma Burst 3 or Plazma Burst 2.5.',
        '《超時空戰士2》是一款由Eric Gurt所製作的橫向2D射擊游戲。從2012年開始開發到現在。期間社區辦了大大小小的比賽。'
    ],
    socialLinks: [
        { icon: 'i-heroicons-globe-alt', url: 'https://www.plazmaburst2.com/' }, // 官網
        { icon: 'i-simple-icons-x', url: 'https://x.com/Eric_Gurt' },   // Twitter (X)
        { icon: 'i-simple-icons-discord', url: 'https://discord.gg/plazmaburst' },  // Discord
        { icon: 'i-simple-icons-discord', url: 'https://discord.gg/2cHPEGGRfu' },  // Discord
        { icon: 'i-lucide-scale', url: '/games/plazmaburst/rules' }, // Rules
        { icon: 'i-lucide-badge-question-mark', url: '/games/plazmaburst/how-to' } // How-To
    ]
}

// 定義頂部選單 (適配 Nuxt UI 的 UTabs)
const items = [
    { label: 'ONGOING TOURNAMENTS', description: '進行中的比賽', slot: 'ongoing', shortLabel: 'ONGOING' },
    { label: 'PAST TOURNAMENTS', description: '已結束的比賽', slot: 'past', shortLabel: 'PAST' },
    { label: 'UPCOMING TOURNAMENTS', description: '即將開始的比賽', slot: 'upcoming', shortLabel: 'UPCOMING' }
]

const searchQuery = ref('')

// ★ 現在回傳的是一個包含三個陣列的物件
const { data: allTournaments, pending, error } = await useFetch('/api/plazmaburst/tournaments')

// 分頁狀態管理 (專門給 PAST 使用)
const currentPage = ref(1)
const itemsPerPage = 7

// 2. 纯函数：通用搜索过滤逻辑 (消除重复分支)
function filterBySearch<T extends { title: string }>(list: T[] | undefined, query: string): T[] {
    if (!list) return []
    const cleanQuery = query.trim().toLowerCase()
    if (!cleanQuery) return list

    return list.filter(item => item.title.toLowerCase().includes(cleanQuery))
}

// 3. 派生状态：三项分类搜索结果
const filteredOngoing = computed(() => filterBySearch(allTournaments.value?.ongoing, searchQuery.value))
const filteredUpcoming = computed(() => filterBySearch(allTournaments.value?.upcoming, searchQuery.value))
const filteredPast = computed(() => filterBySearch(allTournaments.value?.past, searchQuery.value))

// 4. 历史赛事分页：必须基于【过滤后】的数据进行切片计算
const paginatedPastTournaments = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage
    return filteredPast.value.slice(start, start + itemsPerPage)
})

// 5. 搜索词改变时，强制将分页重置回第 1 页 (杜绝白屏)
watch(searchQuery, () => {
    currentPage.value = 1
})

useSeoMeta({
    title: '超時空戰士2 | Plazma Burst 2 | Forestwork',
    ogTitle: () => '超時空戰士2 | Plazma Burst 2 | Forestwork',
    description: () => `查看超時空戰士2的即時戰況、積分排行榜與對局紀錄。`,
    ogDescription: () => `查看超時空戰士2的即時戰況、積分排行榜與對局紀錄。`,
    ogImage: () => 'https://forestwork.vercel.app/images/plazmaBurst/logo-white.png'
})
</script>

<template>

    <div
        class="flex-1 flex flex-col bg-gray-50 dark:bg-[#1a1b26] bg-[url('https://static.wikia.nocookie.net/plazmabursttwo/images/9/93/Plazma_Burst_2_background.JPG') bg-cover bg-fixed bg-center transition-colors duration-300">
        <!-- 内层蒙版：同样 flex-1 flex flex-col 铺满，负责毛玻璃与透光度 -->
        <div
            class="flex-1 flex flex-col bg-white/70 dark:bg-black/60 backdrop-blur-md py-8 transition-colors duration-300">
            <UContainer>
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    <div class="lg:col-span-8 space-y-4">

                        <UTabs :items="items" class="w-full" :ui="{
                            // 1. 核心修复：拍平成类名字符串，绝不在内部套伪造的 { background: ... }
                            list: 'bg-gray-100 dark:bg-[#0f172a]',
                            // 翡翠绿指示药丸，选中时自带白字高亮
                            indicator: 'bg-emerald-600 dark:bg-emerald-500 text-white shadow-sm'
                        }">
                            <!-- 核心：响应式双模式表头排版 -->
                            <template #default="{ item }">
                                <div class="text-center py-1.5 sm:py-2 transition-colors duration-200">
                                    <!-- 英文主标题：利用 group-data-[state=active] 或当前继承色，无需手写三元表达式 -->
                                    <div
                                        class="font-bold text-xs sm:text-sm tracking-wider uppercase transition-colors">

                                        <!-- 1. 移动端专用短词 (屏幕 < 640px 时显示，彻底消灭文字截断) -->
                                        <span class="inline sm:hidden">
                                            {{ item.shortLabel }}
                                        </span>

                                        <!-- 2. 桌面端专用完整词 (屏幕 >= 640px 时自然展开) -->
                                        <span class="hidden sm:inline">
                                            {{ item.label }}
                                        </span>


                                        <!-- 中文副标题：保持原有呼吸感与半透明对比度 -->
                                        <div v-if="item.description"
                                            class="text-[10px] sm:text-xs text-gray-500 dark:text-gray-200 mt-0.5 sm:mt-1 transition-colors opacity-90">
                                            {{ item.description }}
                                        </div>
                                    </div>
                                </div>
                            </template>




                            <template #ongoing>
                                <div class="mt-2 space-y-4">
                                    <UInput v-model="searchQuery" icon="i-lucide-search"
                                        placeholder="Search Ongoing Tournaments..." color="info" variant="outline"
                                        class="w-full" :ui="{
                                            base: 'bg-white dark:bg-[#0f172a] border-gray-200 dark:border-[#1e293b] text-gray-900 dark:text-white transition-colors duration-200',
                                            leadingIcon: 'text-gray-500 dark:text-gray-400 transition-colors'
                                        }" />
                                </div>
                                <div class="mt-4 space-y-4">
                                    <div v-if="allTournaments?.ongoing?.length" class="space-y-3">
                                        <BaseTournamentCard v-for="tourney in allTournaments.ongoing" :key="tourney.id"
                                            :tourney="tourney" game-slug="plazmaburst" />
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
                                        placeholder="Search Past Tournaments..." color="info" variant="outline"
                                        class="w-full" :ui="{
                                            base: 'bg-white dark:bg-[#0f172a] border-gray-200 dark:border-[#1e293b] text-gray-900 dark:text-white transition-colors duration-200',
                                            leadingIcon: 'text-gray-500 dark:text-gray-400 transition-colors'
                                        }" />
                                </div>
                                <div class="mt-4 space-y-6">

                                    <div v-if="allTournaments?.past?.length">
                                        <div class="space-y-3">
                                            <BaseTournamentCard v-for="tourney in paginatedPastTournaments"
                                                :key="tourney.id" :tourney="tourney" game-slug="plazmaburst" />
                                        </div>

                                        <div v-if="allTournaments.past.length > itemsPerPage"
                                            class="flex justify-center pt-4 mt-6 border-t border-gray-200 dark:border-slate-800 transition-colors duration-200">
                                            <UPagination :page="currentPage" :total="allTournaments.past.length"
                                                :items-per-page="itemsPerPage" color="neutral" variant="subtle"
                                                @update:page="(val: number) => currentPage = val" />

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
                                        placeholder="Search Future Tournaments..." color="info" variant="outline"
                                        class="w-full" :ui="{
                                            base: 'bg-white dark:bg-[#0f172a] border-gray-200 dark:border-[#1e293b] text-gray-900 dark:text-white transition-colors duration-200',
                                            leadingIcon: 'text-gray-500 dark:text-gray-400 transition-colors'
                                        }" />
                                </div>
                                <div class="mt-4">
                                    <div v-if="allTournaments?.upcoming?.length" class="space-y-3">
                                        <BaseTournamentCard v-for="tourney in allTournaments.upcoming" :key="tourney.id"
                                            :tourney="tourney" game-slug="plazmaburst" />
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
                        <LayoutSidebar :gameName="plazmaBurstSidebarData.name"
                            :coverImageLight="plazmaBurstSidebarData.image_light"
                            :coverImageDark="plazmaBurstSidebarData.image_dark"
                            :description="plazmaBurstSidebarData.desc" :links="plazmaBurstSidebarData.socialLinks" />
                    </div>

                </div>
            </UContainer>
        </div>
    </div>
</template>