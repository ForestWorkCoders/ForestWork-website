<script setup lang="ts">
// 定義給 Sidebar 的資料
const plazmaBurstSidebarData = {
    name: '超時空戰士 2 · Plazma Burst 2',
    image_light: '/images/plazmaBurst/logo-black.png',
    image_dark: '/images/plazmaBurst/logo-white.png',
    desc: [
        'Plazma Burst 2 (usually abbreviated as PB2) is a side-scroller flash game created by Eric Gurt, initially released as beta version on January 26, 2011, March 10, 2011 as standard version and March 25, 2011 for Y8 Games. This was the second game in Eric Gurt\'s Plazma Burst series of games and a sequel to Forward to the Past, which will likely be succeeded by Plazma Burst 3 or Plazma Burst 2.5.',
        '《超時空戰士2》是一款由Eric Gurt所製作的橫向2D射擊遊戲。從2012年開始開發到現在。期間社區辦了大大小小的比賽。'
    ],
    socialLinks: [
        { icon: 'i-lucide-globe', url: 'https://www.plazmaburst2.com/' }, // 官網
        { icon: 'i-simple-icons-x', url: 'https://x.com/Eric_Gurt' },   // Twitter (X)
        { icon: 'i-simple-icons-discord', url: 'https://discord.gg/plazmaburst' },  // Discord
        { icon: 'i-simple-icons-discord', url: 'https://discord.gg/2cHPEGGRfu' },  // Discord
        { icon: 'i-lucide-scale', url: '/games/plazmaburst/rules' }, // Rules
        { icon: 'i-lucide-badge-question-mark', url: '/games/plazmaburst/how-to' } // How-To
    ]
}

const { data: allTournaments } = await useFetch('/api/plazmaburst/tournaments')

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
        class="flex-1 flex flex-col bg-gray-50 dark:bg-default bg-[url('/images/plazmaBurst/bg.webp')] bg-cover bg-fixed bg-center transition-colors duration-300">
        <!-- 内层蒙版：同样 flex-1 flex flex-col 铺满，负责毛玻璃与透光度 -->
        <div
            class="flex-1 flex flex-col bg-white/70 dark:bg-black/60 backdrop-blur-md py-8 transition-colors duration-300">
            <UContainer>
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    <div class="lg:col-span-8 space-y-4">

                        <TournamentList :tournaments="allTournaments" game-slug="plazmaburst" />

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