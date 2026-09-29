<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { use } from 'echarts/core'
import { PieChart, LineChart, RadarChart } from 'echarts/charts'
import { TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'

use([PieChart, LineChart, RadarChart, TooltipComponent, LegendComponent, GridComponent, CanvasRenderer])

// ==========================================
// 1. 核心契約介面 (徹底終結 linked does not exist on type '{}')
// ==========================================
interface PlayerItem {
    id: number
    label: string
}

interface DatePreset {
    id: string
    label: string
    start: string
    end: string
}

interface MahjongMeResponse {
    loggedIn: boolean
    linked: boolean
    discordUser?: any
    player?: {
        accountId: number
        nickname: string
    } | null
}

// 異步探測當前使用者麻將身分 (顯式傳入泛型，型別 100% 閉環)
const { data: myMahjongStatus } = await useFetch<MahjongMeResponse>('/api/mahjong/me')

const excludeInvitational = ref(false)
const excludeGroup = ref(false)

// 2. 選手列表載入
const { data: playerItemsData } = await useFetch<PlayerItem[]>('/api/mahjong/players')
const playerItems = computed(() => playerItemsData.value || [])

// 預設選中選手：若登入且綁定，優先選自己，否則選第一位
const initialPlayerId = computed(() => {
    if (myMahjongStatus.value?.linked && myMahjongStatus.value.player) {
        return myMahjongStatus.value.player.accountId
    }
    return playerItems.value[0]?.id || 9577962
})

const selectedPlayerId = ref<number>(initialPlayerId.value)

// 監聽身分載入完成時的自動定位
watch(myMahjongStatus, (status) => {
    if (status?.linked && status.player) {
        selectedPlayerId.value = status.player.accountId
    }
})

// 判斷當前查看的是否為本人
const isViewingSelf = computed(() => {
    return Boolean(
        myMahjongStatus.value?.linked &&
        myMahjongStatus.value?.player?.accountId === selectedPlayerId.value
    )
})

// 一鍵切換回自己
const switchToMyself = () => {
    if (myMahjongStatus.value?.player?.accountId) {
        selectedPlayerId.value = myMahjongStatus.value.player.accountId
    }
}

const currentPlayer = computed(() => playerItems.value.find(p => p.id === selectedPlayerId.value))

// ==========================================
// 3. 時間範圍狀態機與巨集預設
// ==========================================
const careerBounds = reactive({
    start: '2023-01',
    end: '2026-12'
})

const dateRange = reactive({
    start: '',
    end: ''
})

const getRolling12Months = () => {
    const now = new Date()
    const endYear = now.getFullYear()
    const endMonth = now.getMonth() + 1
    const end = `${endYear}-${String(endMonth).padStart(2, '0')}`

    const startDate = new Date(endYear, endMonth - 1 - 11, 1)
    const startYear = startDate.getFullYear()
    const startMonth = startDate.getMonth() + 1
    const start = `${startYear}-${String(startMonth).padStart(2, '0')}`

    return { start, end }
}

const presets = computed<DatePreset[]>(() => {
    const rolling12 = getRolling12Months()

    return [
        { id: 'all', label: '生涯全部', start: careerBounds.start, end: careerBounds.end },
        { id: 'recent_1y', label: '近12個月', start: rolling12.start, end: rolling12.end },
        { id: '2026', label: '2026全年', start: '2026-01', end: '2026-12' },
        { id: '2025', label: '2025全年', start: '2025-01', end: '2025-12' },
        { id: '2024', label: '2024全年', start: '2024-01', end: '2024-12' },
        { id: '2023', label: '2023全年', start: '2023-01', end: '2023-12' }
    ]
})

const activePresetId = computed(() => {
    if (!dateRange.start || !dateRange.end) return 'all'
    const hit = presets.value.find(p => p.start === dateRange.start && p.end === dateRange.end)
    return hit ? hit.id : 'custom'
})

const applyPreset = (preset: DatePreset) => {
    dateRange.start = preset.start
    dateRange.end = preset.end
}

// ==========================================
// 4. 戰績聚合數據拉取
// ==========================================
const { data: statsData, pending: loadingStats } = await useFetch(
    () => `/api/mahjong/players/${selectedPlayerId.value}/sanma`,
    {
        query: computed(() => ({
            start: dateRange.start || undefined,
            end: dateRange.end || undefined,
            exclude_invitational: excludeInvitational.value ? 'true' : undefined,
            exclude_group: excludeGroup.value ? 'true' : undefined
        })),
        watch: [selectedPlayerId, excludeInvitational, excludeGroup]
    }
)

// ★ 唯一乾淨的選手切換監聽：清空區間觸發重置訊號
watch(selectedPlayerId, () => {
    dateRange.start = ''
    dateRange.end = ''
})

// 僅在區間為空時吸附生涯邊界，點擊年份按鈕絕不回彈
watch(statsData, (newData) => {
    if (!newData?.careerBounds) return

    careerBounds.start = newData.careerBounds.start
    careerBounds.end = newData.careerBounds.end

    if (!dateRange.start || !dateRange.end) {
        dateRange.start = newData.careerBounds.start
        dateRange.end = newData.careerBounds.end
    }
}, { immediate: true })

// ==========================================
// 5. ECharts 圖表計算屬性
// ==========================================
const pieOption = computed(() => {
    const p = statsData.value?.placements || { rank1: 0, rank2: 0, rank3: 0, total: 0 }
    return {
        tooltip: { trigger: 'item', formatter: '{b}: {c}次 ({d}%)' },
        legend: { bottom: '0', textStyle: { color: '#9ca3af' } },
        series: [{
            type: 'pie',
            radius: ['40%', '70%'],
            avoidLabelOverlap: false,
            itemStyle: { borderRadius: 6, borderColor: '#1f2937', borderWidth: 2 },
            label: { show: false },
            data: p.total > 0 ? [
                { value: p.rank1, name: '1st Place', itemStyle: { color: '#10b981' } },
                { value: p.rank2, name: '2nd Place', itemStyle: { color: '#f59e0b' } },
                { value: p.rank3, name: '3rd Place', itemStyle: { color: '#ef4444' } }
            ] : [
                { value: 1, name: '無出賽記錄', itemStyle: { color: '#374151' } }
            ]
        }]
    }
})

const lineOption = computed(() => {
    const ranks = statsData.value?.recentRanks || []
    return {
        tooltip: { trigger: 'axis', formatter: '第 {b} 場: 第 {c} 位' },
        grid: { left: '40', right: '20', top: '20', bottom: '30' },
        xAxis: {
            type: 'category',
            data: Array.from({ length: ranks.length }, (_, i) => i + 1),
            axisLine: { lineStyle: { color: '#374151' } }
        },
        yAxis: {
            type: 'value',
            inverse: true,
            min: 1,
            max: 3,
            interval: 1,
            axisLabel: { formatter: (v: number) => v === 1 ? '1st' : v === 2 ? '2nd' : '3rd' },
            splitLine: { lineStyle: { color: '#1f2937' } }
        },
        series: [{
            data: ranks,
            type: 'line',
            smooth: true,
            symbolSize: 8,
            itemStyle: { color: '#3b82f6' },
            lineStyle: { width: 3, color: '#3b82f6' },
            areaStyle: { color: 'rgba(59, 130, 246, 0.1)' }
        }]
    }
})

const radarOption = computed(() => {
    const raw = statsData.value?.radarStats || { atk: 0, spd: 0, def: 0, luk: 0 }

    const atkScore = Math.min(100, Math.max(0, (raw.atk / 10000) * 100))
    const spdScore = raw.spd > 0 ? Math.min(100, Math.max(0, ((15 - raw.spd) / (15 - 6)) * 100)) : 0
    const defScore = Math.min(100, Math.max(0, ((25 - raw.def) / 25) * 100))
    const lukScore = Math.min(100, Math.max(0, (raw.luk / 30) * 100))

    const scores = [
        Number(atkScore.toFixed(1)),
        Number(spdScore.toFixed(1)),
        Number(defScore.toFixed(1)),
        Number(lukScore.toFixed(1))
    ]

    return {
        tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            borderColor: '#374151',
            textStyle: { color: '#f3f4f6', fontSize: 12 },
            formatter: () => `
        <div class="font-bold border-b border-gray-700 pb-1 mb-1 text-emerald-400">四維作風指標</div>
        <div>攻 (ATK): ${scores[0]}分 <span class="text-xs text-gray-400">(${raw.atk}點)</span></div>
        <div>速 (SPD): ${scores[1]}分 <span class="text-xs text-gray-400">(${raw.spd}巡)</span></div>
        <div>防 (DEF): ${scores[2]}分 <span class="text-xs text-gray-400">(銃率 ${raw.def}%)</span></div>
        <div>運 (LUK): ${scores[3]}分 <span class="text-xs text-gray-400">(${raw.luk}役)</span></div>
      `
        },
        radar: {
            indicator: [
                { name: '攻 ATK\n(打點)', max: 100 },
                { name: '速 SPD\n(巡數)', max: 100 },
                { name: '防 DEF\n(守備)', max: 100 },
                { name: '運 LUK\n(番運)', max: 100 }
            ],
            radius: '65%',
            splitNumber: 4,
            axisName: { color: '#9ca3af', fontSize: 11, fontWeight: 'bold' },
            splitLine: { lineStyle: { color: 'rgba(156, 163, 175, 0.2)' } },
            axisLine: { lineStyle: { color: 'rgba(156, 163, 175, 0.2)' } }
        },
        series: [{
            type: 'radar',
            data: [{
                value: scores,
                name: '選手風格',
                itemStyle: { color: '#10b981' },
                areaStyle: { color: 'rgba(16, 185, 129, 0.25)' },
                lineStyle: { width: 2, color: '#10b981' },
                symbolSize: 6
            }]
        }]
    }
})

