<script setup>
const route = useRoute()

const { data: tourney, pending, error } = await useFetch(`/api/plazmaburst/tournaments/${route.params.id}`)
const { data: phases } = await useFetch(`/api/plazmaburst/tournaments/${route.params.id}/phases`, { default: () => null })

const GAME = {
    name: 'Plazma Burst 2',
    icon: 'i-lucide-gamepad-2',
    to: '/games/plazmaburst',
    background: '/images/plazmaBurst/bg.webp',
    rules: '/games/plazmaburst/rules'
}

// Tabs after Information
const TABS = [
    { label: '參賽隊伍 · Teams', slot: 'teams' },
    { label: '賽事結果 · Result', slot: 'result' },
    { label: '玩家數據 · Player Stats', slot: 'stats' },
    // Hidden until there is VOD data to pass to TournamentVods (WL21)
    { label: '直播記錄 · VODs', slot: 'vods', hidden: true }
]

useSeoMeta({
  title: () => tourney.value?.title 
    ? `${tourney.value.title} · Plazma League` 
    : 'Match Details · Plazma League',
  ogTitle: () => tourney.value?.title ?? 'Plazma League Tournament',
  description: () => `查看 ${tourney.value?.title ?? '賽事'} 的即時戰況、積分排行榜與對局紀錄。`,
  ogDescription: () => `查看 ${tourney.value?.title ?? '賽事'} 的即時戰況、積分排行榜與對局紀錄。`,
  ogImage: () => tourney.value?.imageUrl ?? 'https://efsheupssjxlmrfgmxwp.supabase.co/storage/v1/object/public/Mahjong/tournament_logo/forestwork.png'
})
</script>

<template>
    <TournamentLayout :tournament="tourney" :pending="pending" :error="error" :game="GAME" :tabs="TABS">
        <template #teams>
            <Pb2Teams :tournament-id="route.params.id" />
        </template>
        <template #result>
            <TournamentPhases :phases="phases" />
        </template>
        <template #stats>
            <Pb2PlayerStats :tournament-id="route.params.id" />
        </template>
        <template #vods>
            <TournamentVods />
        </template>
    </TournamentLayout>
</template>
