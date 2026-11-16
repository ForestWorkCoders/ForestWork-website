<script setup lang="ts">
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
        { icon: 'i-lucide-globe', url: 'https://mahjongsoul.yo-star.com/' }, // 官網
        { icon: 'i-simple-icons-x', url: 'https://twitter.com/MahjongSoul_EN' },   // Twitter (X)
        { icon: 'i-simple-icons-discord', url: 'https://discord.gg/mahjongsoul' },  // Discord
        { icon: 'i-lucide-scale', url: '/games/mahjongsoul/rules' }, // Rules
        { icon: 'i-lucide-badge-question-mark', url: '/games/mahjongsoul/how-to' } // How-To
    ]
}

const { data: allTournaments } = await useFetch('/api/mahjong/tournaments')

useSeoMeta({
    title: '雀魂麻將 | MahjongSoul | Forestwork',
    ogTitle: () => '雀魂麻將 | MahjongSoul | Forestwork',
    description: () => `查看雀魂麻將的即時戰況、積分排行榜與對局紀錄。`,
    ogDescription: () => `查看雀魂麻將的即時戰況、積分排行榜與對局紀錄。`,
    ogImage: () => 'https://forestwork.vercel.app/images/mahjongSoul/logo-white.png'
})
</script>

<template>
    <div
        class="flex-1 flex flex-col bg-gray-50 dark:bg-default bg-[url('/images/mahjongSoul/bg.png')] bg-cover bg-fixed bg-center transition-colors duration-300">
        <!-- 内层蒙版：同样 flex-1 flex flex-col 铺满，负责毛玻璃与透光度 -->
        <div
            class="flex-1 flex flex-col bg-white/70 dark:bg-black/60 backdrop-blur-md py-8 transition-colors duration-300">
            <UContainer>
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    <div class="lg:col-span-8 space-y-4">

                        <TournamentList :tournaments="allTournaments" game-slug="mahjongsoul" />

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