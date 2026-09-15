<script setup lang="ts">
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
        { icon: 'i-lucide-scale', url: '/games/mahjongsoul/rules' }, // Rules
        { icon: 'i-lucide-badge-question-mark', url: '/games/mahjongsoul/how-to' } // How-To
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
const { data: allTournaments, pending, error } = await useFetch('/api/mahjong/tournaments')

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
    title: '雀魂麻将 | MahjongSoul | Forestwork',
    ogTitle: () => '雀魂麻将 | MahjongSoul | Forestwork',
    description: () => `查看雀魂麻将的即時戰況、積分排行榜與對局紀錄。`,
    ogDescription: () => `查看雀魂麻将的即時戰況、積分排行榜與對局紀錄。`,
    ogImage: () => 'https://forestwork.vercel.app/images/mahjongSoul/logo-white.png'
})
</script>

<template>
    <div
        class="flex-1 flex flex-col bg-gray-50 dark:bg-[#1a1b26] bg-[url('https://webusstatic.yo-star.com/mj-us-tournament-h5/prod/assets/bg.e1efdef8.png')] bg-cover bg-fixed bg-center transition-colors duration-300">
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
                                    <!-- 改用 filteredOngoing -->
                                    <div v-if="filteredOngoing.length" class="space-y-3">
                                        <BaseTournamentCard v-for="tourney in filteredOngoing" :key="tourney.id"
                                            :tourney="tourney" game-slug="mahjongsoul" />
                                    </div>

                                    <div v-else
                                        class="mt-4 p-12 text-center border border-gray-200 dark:border-slate-800 rounded-lg bg-white/50 dark:bg-[#0f172a]/50">
                                        <UIcon name="i-lucide-calendar-days"
                                            class="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                        <p class="text-gray-500 dark:text-gray-400">
                                            {{ searchQuery ? '找不到符合條件的進行中賽事' : '目前沒有進行中的賽事' }}
                                        </p>
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
                                    <!-- 改用 filteredPast 长度校验 -->
                                    <div v-if="filteredPast.length">
                                        <div class="space-y-3">
                                            <!-- paginatedPastTournaments 已经基于 filteredPast 做了精准切片 -->
                                            <BaseTournamentCard v-for="tourney in paginatedPastTournaments"
                                                :key="tourney.id" :tourney="tourney" game-slug="mahjongsoul" />
                                        </div>

                                        <!-- 分页组件的 total 必须绑定 filteredPast.length -->
                                        <!-- 历史赛事分页器：直接显式接管事件，拒绝黑盒断流 -->
                                        <div v-if="filteredPast.length > itemsPerPage"
                                            class="flex justify-center pt-4 mt-6 border-t border-gray-200 dark:border-slate-800 transition-colors duration-200">
                                            <UPagination :page="currentPage" :total="filteredPast.length"
                                                :items-per-page="itemsPerPage" color="neutral" variant="subtle"
                                                @update:page="(val: number) => currentPage = val" />
                                        </div>
                                    </div>

                                    <div v-else
                                        class="mt-4 p-12 text-center border border-gray-200 dark:border-slate-800 rounded-lg bg-white/50 dark:bg-[#0f172a]/50">
                                        <UIcon name="i-lucide-inbox" class="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                        <p class="text-gray-500 dark:text-gray-400">
                                            {{ searchQuery ? '找不到符合條件的歷史賽事' : '尚無歷史賽事紀錄' }}
                                        </p>
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
                                    <!-- 改用 filteredUpcoming -->
                                    <div v-if="filteredUpcoming.length" class="space-y-3">
                                        <BaseTournamentCard v-for="tourney in filteredUpcoming" :key="tourney.id"
                                            :tourney="tourney" game-slug="mahjongsoul" />
                                    </div>

                                    <div v-else
                                        class="mt-4 p-12 text-center border border-gray-200 dark:border-slate-800 rounded-lg bg-white/50 dark:bg-[#0f172a]/50">
                                        <UIcon name="i-lucide-calendar-days"
                                            class="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                        <p class="text-gray-500 dark:text-gray-400">
                                            {{ searchQuery ? '找不到符合條件的即將開始賽事' : '目前沒有即將開始的賽事' }}
                                        </p>
                                    </div>
                                </div>
                            </template>
                        </UTabs>

                    </div>

                    <div class="lg:col-span-4 space-y-6">
                        <LayoutSidebar :gameName="mahjongSidebarData.name"
                            :coverImageLight="mahjongSidebarData.image_light"
                            :coverImageDark="mahjongSidebarData.image_dark" :description="mahjongSidebarData.desc"
                            :links="mahjongSidebarData.socialLinks" />
                    </div>

                </div>
            </UContainer>
        </div>
    </div>
</template>