const winStyleOption = computed(() => {
    const ws = statsData.value?.winStyles || { riichi: 0, dama: 0, fulo: 0 }
    const total = ws.riichi + ws.dama + ws.fulo
    return {
        tooltip: { trigger: 'item', formatter: '{b}: {c}次 ({d}%)' },
        legend: { bottom: '0', textStyle: { color: '#9ca3af' } },
        series: [{
            type: 'pie',
            radius: ['40%', '70%'],
            avoidLabelOverlap: false,
            itemStyle: { borderRadius: 6, borderColor: '#1f2937', borderWidth: 2 },
            label: { show: false },
            data: total > 0 ? [
                { value: ws.riichi, name: '立直和牌 (Riichi)', itemStyle: { color: '#ef4444' } },
                { value: ws.dama, name: '默聽和牌 (Dama)', itemStyle: { color: '#3b82f6' } },
                { value: ws.fulo, name: '副露和牌 (Fulo)', itemStyle: { color: '#f59e0b' } }
            ] : [
                { value: 1, name: '無和牌記錄', itemStyle: { color: '#374151' } }
            ]
        }]
    }
})

// 靜態成就佔位
const achievements = ref([
    { title: '役滿盃 冠軍', event: '2023 March Mahjong Event', date: '2023-03-28', icon: '🏆' },
    { title: '年度大師賽 季軍', event: '2024 December Finals', date: '2024-12-15', icon: '🥉' },
    { title: '活動周單日四連勝', event: '2025 Event Week', date: '2025-06-12', icon: '🔥' }
])
</script>

