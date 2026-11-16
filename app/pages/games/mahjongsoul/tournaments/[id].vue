<script setup>
import { buildTournamentDiscordEmbed } from '@/utils/mahjongDiscordEmbed'

const route = useRoute()

// ==========================================
// 1a. 核心数据：主赛事元数据（必须稳固，保留 pending 与 error 供模板使用）
// ==========================================
const { data: tourney, pending, error } = await useFetch(`/api/mahjong/tournaments/${route.params.id}`)

// ==========================================
// 1b. 增强数据：安全拉取賽事結果 (phases)，給結果分頁與 Discord embed 共用（即使后端挂掉，也不允许破坏 SSR）
// ==========================================
const { data: phases } = await useFetch(`/api/mahjong/tournaments/${route.params.id}/phases`, {
    // 核心防御：即使接口返回 404 或 500，绝不中断 SSR 流程
    default: () => null
})

const GAME = {
    name: '雀魂麻將 · Mahjong Soul',
    icon: 'i-lucide-trophy',
    to: '/games/mahjongsoul',
    background: '/images/mahjongSoul/bg.png',
    rules: '/games/mahjongsoul/rules'
}

// Tabs after Information, by format. An event is information only (no tab bar).
const FORMAT_TAB = {
    invitational: { label: '參賽資格 · Prerequisites', slot: 'prereq' },
    relay: { label: '參賽隊伍 · Teams', slot: 'teams' }
}

const tabs = computed(() => {
    const format = tourney.value?.format
    if (format === 'event') return []
    return [
        ...(FORMAT_TAB[format] ? [FORMAT_TAB[format]] : []),
        { label: '賽事結果 · Result', slot: 'result' },
        { label: '玩家數據 · Player Stats', slot: 'stats' },
        { label: '直播記錄 · VODs', slot: 'vods' }
    ]
})

// 1. 常规 SEO 覆写
useSeoMeta({
    title: () => tourney.value?.title ? `${tourney.value.title} · ForestWork Mahjong` : '賽事詳情',
    ogTitle: () => tourney.value?.title ?? 'ForestWork Mahjong Tournament',
    description: () => `查看 ${tourney.value?.title ?? '賽事'} 的即時戰況與對局紀錄。`,
    ogDescription: () => `查看 ${tourney.value?.title ?? '賽事'} 的即時戰況與對局紀錄。`,
    ogImage: () => tourney.value?.imageUrl ?? SHARE_IMAGE_URL
})

// 2. 动态组件树计算
const embedPayload = computed(() => {
    const title = tourney.value?.title || '林間小鎮賽事'
    const targetUrl = `https://forestwork.vercel.app/games/mahjongsoul/tournaments/${route.params.id}`
    const image = tourney.value?.imageUrl || SHARE_IMAGE_URL
    const formatText = computed(() => {
        if (tourney.value?.format === 'event') return '趣味活動周'
        if (tourney.value?.format === 'relay') return '隊伍接力賽'
        if (tourney.value?.format === 'invitational') return '年度邀請賽'
        return '常規積分賽'
    })

    // 提取对应阶段的真实排行榜数据 (无论是个人赛还是接力赛)
    const list = phases.value || []
    const activePhase = list.find(p => p.final) || list[0]
    const rawLeaderboard = (activePhase?.groups[0]?.standings || [])
        .map(r => ({ rank: r.rank, name: r.entrant.name, total: r.stats.total }))

    return buildTournamentDiscordEmbed({
        title: title,
        format: formatText.value,
        matchUrl: targetUrl,
        imageUrl: image,
        leaderboard: rawLeaderboard
    })
})

// 3. 核心：带上相同的 key 实施强力覆盖！
useHead({
    script: [
        {
            key: 'discord:component-embed',
            id: 'discord:component-embed',
            type: 'application/json',
            innerHTML: () => JSON.stringify(embedPayload.value).replace(/</g, '\\u003c')
        }
    ]
})
</script>

<template>
    <TournamentLayout :tournament="tourney" :pending="pending" :error="error" :game="GAME" :tabs="tabs">
        <!-- 參賽資格（邀請賽） -->
        <template #prereq>
            <MahjongLeaderboardInvitational :tournament-id="route.params.id" />
        </template>
        <!-- 參賽隊伍（團體接力賽） -->
        <template #teams>
            <MahjongTeams :tournament-id="route.params.id" />
        </template>
        <template #result>
            <TournamentPhases :phases="phases">
                <template #notice="{ phase }">
                    <UAlert v-if="phase.id === 'MAIN'" icon="i-lucide-info" color="neutral" variant="subtle" title="排名規則說明"
                        description="選手需完成至少 8 場對局始可列入正式排名；出賽未達標者標記為 DNF 並順延至後段。" class="text-xs" />
                </template>
            </TournamentPhases>
        </template>
        <template #stats>
            <MahjongPlayerStats :tournament-id="route.params.id" />
        </template>
        <template #vods>
            <TournamentVods />
        </template>
    </TournamentLayout>
</template>
