<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { use } from 'echarts/core'
import { PieChart, LineChart, RadarChart } from 'echarts/charts'
import { TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'

use([PieChart, LineChart, RadarChart, TooltipComponent, LegendComponent, GridComponent, CanvasRenderer])

// ==========================================
// 1. 核心契約介面
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

interface FrequentOpponent {
    accountId: number
    nickname: string
    count: number
    rate: number
}

interface MajorHandRecord {
    paipuId: string
    date: string
    score: number
    totalHan: number
    title: string
    yakus: Array<{ name: string; han: number; isYakuman: boolean; label: string }>
}

const { data: myMahjongStatus } = await useFetch<MahjongMeResponse>('/api/mahjong/me')

const excludeInvitational = ref(false)
const excludeGroup = ref(false)

// 2. 選手列表載入
const { data: playerItemsData } = await useFetch<PlayerItem[]>('/api/mahjong/players')
const playerItems = computed(() => playerItemsData.value || [])

const initialPlayerId = computed(() => {
    if (myMahjongStatus.value?.linked && myMahjongStatus.value.player) {
        return myMahjongStatus.value.player.accountId
    }
    return playerItems.value[0]?.id || 9577962
})

const selectedPlayerId = ref<number>(initialPlayerId.value)

watch(myMahjongStatus, (status) => {
    if (status?.linked && status.player) {
        selectedPlayerId.value = status.player.accountId
    }
}, { immediate: true })

const isViewingSelf = computed(() => {
    return Boolean(
        myMahjongStatus.value?.linked &&
        myMahjongStatus.value?.player?.accountId === selectedPlayerId.value
    )
})

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
        { id: 'all', label: '生涯全部', start: '', end: '' },
        { id: 'recent_1y', label: '近12個月', start: rolling12.start, end: rolling12.end },
        { id: '2026', label: '2026全年', start: '2026-01', end: '2026-12' },
        { id: '2025', label: '2025全年', start: '2025-01', end: '2025-12' },
        { id: '2024', label: '2024全年', start: '2024-01', end: '2024-12' },
        { id: '2023', label: '2023全年', start: '2023-01', end: '2023-12' }
    ]
})