<template>
    <div class="max-w-6xl w-full mx-auto px-4 py-8 space-y-8">

        <!-- 1. 頂欄卡片：選手選擇與時間過濾 (獨立閉合，不污染下方圖表) -->
        <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm space-y-6">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div class="flex items-center gap-3">
                        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">三麻選手數據面板</h1>
                        <UBadge v-if="isViewingSelf" color="primary" variant="solid" size="xs">
                            🀄 我的主頁 (You)
                        </UBadge>
                    </div>
                    <p class="text-sm text-gray-500 mt-1">Sanma Player Dashboard & Career Highlights</p>
                </div>

                <!-- 選手選擇器 + 「回我的主頁」快捷鍵 -->
                <div class="flex items-center gap-2 w-full md:w-auto">
                    <UButton
                        v-if="myMahjongStatus?.linked && !isViewingSelf"
                        size="xs"
                        color="neutral"
                        variant="soft"
                        icon="i-heroicons-user"
                        class="font-mono"
                        @click="switchToMyself"
                    >
                        回我的主頁
                    </UButton>

                    <div class="w-full md:w-64">
                        <USelectMenu
                            v-model="selectedPlayerId"
                            :items="playerItems"
                            value-key="id"
                            placeholder="選擇選手..."
                            class="w-full"
                        />
                    </div>
                </div>
            </div>

            <!-- 時間導航與賽制過濾 -->
            <div class="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <span class="text-xs font-bold uppercase tracking-wider text-gray-400">
                        統計時間範圍 (Timeline Scope)
                    </span>
                    <span class="text-xs font-mono text-gray-500">
                        當前區間: {{ dateRange.start || careerBounds.start }} ~ {{ dateRange.end || careerBounds.end }}
                    </span>
                </div>

                <div class="flex flex-wrap items-center justify-between gap-4">
                    <!-- 常用巨集預設 -->
                    <div class="flex flex-wrap items-center gap-1.5 bg-gray-100 dark:bg-gray-800/80 p-1 rounded-lg">
                        <button
                            v-for="preset in presets"
                            :key="preset.id"
                            class="px-2.5 py-1 text-xs rounded-md font-mono transition-colors"
                            :class="activePresetId === preset.id ? 'bg-primary-500 text-white font-bold shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'"
                            @click="applyPreset(preset)"
                        >
                            {{ preset.label }}
                        </button>
                    </div>

                    <!-- 精確月份選擇器 -->
                    <div class="flex items-center gap-2 text-xs font-mono">
                        <span class="text-gray-400">自訂月份:</span>
                        <input
                            v-model="dateRange.start"
                            type="month"
                            :min="careerBounds.start"
                            :max="dateRange.end || careerBounds.end"
                            class="bg-transparent border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:border-primary-500"
                        />
                        <span class="text-gray-400">至</span>
                        <input
                            v-model="dateRange.end"
                            type="month"
                            :min="dateRange.start || careerBounds.start"
                            :max="careerBounds.end"
                            class="bg-transparent border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:border-primary-500"
                        />
                    </div>
                </div>

                <!-- 賽制過濾器 -->
                <div class="pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center gap-6 text-xs font-mono">
                    <span class="text-gray-400 font-bold uppercase tracking-wider">特殊賽制過濾:</span>
                    <div class="flex items-center gap-4">
                        <UCheckbox
                            v-model="excludeInvitational"
                            name="excludeInvitational"
                            label="排除邀請賽 (Invitational)"
                        />
                        <UCheckbox
                            v-model="excludeGroup"
                            name="excludeGroup"
                            label="排除分組/團體賽 (Group / Relay)"
                        />
                    </div>
                </div>
            </div>
        </div>

        <!-- 2. 圖表區上半部 (順位分佈餅圖 + 近20場折線圖) -->
        <div v-if="selectedPlayerId" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
                <h2 class="text-lg font-bold text-gray-900 dark:text-white mb-4">
                    {{ currentPlayer?.label }} · 生涯順位分佈 (三麻)
                </h2>
                <div class="h-72 w-full flex items-center justify-center">
                    <ClientOnly>
                        <VChart v-if="pieOption" :option="pieOption" class="w-full h-full" autoresize />
                        <template #fallback>
                            <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
                        </template>
                    </ClientOnly>
                </div>
            </div>

            <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
                <h2 class="text-lg font-bold text-gray-900 dark:text-white mb-4">
                    最近 20 場順位趨勢
                </h2>
                <div class="h-72 w-full flex items-center justify-center">
                    <ClientOnly>
                        <VChart v-if="lineOption" :option="lineOption" class="w-full h-full" autoresize />
                        <template #fallback>
                            <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
                        </template>
                    </ClientOnly>
                </div>
            </div>
        </div>

        <!-- 3. 圖表區下半部 (四維雷達圖 + 和牌形態餅圖) -->
        <div v-if="selectedPlayerId" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
                <div class="flex items-center justify-between mb-4">
                    <div>
                        <h2 class="text-lg font-bold text-gray-900 dark:text-white">四維選手畫像 · Performance Radar</h2>
                        <p class="text-xs text-gray-500">攻 / 速 / 防 (近100局) · 運 (近20局)</p>
                    </div>
                    <UBadge color="primary" variant="subtle" size="xs">Kyoku Level</UBadge>
                </div>

                <div class="h-72 w-full flex items-center justify-center">
                    <ClientOnly>
                        <VChart v-if="radarOption" :option="radarOption" class="w-full h-full" autoresize />
                        <template #fallback>
                            <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
                        </template>
                    </ClientOnly>
                </div>
            </div>

            <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
                <div class="flex items-center justify-between mb-4">
                    <div>
                        <h2 class="text-lg font-bold text-gray-900 dark:text-white">和牌形態分佈 · Win Methods</h2>
                        <p class="text-xs text-gray-500">立直 / 默聽 / 副露 和牌傾向佔比</p>
                    </div>
                    <UBadge color="neutral" variant="subtle" size="xs">Win Hands Only</UBadge>
                </div>

                <div class="h-72 w-full flex items-center justify-center">
                    <ClientOnly>
                        <VChart v-if="winStyleOption" :option="winStyleOption" class="w-full h-full" autoresize />
                        <template #fallback>
                            <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
                        </template>
                    </ClientOnly>
                </div>
            </div>
        </div>

        <!-- 4. 手動榮譽成就展區 -->
        <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
            <div class="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
                <div>
                    <h2 class="text-lg font-bold text-gray-900 dark:text-white">榮譽與成就 · Achievements</h2>
                    <p class="text-xs text-gray-500">歷史大賽桂冠與特殊賽事頭名記錄</p>
                </div>
                <UBadge color="neutral" variant="solid" size="xs">手動維護</UBadge>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div
                    v-for="(achieve, idx) in achievements"
                    :key="idx"
                    class="flex items-start gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800"
                >
                    <div class="text-2xl">{{ achieve.icon || '🏆' }}</div>
                    <div>
                        <div class="font-bold text-sm text-gray-900 dark:text-white">{{ achieve.title }}</div>
                        <div class="text-xs text-emerald-500 font-mono mt-0.5">{{ achieve.event }}</div>
                        <div class="text-[11px] text-gray-400 mt-1">{{ achieve.date }}</div>
                    </div>
                </div>
            </div>
        </div>

    </div>
</template>