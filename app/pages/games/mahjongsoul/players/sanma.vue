<template>
    <!-- 核心：max-w-6xl mx-auto 死死锁住最大宽度与居中，彻底根除横向撑爆问题 -->
    <div class="max-w-6xl w-full mx-auto px-4 py-8 space-y-8">

        <!-- 1. 顶栏：选手选择与比赛周/日期筛选 -->
        <div
            class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm space-y-6">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">三麻選手數據面板</h1>
                    <p class="text-sm text-gray-500 mt-1">Sanma Player Dashboard & Career Highlights</p>
                </div>

                <!-- 选手选择：对齐 Nuxt UI v3 官方契约 (:items + value-key) -->
                <div class="w-full md:w-64">
                    <USelectMenu v-model="selectedPlayerId" :items="playerItems" value-key="id" placeholder="選擇選手..."
                        class="w-full" />
                </div>
            </div>

            <!-- 2. 时间导航：宏观年份胶囊 + 微观周三比赛日下拉 -->
            <div class="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <span class="text-xs font-bold uppercase tracking-wider text-gray-400">
                        統計時間範圍 (Timeline Scope)
                    </span>
                    <!-- 在時間區間控制的下緣插入此排賽制過濾器 -->
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

                <div class="flex flex-wrap items-center justify-between gap-4">
                    <!-- 1. 常用巨集預設 (Presets: 一鍵覆蓋起止年月) -->
                    <div class="flex flex-wrap items-center gap-1.5 bg-gray-100 dark:bg-gray-800/80 p-1 rounded-lg">
                        <button v-for="preset in presets" :key="preset.id"
                            class="px-2.5 py-1 text-xs rounded-md font-mono transition-colors"
                            :class="activePresetId === preset.id ? 'bg-primary-500 text-white font-bold shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'"
                            @click="applyPreset(preset)">
                            {{ preset.label }}
                        </button>
                    </div>

                    <!-- 2. 精確月份選擇器：支援 2024-06 至 2025-06 等任意跨年操作 -->
                    <div class="flex items-center gap-2 text-xs font-mono">
                        <span class="text-gray-400">自訂月份:</span>
                        <input v-model="dateRange.start" type="month" :min="careerBounds.start" :max="dateRange.end"
                            class="bg-transparent border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:border-primary-500" />
                        <span class="text-gray-400">至</span>
                        <input v-model="dateRange.end" type="month" :min="dateRange.start" :max="careerBounds.end"
                            class="bg-transparent border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:border-primary-500" />
                    </div>
                </div>
            </div>
        </div>

        <!-- 3. 图表区 (顺位占比饼图 + 近20场折线图) -->
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

        <!-- 中層技術指標區 (2x2 佈局下半部：四維雷達圖 + 和牌形態餅圖) -->
        <div v-if="selectedPlayerId" class="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <!-- 1. 四維選手畫像雷達圖 -->
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

            <!-- 2. 和牌形態分佈餅圖 (Riichi vs Dama vs Fulo) -->
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

        <!-- 4. 手动荣誉成就展区 (Placeholder) -->
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

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { use } from 'echarts/core'
import { PieChart, LineChart, RadarChart } from 'echarts/charts'
import { TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'

use([PieChart, LineChart, RadarChart, TooltipComponent, LegendComponent, GridComponent, CanvasRenderer])

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

const excludeInvitational = ref(false)
const excludeGroup = ref(false)

// 1. 真實選手列表載入
const { data: playerItemsData } = await useFetch<PlayerItem[]>('/api/mahjong/players')
const playerItems = computed(() => playerItemsData.value || [])

// 預設選中第一位選手
const selectedPlayerId = ref<number>(playerItems.value[0]?.id || 9577962)
const currentPlayer = computed(() => playerItems.value.find(p => p.id === selectedPlayerId.value))

// 2. 時間範圍狀態
const careerBounds = reactive({
    start: '2023-01',
    end: '2026-12'
})

const dateRange = reactive({
    start: '2023-01',
    end: '2026-12'
})

// ==========================================
// 动态计算近 12 个月 (以当前系统时钟为基准)
// ==========================================
const getRolling12Months = () => {
    const now = new Date()
    const endYear = now.getFullYear()
    const endMonth = now.getMonth() + 1 // 1 ~ 12
    const end = `${endYear}-${String(endMonth).padStart(2, '0')}`

    // 铁律：把 day 固定为 1 号，防止 31 号发生 JS 跨月溢出 Bug
    // 往前推 11 个月：当前月(1) + 过去11个月 = 整整 12 个自然月
    const startDate = new Date(endYear, endMonth - 1 - 11, 1)
    const startYear = startDate.getFullYear()
    const startMonth = startDate.getMonth() + 1
    const start = `${startYear}-${String(startMonth).padStart(2, '0')}`

    return { start, end }
}

// 3. 巨集预设清单：近12个月完全动态求值
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

// 4. 計算當前是否有預設按鈕被激活 (純查詢)
const activePresetId = computed(() => {
    const hit = presets.value.find(p => p.start === dateRange.start && p.end === dateRange.end)
    return hit ? hit.id : 'custom'
})

// 5. 點擊預設時的賦值巨集
const applyPreset = (preset: DatePreset) => {
    dateRange.start = preset.start
    dateRange.end = preset.end
}

// 3. 響應式載入該選手真實戰績
const { data: statsData, pending: loadingStats } = await useFetch(
    () => `/api/mahjong/players/${selectedPlayerId.value}/sanma`,
    {
        query: computed(() => ({
            start: dateRange.start || undefined,
            end: dateRange.end || undefined,
            exclude_invitational: excludeInvitational.value ? 'true' : undefined,
            exclude_group: excludeGroup.value ? 'true' : undefined
        }))
    }
)

// 同步資料庫吐出的真實生涯起止時間
watch(statsData, (newData) => {
    if (newData?.careerBounds) {
        careerBounds.start = newData.careerBounds.start
        careerBounds.end = newData.careerBounds.end
    }
}, { immediate: true })

// 4. 順位餅圖配置
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

// 5. 最近 20 場走勢配置
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

// 6. 四維雷達圖配置
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

// 7. 和牌形態餅圖配置
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

// 8. 靜態成就佔位（保持手動陣列）
const achievements = ref([
    { title: '役滿盃 冠軍', event: '2023 March Mahjong Event', date: '2023-03-28', icon: '🏆' },
    { title: '年度大師賽 季軍', event: '2024 December Finals', date: '2024-12-15', icon: '🥉' },
    { title: '活動周單日四連勝', event: '2025 Event Week', date: '2025-06-12', icon: '🔥' }
])

// 監聽選手切換：立刻將時間維度優雅重置為新選手的「生涯全部」
watch(selectedPlayerId, () => {
    // 1. 先將區間無條件拉滿至最寬鬆邊界，防禦請求競態
    dateRange.start = '2022-01'
    dateRange.end = '2026-12'
})

// ★★★ 核心修復點 1：切換選手時，將 dateRange 清空發出重置訊號 ★★★
watch(selectedPlayerId, () => {
    dateRange.start = ''
    dateRange.end = ''
})

// ★★★ 核心修復點 2：API 資料抵達時，僅在區間為空時才對齊生涯邊界 ★★★
watch(statsData, (newData) => {
    if (!newData?.careerBounds) return

    // 1. 無條件更新該選手的真實物理邊界
    careerBounds.start = newData.careerBounds.start
    careerBounds.end = newData.careerBounds.end

    // 2. 好品味守衛：只有在 dateRange 尚未初始化（首次載入或剛剛切換了選手）時才同步
    //    如果使用者剛剛點擊了 '2024'，dateRange.start 絕對非空，這行代碼會冷酷跳過，絕不踩踏使用者意圖！
    if (!dateRange.start || !dateRange.end) {
        dateRange.start = newData.careerBounds.start
        dateRange.end = newData.careerBounds.end
    }
}, { immediate: true })
</script>