const activePresetId = computed(() => {
    if (!dateRange.start && !dateRange.end) return 'all'
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

watch(selectedPlayerId, () => {
    dateRange.start = ''
    dateRange.end = ''
})

watch(statsData, (newData) => {
    if (!newData?.careerBounds) return

    careerBounds.start = newData.careerBounds.start
    careerBounds.end = newData.careerBounds.end

    // 如果是選手初次載入且未指定區間，保持 dateRange 為空（即默認查生涯全部）
}, { immediate: true })

// ==========================================
// 5. 基礎指標矩陣數據提取
// ==========================================
const basic = computed(() => statsData.value?.basicStats || {
    matchesCount: 0,
    totalRounds: 0,
    avgRank: '0.000',
    bustingRate: 0,
    winRate: 0,
    dealInRate: 0,
    tsumoRate: 0,
    damaRate: 0,
    callRate: 0,
    riichiRate: 0,
    drawRate: 0,
    drawTenpaiRate: 0,
    avgWinScore: 0,
    avgDealInScore: 0,
    avgWinTurn: 0,
    mrRating: '未定級（N/A）',
    mrLabel: '當前賽季'
})

// 預設檢視模式：'win' (最大和牌) 或 'dealIn' (最近大銃)
const majorHandMode = ref<'win' | 'dealIn'>('win')

const biggestWin = computed<MajorHandRecord | null>(() => {
    return (statsData.value as any)?.majorHands?.biggestWin || null
})

const biggestDealIn = computed<MajorHandRecord | null>(() => {
    return (statsData.value as any)?.majorHands?.biggestDealIn || null
})

const currentMajorHand = computed(() => {
    return majorHandMode.value === 'win' ? biggestWin.value : biggestDealIn.value
})

// ==========================================
// 6. ECharts 圖表配置
// ==========================================

// 6.1 順位餅圖
const pieOption = computed(() => {
    const p = statsData.value?.placements || { rank1: 0, rank2: 0, rank3: 0, total: 0 }
    return {
        tooltip: { trigger: 'item', formatter: '{b}: {c}場 ({d}%)' },
        legend: { bottom: '0', textStyle: { color: '#9ca3af' } },
        series: [{
            type: 'pie',
            radius: ['45%', '72%'],
            avoidLabelOverlap: false,
            itemStyle: { borderRadius: 6, borderColor: '#111827', borderWidth: 2 },
            label: { show: false },
            data: p.total > 0 ? [
                { value: p.rank1, name: '一位 (1st)', itemStyle: { color: '#10b981' } },
                { value: p.rank2, name: '二位 (2nd)', itemStyle: { color: '#64748b' } },
                { value: p.rank3, name: '三位 (3rd)', itemStyle: { color: '#ef4444' } }
            ] : [
                { value: 1, name: '無出賽記錄', itemStyle: { color: '#374151' } }
            ]
        }]
    }
})

// 6.2 最近 50 場走勢 (通欄展開，高密度點陣微調)
const lineOption = computed(() => {
    const ranks = statsData.value?.recentRanks || []
    return {
        tooltip: {
            trigger: 'axis',
            formatter: '第 {b} 場: 第 {c} 位',
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            borderColor: '#374151',
            textStyle: { color: '#f3f4f6', fontSize: 12 }
        },
        grid: { left: '40', right: '30', top: '25', bottom: '30' },
        xAxis: {
            type: 'category',
            data: Array.from({ length: ranks.length }, (_, i) => i + 1),
            axisLine: { lineStyle: { color: '#374151' } },
            axisLabel: { color: '#9ca3af', fontSize: 11 }
        },
        yAxis: {
            type: 'value',
            inverse: true,
            min: 1,
            max: 3,
            interval: 1,
            axisLabel: {
                formatter: (v: number) => v === 1 ? '1位' : v === 2 ? '2位' : '3位',
                color: '#9ca3af',
                fontSize: 11
            },
            splitLine: { lineStyle: { color: '#1f2937' } }
        },
        series: [{
            data: ranks,
            type: 'line',
            smooth: 0.25, // 微平滑，避免過度彎曲
            showSymbol: true,
            symbolSize: 6, // 點多時自動收縮點徑，保持乾淨
            itemStyle: { color: '#3b82f6' },
            lineStyle: { width: 2.5, color: '#3b82f6' },
            areaStyle: {
                color: {
                    type: 'linear',
                    x: 0, y: 0, x2: 0, y2: 1,
                    colorStops: [
                        { offset: 0, color: 'rgba(59, 130, 246, 0.25)' },
                        { offset: 1, color: 'rgba(59, 130, 246, 0.0)' }
                    ]
                }
            }
        }]
    }
})

// 6.2 提取最常同桌名冊 (好品味兜底：若無資料則為空陣列，保證 length 永遠安全)
const frequentOpponents = computed<FrequentOpponent[]>(() => {
    return (statsData.value as any)?.frequentOpponents || []
})

// 好品味互動：點擊對手卡片瞬間切換主視角，全頁自動重算該對手數據
const inspectOpponent = (oppAccountId: number) => {
    if (!oppAccountId) return
    selectedPlayerId.value = oppAccountId
}

// ==========================================
// 6.3 四維作風雷達圖：固定競技基準歸一化引擎
// ==========================================

// 1. 標定三麻環境下的理論極值 (Min: 0分線, Max: 100分滿分線)
const RADAR_BENCHMARKS = {
    // 攻 (ATK): 平均和牌打點 (點) - 正向指標
    // 4000 點 (滿貫以下常規便宜手) 為 0 分，12000 點 (跳滿/倍滿平均) 為 100 分
    atk: { min: 4000, max: 12000, invert: false },

    // 速 (SPD): 平均和了巡數 (巡) - 反向指標 (越小越強)
    // 14 巡 (摸完牌山前夕) 為 0 分，7 巡 (極限速攻) 為 100 分
    spd: { min: 7, max: 14, invert: true },

    // 防 (DEF): 放銃率 (%) - 反向指標 (越小越強)
    // 24% (極度容易點炮) 為 0 分，8% (鐵壁防守) 為 100 分
    def: { min: 8, max: 24, invert: true },

    // 運 (LUK): 近20局番運累計 (役種數) - 正向指標
    // 5 役為 0 分，35 役為 100 分
    luk: { min: 5, max: 35, invert: false }
}

// 2. 好品味純函數：將任意值精確收斂在 [0, 100] 區間內
function normalizeRadarMetric(val: number, config: { min: number; max: number; invert: boolean }): number {
    if (val <= 0 && !config.invert) return 0

    // 算術映射
    let ratio = (val - config.min) / (config.max - config.min)

    // 反向指標反轉 (如放銃率：銃率越小，ratio 越接近 1)
    if (config.invert) {
        ratio = (config.max - val) / (config.max - config.min)
    }

    // 邊界防禦：死死鎖死在 0 到 100
    const clamped = Math.min(100, Math.max(0, ratio * 100))
    return Number(clamped.toFixed(1))
}

// 3. ECharts 雷達配置
const radarOption = computed(() => {
    const raw = statsData.value?.radarStats || { atk: 0, spd: 0, def: 0, luk: 0 }

    const scores = [
        normalizeRadarMetric(raw.atk, RADAR_BENCHMARKS.atk),
        normalizeRadarMetric(raw.spd, RADAR_BENCHMARKS.spd),
        normalizeRadarMetric(raw.def, RADAR_BENCHMARKS.def),
        normalizeRadarMetric(raw.luk, RADAR_BENCHMARKS.luk)
    ]

    return {
        tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            borderColor: '#374151',
            textStyle: { color: '#f3f4f6', fontSize: 12 },
            formatter: () => `
        <div class="font-bold border-b border-gray-700 pb-1 mb-1 text-emerald-400">四維作風指標 (基準量綱: 0 ~ 100)</div>
        <div>攻 (ATK): ${scores[0]}分 <span class="text-xs text-gray-400">(場均打點 ${raw.atk.toLocaleString()}點)</span></div>
        <div>速 (SPD): ${scores[1]}分 <span class="text-xs text-gray-400">(平均和巡 ${raw.spd}巡)</span></div>
        <div>防 (DEF): ${scores[2]}分 <span class="text-xs text-gray-400">(放銃率 ${raw.def}%)</span></div>
        <div>運 (LUK): ${scores[3]}分 <span class="text-xs text-gray-400">(累計番運 ${raw.luk}役)</span></div>
      `
        },
        radar: {
            indicator: [
                { name: '攻 ATK\n(打點)', max: 100, min: 0 },
                { name: '速 SPD\n(巡數)', max: 100, min: 0 },
                { name: '防 DEF\n(守備)', max: 100, min: 0 },
                { name: '運 LUK\n(番運)', max: 100, min: 0 }
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

// 6.4 姿態 1：和牌時狀態餅圖
const winStyleOption = computed(() => {
    const ws = statsData.value?.winStyles || { riichi: 0, dama: 0, fulo: 0 }
    const total = ws.riichi + ws.dama + ws.fulo
    return {
        tooltip: { trigger: 'item', formatter: '{b}: {c}次 ({d}%)' },
        legend: { bottom: '0', textStyle: { color: '#9ca3af', fontSize: 11 } },
        series: [{
            type: 'pie',
            radius: ['45%', '72%'],
            avoidLabelOverlap: false,
            itemStyle: { borderRadius: 6, borderColor: '#111827', borderWidth: 2 },
            label: { show: false },
            data: total > 0 ? [
                { value: ws.riichi, name: '立直', itemStyle: { color: '#0f4c81' } },
                { value: ws.fulo, name: '副露', itemStyle: { color: '#7c3aed' } },
                { value: ws.dama, name: '默聽', itemStyle: { color: '#f43f5e' } }
            ] : [
                { value: 1, name: '無和牌記錄', itemStyle: { color: '#374151' } }
            ]
        }]
    }
})

// 6.5 姿態 2：放銃時自身狀態餅圖
const dealInStyleOption = computed(() => {
    const ds = statsData.value?.dealInStyles || { riichi: 0, fulo: 0, menzen: 0 }
    const total = ds.riichi + ds.fulo + ds.menzen
    return {
        tooltip: { trigger: 'item', formatter: '{b}: {c}次 ({d}%)' },
        legend: { bottom: '0', textStyle: { color: '#9ca3af', fontSize: 11 } },
        series: [{
            type: 'pie',
            radius: ['45%', '72%'],
            avoidLabelOverlap: false,
            itemStyle: { borderRadius: 6, borderColor: '#111827', borderWidth: 2 },
            label: { show: false },
            data: total > 0 ? [
                { value: ds.riichi, name: '立直時', itemStyle: { color: '#0f4c81' } },
                { value: ds.fulo, name: '副露時', itemStyle: { color: '#7c3aed' } },
                { value: ds.menzen, name: '門清時', itemStyle: { color: '#f43f5e' } }
            ] : [
                { value: 1, name: '無放銃記錄', itemStyle: { color: '#374151' } }
            ]
        }]
    }
})

// 6.6 姿態 3：放銃至對象狀態餅圖
const dealInTargetOption = computed(() => {
    const ts = statsData.value?.dealInTargetStyles || { riichi: 0, fulo: 0, dama: 0 }
    const total = ts.riichi + ts.fulo + ts.dama
    return {
        tooltip: { trigger: 'item', formatter: '{b}: {c}次 ({d}%)' },
        legend: { bottom: '0', textStyle: { color: '#9ca3af', fontSize: 11 } },
        series: [{
            type: 'pie',
            radius: ['45%', '72%'],
            avoidLabelOverlap: false,
            itemStyle: { borderRadius: 6, borderColor: '#111827', borderWidth: 2 },
            label: { show: false },
            data: total > 0 ? [
                { value: ts.riichi, name: '放銃至立直', itemStyle: { color: '#0f4c81' } },
                { value: ts.fulo, name: '放銃至副露', itemStyle: { color: '#7c3aed' } },
                { value: ts.dama, name: '放銃至默聽', itemStyle: { color: '#f43f5e' } }
            ] : [
                { value: 1, name: '無放銃記錄', itemStyle: { color: '#374151' } }
            ]
        }]
    }
})

// 成就佔位
const achievements = ref([
    { title: '役滿盃 冠軍', event: '2023 March Mahjong Event', date: '2023-03-28', icon: '🏆' },
    { title: '年度大師賽 季軍', event: '2024 December Finals', date: '2024-12-15', icon: '🥉' },
    { title: '活動周單日四連勝', event: '2025 Event Week', date: '2025-06-12', icon: '🔥' }
])
</script>

<template>
    <div class="max-w-6xl w-full mx-auto px-4 py-8 space-y-8">

        <!-- 1. 頂欄：選手選擇與時間過濾 -->
        <div
            class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm space-y-6">
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

                <div class="flex items-center gap-2 w-full md:w-auto">
                    <UButton v-if="myMahjongStatus?.linked && !isViewingSelf" size="xs" color="neutral" variant="soft"
                        icon="i-lucide-user" class="font-mono" @click="switchToMyself">
                        回我的主頁
                    </UButton>

                    <div class="w-full md:w-64">
                        <USelectMenu v-model="selectedPlayerId" :items="playerItems" value-key="id"
                            placeholder="選擇選手..." class="w-full" />
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
                    <div class="flex flex-wrap items-center gap-1.5 bg-gray-100 dark:bg-gray-800/80 p-1 rounded-lg">
                        <button v-for="preset in presets" :key="preset.id"
                            class="px-2.5 py-1 text-xs rounded-md font-mono transition-colors"
                            :class="activePresetId === preset.id ? 'bg-primary-500 text-white font-bold shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'"
                            @click="applyPreset(preset)">
                            {{ preset.label }}
                        </button>
                    </div>

                    <div class="flex items-center gap-2 text-xs font-mono">
                        <span class="text-gray-400">自訂月份:</span>
                        <input v-model="dateRange.start" type="month" :min="careerBounds.start"
                            :max="dateRange.end || careerBounds.end"
                            class="bg-transparent border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:border-primary-500" />
                        <span class="text-gray-400">至</span>
                        <input v-model="dateRange.end" type="month" :min="dateRange.start || careerBounds.start"
                            :max="careerBounds.end"
                            class="bg-transparent border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:border-primary-500" />
                    </div>
                </div>

                <div
                    class="pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center gap-6 text-xs font-mono">
                    <span class="text-gray-400 font-bold uppercase tracking-wider">特殊賽制過濾:</span>
                    <div class="flex items-center gap-4">
                        <UCheckbox v-model="excludeInvitational" name="excludeInvitational"
                            label="排除邀請賽 (Invitational)" />
                        <UCheckbox v-model="excludeGroup" name="excludeGroup" label="排除分組/團體賽 (Group / Relay)" />
                    </div>
                </div>
            </div>
        </div>

        <!-- 2. 牌譜屋級別：全套基礎戰績數據矩陣 (Basic Stats Matrix) -->
        <div v-if="selectedPlayerId"
            class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
            <div class="flex items-center justify-between mb-5 border-b border-gray-100 dark:border-gray-800 pb-3">
                <div class="flex items-center gap-3">
                    <h2 class="text-lg font-bold text-gray-900 dark:text-white">基礎戰績矩陣 · Basic Performance</h2>
                </div>
                <div class="text-xs font-mono text-gray-500">
                    記錄場數: <span class="font-bold text-gray-900 dark:text-white">{{ basic.matchesCount }}</span> 場 /
                    總局數: <span class="font-bold text-gray-900 dark:text-white">{{ basic.totalRounds }}</span> 局
                </div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 font-mono">
                <div
                    class="bg-gray-50 dark:bg-gray-800/40 p-3 rounded-lg border border-gray-100 dark:border-gray-800/80">
                    <div class="text-xs text-gray-400">平均順位</div>
                    <div class="text-lg font-bold text-gray-900 dark:text-white mt-1">{{ basic.avgRank }}</div>
                </div>
                <div
                    class="bg-gray-50 dark:bg-gray-800/40 p-3 rounded-lg border border-gray-100 dark:border-gray-800/80">
                    <div class="text-xs text-gray-400">和牌率</div>
                    <div class="text-lg font-bold text-emerald-500 mt-1">{{ basic.winRate }}%</div>
                </div>
                <div
                    class="bg-gray-50 dark:bg-gray-800/40 p-3 rounded-lg border border-gray-100 dark:border-gray-800/80">
                    <div class="text-xs text-gray-400">放銃率</div>
                    <div class="text-lg font-bold text-rose-500 mt-1">{{ basic.dealInRate }}%</div>
                </div>
                <div
                    class="bg-gray-50 dark:bg-gray-800/40 p-3 rounded-lg border border-gray-100 dark:border-gray-800/80">
                    <div class="text-xs text-gray-400">立直率</div>
                    <div class="text-lg font-bold text-blue-500 mt-1">{{ basic.riichiRate }}%</div>
                </div>
                <div
                    class="bg-gray-50 dark:bg-gray-800/40 p-3 rounded-lg border border-gray-100 dark:border-gray-800/80">
                    <div class="text-xs text-gray-400">副露率</div>
                    <div class="text-lg font-bold text-amber-500 mt-1">{{ basic.callRate }}%</div>
                </div>
                <div
                    class="bg-gray-50 dark:bg-gray-800/40 p-3 rounded-lg border border-gray-100 dark:border-gray-800/80">
                    <div class="text-xs text-gray-400">默胡率</div>
                    <div class="text-lg font-bold text-gray-900 dark:text-white mt-1">{{ basic.damaRate }}%</div>
                </div>

                <div
                    class="bg-gray-50 dark:bg-gray-800/40 p-3 rounded-lg border border-gray-100 dark:border-gray-800/80">
                    <div class="text-xs text-gray-400">自摸率</div>
                    <div class="text-lg font-bold text-emerald-400 mt-1">{{ basic.tsumoRate }}%</div>
                </div>
                <div
                    class="bg-gray-50 dark:bg-gray-800/40 p-3 rounded-lg border border-gray-100 dark:border-gray-800/80">
                    <div class="text-xs text-gray-400">流聽率</div>
                    <div class="text-lg font-bold text-purple-400 mt-1">{{ basic.drawTenpaiRate }}%</div>
                </div>
                <div
                    class="bg-gray-50 dark:bg-gray-800/40 p-3 rounded-lg border border-gray-100 dark:border-gray-800/80">
                    <div class="text-xs text-gray-400">流局率</div>
                    <div class="text-lg font-bold text-gray-400 mt-1">{{ basic.drawRate }}%</div>
                </div>
                <div
                    class="bg-gray-50 dark:bg-gray-800/40 p-3 rounded-lg border border-gray-100 dark:border-gray-800/80">
                    <div class="text-xs text-gray-400">平均打點</div>
                    <div class="text-lg font-bold text-gray-900 dark:text-white mt-1">{{
                        basic.avgWinScore.toLocaleString() }}</div>
                </div>
                <div
                    class="bg-gray-50 dark:bg-gray-800/40 p-3 rounded-lg border border-gray-100 dark:border-gray-800/80">
                    <div class="text-xs text-gray-400">平均銃點</div>
                    <div class="text-lg font-bold text-rose-400 mt-1">{{ basic.avgDealInScore.toLocaleString() }}</div>
                </div>
                <div
                    class="bg-gray-50 dark:bg-gray-800/40 p-3 rounded-lg border border-gray-100 dark:border-gray-800/80">
                    <div class="text-xs text-gray-400">和了巡數</div>
                    <div class="text-lg font-bold text-gray-900 dark:text-white mt-1">{{ basic.avgWinTurn }} 巡</div>
                </div>

                <div
                    class="bg-gray-50 dark:bg-gray-800/40 p-3 rounded-lg border border-gray-100 dark:border-gray-800/80">
                    <div class="text-xs text-gray-400">被飛率</div>
                    <div class="text-lg font-bold text-rose-500 mt-1">{{ basic.bustingRate }}%</div>
                </div>
                <div
                    class="bg-gray-50 dark:bg-gray-800/40 p-3 rounded-lg border border-gray-100 dark:border-gray-800/80">
                    <div class="text-xs text-gray-400">天梯等級 ({{ basic.mrLabel }})</div>
                    <div class="text-lg font-bold text-primary-500 mt-1">{{ basic.mrRating }}</div>
                </div>
            </div>
        </div>

        <!-- 3. 選手宏觀畫像區：左側順位分佈圓環 + 右側四維作風雷達 (幾何對稱雙雄) -->
        <div v-if="selectedPlayerId" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- 左：累計順位分佈 -->
            <div
                class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
                <div class="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3 mb-2">
                    <div>
                        <h2 class="text-lg font-bold text-gray-900 dark:text-white">累計順位戰績 · Rank Distribution</h2>
                        <p class="text-xs text-gray-500">所選區間內一位、二位、三位分佈佔比</p>
                    </div>
                </div>

                <div class="h-72 w-full flex items-center justify-center">
                    <ClientOnly>
                        <VChart v-if="pieOption" :option="pieOption" class="w-full h-full" autoresize />
                        <template #fallback>
                            <UIcon name="i-lucide-loader-circle" class="w-8 h-8 animate-spin text-gray-400" />
                        </template>
                    </ClientOnly>
                </div>
            </div>

            <!-- 右：四維作風雷達圖 -->
            <div
                class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
                <div class="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3 mb-2">
                    <div>
                        <h2 class="text-lg font-bold text-gray-900 dark:text-white">四維選手畫像 · Performance Radar</h2>
                        <p class="text-xs text-gray-500">攻 / 速 / 防 (滾動近100局) · 運 (近20局)</p>
                    </div>
                </div>

                <div class="h-72 w-full flex items-center justify-center">
                    <ClientOnly>
                        <VChart v-if="radarOption" :option="radarOption" class="w-full h-full" autoresize />
                        <template #fallback>
                            <UIcon name="i-lucide-loader-circle" class="w-8 h-8 animate-spin text-gray-400" />
                        </template>
                    </ClientOnly>
                </div>
            </div>
        </div>

        <!-- 4. 戰術姿態區：和銃三聯分佈圖 (對齊牌譜屋圖 4) -->
        <div v-if="selectedPlayerId"
            class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
            <div class="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
                <div>
                    <h2 class="text-lg font-bold text-gray-900 dark:text-white">和銃分佈體系 · Win & Deal-in Patterns</h2>
                    <p class="text-xs text-gray-500">和牌時狀態 · 放銃時自身姿態 · 放銃至對手姿態</p>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <!-- 和牌時 -->
                <div class="flex flex-col items-center">
                    <span class="text-xs font-bold text-gray-400 mb-2">和牌時</span>
                    <div class="h-60 w-full flex items-center justify-center">
                        <ClientOnly>
                            <VChart v-if="winStyleOption" :option="winStyleOption" class="w-full h-full" autoresize />
                        </ClientOnly>
                    </div>
                </div>

                <!-- 放銃時 (自身狀態) -->
                <div class="flex flex-col items-center">
                    <span class="text-xs font-bold text-gray-400 mb-2">放銃時 (自身狀態)</span>
                    <div class="h-60 w-full flex items-center justify-center">
                        <ClientOnly>
                            <VChart v-if="dealInStyleOption" :option="dealInStyleOption" class="w-full h-full"
                                autoresize />
                        </ClientOnly>
                    </div>
                </div>

                <!-- 放銃至 (對手狀態) -->
                <div class="flex flex-col items-center">
                    <span class="text-xs font-bold text-gray-400 mb-2">放銃至 (對象狀態)</span>
                    <div class="h-60 w-full flex items-center justify-center">
                        <ClientOnly>
                            <VChart v-if="dealInTargetOption" :option="dealInTargetOption" class="w-full h-full"
                                autoresize />
                        </ClientOnly>
                    </div>
                </div>
            </div>
        </div>

        <!-- 5. 宏觀時序走勢區：近30戰順位走勢 (通欄獨佔，舒展呈現) -->
        <div v-if="selectedPlayerId"
            class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
            <div class="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
                <div class="flex items-center gap-3">
                    <h2 class="text-lg font-bold text-gray-900 dark:text-white">近期競技走勢 · Recent Form</h2>
                    <UBadge color="primary" variant="subtle" size="xs">近 30 戰 (Recent 30 Matches)</UBadge>
                </div>
                <div class="text-xs text-gray-500 font-mono">
                    最新場次在右側，1位為波峰，3位為谷底
                </div>
            </div>

            <div class="h-64 w-full flex items-center justify-center">
                <ClientOnly>
                    <VChart v-if="lineOption" :option="lineOption" class="w-full h-full" autoresize />
                    <template #fallback>
                        <UIcon name="i-lucide-loader-circle" class="w-8 h-8 animate-spin text-gray-400" />
                    </template>
                </ClientOnly>
            </div>
        </div>

        <!-- 6. 最常同桌宿敵榜 (對齊牌譜屋圖 7，支援點擊直接切換視角) -->
        <div v-if="selectedPlayerId"
            class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
            <div class="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
                <div class="flex items-center gap-3">
                    <h2 class="text-lg font-bold text-gray-900 dark:text-white">最常同桌宿敵 · Frequent Opponents</h2>
                    <UBadge color="primary" variant="subtle" size="xs">Top 12 遭遇記錄</UBadge>
                </div>
                <div class="text-xs text-gray-500 font-mono">
                    點擊選手可直接切換視角
                </div>
            </div>

            <div v-if="frequentOpponents.length > 0"
                class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3 font-mono">
                <div v-for="opp in frequentOpponents" :key="opp.accountId"
                    class="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 hover:border-primary-500/50 hover:bg-primary-500/5 transition-all group cursor-pointer"
                    @click="inspectOpponent(opp.accountId)">
                    <div class="flex items-center gap-2 min-w-0 pr-2">
                        <UIcon name="i-lucide-menu"
                            class="w-4 h-4 text-primary-500 shrink-0 group-hover:scale-110 transition-transform" />
                        <span
                            class="text-sm font-bold text-success-600 dark:text-success-400 truncate group-hover:underline">
                            {{ opp.nickname }}
                        </span>
                    </div>
                    <div class="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                        <span class="font-bold text-gray-900 dark:text-white">{{ opp.rate }}%</span>
                        <span class="text-[11px] text-gray-400 ml-1">({{ opp.count }})</span>
                    </div>
                </div>
            </div>

            <!-- 空態防禦 -->
            <div v-else class="text-center py-8 text-sm text-gray-400 font-mono">
                當前選定區間內暫無同桌對局記錄
            </div>
        </div>

        <!-- 7. 高光時刻與痛銃名冊 (對齊牌譜屋圖 6) -->
        <div v-if="selectedPlayerId"
            class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm space-y-4">
            <div
                class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
                <div class="flex items-center gap-3">
                    <h2 class="text-lg font-bold text-gray-900 dark:text-white">極限戰局記錄 · Major Hands</h2>
                    <UBadge :color="majorHandMode === 'win' ? 'primary' : 'error'" variant="subtle" size="xs">
                        {{ majorHandMode === 'win' ? '生涯最高打點' : '最近最大痛銃' }}
                    </UBadge>
                </div>

                <!-- 模式切換按鈕組 -->
                <div
                    class="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800/80 p-1 rounded-lg self-start sm:self-auto font-mono text-xs">
                    <button class="px-3 py-1 rounded-md transition-colors font-bold"
                        :class="majorHandMode === 'win' ? 'bg-primary-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'"
                        @click="majorHandMode = 'win'">
                        🏆 生涯最大和牌
                    </button>
                    <button class="px-3 py-1 rounded-md transition-colors font-bold"
                        :class="majorHandMode === 'dealIn' ? 'bg-rose-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'"
                        @click="majorHandMode = 'dealIn'">
                        💥 最近最大痛銃
                    </button>
                </div>
            </div>

            <!-- 牌譜屋風格大牌明細 -->
            <div v-if="currentMajorHand" class="space-y-4">
                <div class="flex items-center justify-between flex-wrap gap-3">
                    <!-- 左側：標題與得失點數 -->
                    <div class="flex items-baseline gap-2">
                        <span class="text-xl font-black font-mono"
                            :class="majorHandMode === 'win' ? 'text-primary-600 dark:text-primary-400' : 'text-rose-500'">
                            {{ currentMajorHand.title }}
                        </span>
                        <span class="text-xs text-gray-400 font-mono">
                            ({{ currentMajorHand.score.toLocaleString() }}點)
                        </span>
                    </div>

                    <!-- ★★★ 右側：對局時間 + 官方牌譜重播直達按鈕 ★★★ -->
                    <div class="flex items-center gap-3 font-mono text-xs">
                        <span class="text-gray-400">{{ currentMajorHand.date }}</span>

                        <UButton v-if="currentMajorHand.paipuId"
                            :to="`https://game.maj-soul.com/1/?paipu=${currentMajorHand.paipuId}`" target="_blank"
                            size="xs" color="secondary" variant="soft" icon="i-lucide-external-link"
                            class="font-mono text-gray-700 dark:text-gray-300 hover:text-primary-500">
                            觀看牌譜
                        </UButton>
                    </div>
                </div>

                <!-- 役種 3 欄式方陣 (對齊牌譜屋排版) -->
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2.5 font-mono text-xs pt-1">
                    <div v-for="(yaku, idx) in currentMajorHand.yakus" :key="idx"
                        class="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800/60">
                        <span class="text-gray-800 dark:text-gray-200 font-medium">{{ yaku.name }}</span>
                        <span class="font-bold" :class="[
                            yaku.isYakuman ? 'text-amber-500 font-black' : (majorHandMode === 'win' ? 'text-primary-500' : 'text-rose-400')
                        ]">
                            {{ yaku.label || `${yaku.han} 番` }}
                        </span>
                    </div>
                </div>
            </div>

            <!-- 空態防禦 -->
            <div v-else class="text-center py-8 text-sm text-gray-400 font-mono">
                當前選定區間內暫無{{ majorHandMode === 'win' ? '和牌' : '放銃' }}記錄
            </div>
        </div>

        <!-- 8. 榮譽與成就 -->
        <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
            <div class="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
                <div>
                    <h2 class="text-lg font-bold text-gray-900 dark:text-white">榮譽與成就 · Achievements</h2>
                    <p class="text-xs text-gray-500">歷史大賽桂冠與特殊賽事頭名記錄</p>
                </div>
                <UBadge color="neutral" variant="solid" size="xs">手動維護</UBadge>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div v-for="(achieve, idx) in achievements" :key="idx"
                    class="flex items-start gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
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