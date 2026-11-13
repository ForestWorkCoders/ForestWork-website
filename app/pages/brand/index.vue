<script setup lang="ts">
import { ref } from 'vue'

useSeoMeta({
    title: '品牌資源中心 · ForestWork 品牌指南',
    ogTitle: '品牌資源中心 · ForestWork 品牌指南',
    description: '林間小鎮 (ForestWork) 官方品牌指南：涵蓋標誌矩陣、色彩 Token 規範、標準字型與排版系統。',
    ogDescription: '林間小鎮 (ForestWork) 官方品牌指南：涵蓋標誌矩陣、色彩 Token 規範、標準字型與排版系統。'
})

const copiedHex = ref<string | null>(null)

async function copyToClipboard(hex: string) {
    try {
        await navigator.clipboard.writeText(hex)
        copiedHex.value = hex
        setTimeout(() => {
            copiedHex.value = null
        }, 2000)
    } catch (err) {
        console.error('複製色號失敗:', err)
    }
}

interface ColorToken {
    name: string
    role: '主色' | '次要色' | '中性色'
    hex: string
    rgb: string
    cmyk: string
    description: string
    bgClass: string
}

const colors: ColorToken[] = [
    {
        name: '森林墨綠 (Forest Emerald)',
        role: '主色',
        hex: '#4C7766',
        rgb: '76, 119, 102',
        cmyk: '64/29/54/10',
        description: '信任 · 自然 · 沉穩。用於主要按鈕、連結與焦點框，錨定 ForestWork 社群的公信力與電競氛圍。',
        bgClass: 'bg-[#4C7766]'
    },
    {
        name: '琥珀金 (Amber Gold)',
        role: '次要色',
        hex: '#D97706',
        rgb: '217, 119, 6',
        cmyk: '14/60/100/2',
        description: '能量 · 成就 · 亮點。用於賽事冠軍、直播中標示與區塊小標。',
        bgClass: 'bg-[#D97706]'
    },
    {
        name: '雪白 (Crisp White)',
        role: '中性色',
        hex: '#FFFFFF',
        rgb: '255, 255, 255',
        cmyk: '0/0/0/0',
        description: '淺色模式的卡片底色、白色背景標誌與印刷用白。',
        bgClass: 'bg-white border-b border-slate-200 dark:border-[#30363D]'
    },
    {
        name: '霧白 (Mist White)',
        role: '中性色',
        hex: '#F7F9FC',
        rgb: '247, 249, 252',
        cmyk: '2/1/0/1',
        description: '淺色模式的頁面底色，比純白柔和，減少長時間閱讀的刺眼感。',
        bgClass: 'bg-[#F7F9FC] border-b border-slate-200 dark:border-[#30363D]'
    },
    {
        name: '冷灰 (Cool Grey)',
        role: '中性色',
        hex: '#C9D1D9',
        rgb: '201, 209, 217',
        cmyk: '7/4/0/15',
        description: '邊框、停用控制項，以及深色模式的正文文字。',
        bgClass: 'bg-[#C9D1D9]'
    },
    {
        name: '炭黑 (Charcoal Black)',
        role: '中性色',
        hex: '#231F20',
        rgb: '35, 31, 32',
        cmyk: '70/67/64/74',
        description: '白色標誌的背景色與印刷用黑色，不作為頁面底色。',
        bgClass: 'bg-[#231F20]'
    },
    {
        name: '墨黑 (Ink Black)',
        role: '中性色',
        hex: '#0D1117',
        rgb: '13, 17, 23',
        cmyk: '43/26/0/91',
        description: '深色模式的頁面底色。卡片用 #161B22，邊框用 #30363D。',
        bgClass: 'bg-[#0D1117]'
    }
]

const sizeRules = [
    { size: '14px 以上', use: '正文與段落 (text-sm 起)' },
    { size: '12px', use: '標籤、表格、次要資訊與徽章 (text-xs)' },
    { size: '12px 以下', use: '一律不用。印刷物料最小 10pt' }
]

const spacingRules = [
    { rule: '標題下方', value: '間距至少等於標題字級，例如 text-2xl (24px) → mt-6' },
    { rule: '段落之間', value: '行距的 1.5 倍 (text-sm 用 space-y-3 至 space-y-4)' },
    { rule: '區塊之間', value: '同一頁面保持同一節奏 (space-y-16 至 space-y-20)' },
    { rule: '行寬', value: '段落用 max-w-prose，每行約 30–45 個中文字，不要撐滿容器寬度' },
    { rule: '對齊', value: '中文段落左右對齊 (text-justify)，窄卡片除外；多項規則分列為清單，不擠在同一段' }
]
</script>

<template>
    <div class="min-h-screen bg-[#F7F9FC] dark:bg-[#0D1117] text-slate-900 dark:text-slate-100 transition-colors duration-300">
        <UContainer class="py-12 md:py-16 space-y-20 max-w-6xl">

            <!-- Page header -->
            <header
                class="border-b border-slate-200 dark:border-[#30363D] pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <span class="text-xs font-mono font-bold uppercase tracking-widest text-secondary">
                        BRAND GUIDANCE & ASSETS
                    </span>
                    <h1 class="text-4xl font-extrabold tracking-tight mt-1 text-slate-900 dark:text-white">
                        品牌資源中心
                    </h1>
                    <p class="text-slate-500 dark:text-slate-400 mt-9 max-w-prose text-base text-justify">
                        林間小鎮 (ForestWork) 官方品牌指南：包含標誌、色彩、字型、間距與用語規範，供社群成員、賽事主辦方及合作夥伴使用。
                    </p>
                </div>

                <div class="flex items-center gap-3">
                    <UButton to="/brand/forestwork-brand-assets.zip" external download color="primary" size="lg"
                        icon="i-lucide-download" class="font-bold shadow-lg">
                        下載品牌資產包 (.ZIP)
                    </UButton>
                </div>
            </header>

            <!-- 1. Colour -->
            <section class="space-y-8">
                <div>
                    <span class="text-xs font-mono font-bold uppercase tracking-widest text-secondary">PALETTE</span>
                    <h2 class="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">主色調與中性色</h2>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div v-for="color in colors.filter(c => c.role !== '中性色')" :key="color.hex"
                        @click="copyToClipboard(color.hex)"
                        class="group cursor-pointer bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D] rounded-2xl overflow-hidden hover:border-[#4C7766] transition-all duration-200 shadow-sm">
                        <div :class="[color.bgClass, 'h-40 w-full relative p-4 flex items-end justify-end']">
                            <span
                                class="text-xs font-mono px-2 py-1 rounded bg-black/40 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                {{ copiedHex === color.hex ? '已複製！' : '點擊複製色號' }}
                            </span>
                        </div>
                        <div class="p-6">
                            <h3 class="text-xl font-bold text-slate-900 dark:text-white">
                                {{ color.name }} · {{ color.role }}
                            </h3>
                            <p class="text-xs font-mono text-slate-500 dark:text-slate-400 mt-5">
                                HEX <span class="text-slate-900 dark:text-slate-200 font-bold">{{ color.hex }}</span>
                                &nbsp;·&nbsp; RGB {{ color.rgb }} &nbsp;·&nbsp; CMYK {{ color.cmyk }}
                            </p>
                            <p class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-3 text-justify">
                                {{ color.description }}
                            </p>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 class="text-xl font-bold text-slate-900 dark:text-white">中性色 (Neutrals)</h3>
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mt-5">
                        <div v-for="color in colors.filter(c => c.role === '中性色')" :key="color.hex"
                            @click="copyToClipboard(color.hex)"
                            class="group cursor-pointer bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D] rounded-2xl overflow-hidden hover:border-[#4C7766] transition-all duration-200 shadow-sm">
                            <div :class="[color.bgClass, 'h-28 w-full relative p-3 flex items-end justify-end']">
                                <span
                                    class="text-xs font-mono px-2 py-0.5 rounded bg-black/40 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                    {{ copiedHex === color.hex ? '已複製！' : '複製' }}
                                </span>
                            </div>
                            <div class="p-5">
                                <h4 class="text-base font-bold text-slate-900 dark:text-white">{{ color.name }}</h4>
                                <p class="text-xs font-mono text-slate-500 dark:text-slate-400 mt-4">
                                    HEX <span class="text-slate-900 dark:text-slate-200 font-bold">{{ color.hex }}</span>
                                    · CMYK {{ color.cmyk }}
                                </p>
                                <p class="text-sm text-slate-600 dark:text-slate-300 mt-2">
                                    {{ color.description }}
                                </p>
                            </div>
                        </div>
                    </div>
                    <ul class="space-y-3 text-sm text-slate-500 dark:text-slate-400 mt-4 max-w-prose text-justify list-disc pl-5">
                        <li>淺色模式：頁面用霧白，卡片用雪白。</li>
                        <li>深色模式：頁面用墨黑，卡片用 #161B22。</li>
                        <li>灰階使用冷色調 (Tailwind slate)，與墨黑一致。</li>
                        <li>狀態色不屬於品牌色：上升與正分用 success（綠），下降、負分與錯誤用 error（紅），其他狀態可用藍、紫；決賽獎牌保留金、銀、銅。</li>
                        <li>各遊戲頁面可保留自己的強調色，其餘規範（字型、字級、標誌、用語與深色底色）照常適用。</li>
                    </ul>
                </div>
            </section>

            <USeparator />

            <!-- 2. Logo -->
            <section class="space-y-10">
                <div>
                    <span class="text-xs font-mono font-bold uppercase tracking-widest text-secondary">PRIMARY
                        LOCKUP</span>
                    <h2 class="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">Logo 規範與應用場景</h2>
                </div>

                <div>
                    <h3 class="text-lg font-bold text-slate-900 dark:text-white">留白與最小尺寸規範</h3>
                    <p class="text-sm text-slate-600 dark:text-slate-400 max-w-prose mt-5 text-justify">
                        標誌四周須保持至少 <code class="font-bold text-[#4C7766]">0.25x</code> 的安全留白，其中 <code
                            class="font-bold text-[#4C7766]">x</code> 為標誌圖案的高度。任何文字或圖像元素均不得侵入此區域。頁首使用時，圖案標 20px (h-5)，與右側圖示同高；字標 14px (h-3.5)。組合標誌內的英文字標依原稿比例縮放（約為中文字標高度的 0.3 倍），不受 14px 字標下限限制。
                    </p>

                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">

                        <!-- Horizontal lockup EN -->
                        <div
                            class="bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D] p-5 rounded-xl space-y-4 flex flex-col justify-between">
                            <div
                                class="h-32 bg-[#F7F9FC] dark:bg-[#0D1117] rounded-lg border border-slate-200/60 dark:border-[#30363D]/80 flex items-center justify-center p-4 shadow-sm overflow-hidden">
                                <div class="flex items-center justify-center gap-2.5 max-w-full">
                                    <UColorModeImage light="/brand/svg/logo-black.svg" dark="/brand/svg/logo-white.svg"
                                        alt="Emblem" class="h-11.25 w-auto shrink-0" />
                                    <UColorModeImage light="/brand/svg/text-en-black.svg"
                                        dark="/brand/svg/text-en-white.svg" alt="Forest Work"
                                        class="h-4 w-auto max-w-[65%] object-contain" />
                                </div>
                            </div>
                            <div class="space-y-1">
                                <div class="text-xs font-mono font-bold text-slate-500 uppercase">橫向組合 - 英文 (Horizontal
                                    Lockup EN)</div>
                                <div class="text-xs text-slate-600 dark:text-slate-300">數位顯示最小高度：45px</div>
                            </div>
                        </div>

                        <!-- Horizontal lockup ZH -->
                        <div
                            class="bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D] p-5 rounded-xl space-y-4 flex flex-col justify-between">
                            <div
                                class="h-32 bg-[#F7F9FC] dark:bg-[#0D1117] rounded-lg border border-slate-200/60 dark:border-[#30363D]/80 flex items-center justify-center p-4 shadow-sm overflow-hidden">
                                <div class="flex items-center justify-center gap-2.5 max-w-full">
                                    <UColorModeImage light="/brand/svg/logo-black.svg" dark="/brand/svg/logo-white.svg"
                                        alt="Emblem" class="h-11.25 w-auto shrink-0" />
                                    <UColorModeImage light="/brand/svg/text-zh-black.svg"
                                        dark="/brand/svg/text-zh-white.svg" alt="林間小鎮"
                                        class="h-6 w-auto max-w-[65%] object-contain" />
                                </div>
                            </div>
                            <div class="space-y-1">
                                <div class="text-xs font-mono font-bold text-slate-500 uppercase">橫向組合 - 中文 (Horizontal
                                    Lockup ZH)</div>
                                <div class="text-xs text-slate-600 dark:text-slate-300">數位顯示最小高度：45px</div>
                            </div>
                        </div>

                        <!-- Vertical lockup at the master proportion: ZH ≈ 0.26 × emblem height, EN ≈ 0.3 × ZH height -->
                        <div
                            class="bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D] p-5 rounded-xl space-y-4 flex flex-col justify-between">
                            <div
                                class="h-32 bg-[#F7F9FC] dark:bg-[#0D1117] rounded-lg border border-slate-200/60 dark:border-[#30363D]/80 flex items-center justify-center p-4 shadow-sm overflow-hidden">
                                <div class="flex flex-col items-center justify-center max-w-full">
                                    <UColorModeImage light="/brand/svg/logo-black.svg" dark="/brand/svg/logo-white.svg"
                                        alt="ForestWork Emblem" class="h-14 w-auto shrink-0" />
                                    <UColorModeImage light="/brand/svg/text-zh-black.svg"
                                        dark="/brand/svg/text-zh-white.svg" alt="林間小鎮"
                                        class="h-[15px] mt-2 w-auto max-w-full object-contain" />
                                    <UColorModeImage light="/brand/svg/text-en-black.svg"
                                        dark="/brand/svg/text-en-white.svg" alt="Forest Work"
                                        class="h-[4.5px] mt-0.5 w-auto max-w-full object-contain" />
                                </div>
                            </div>
                            <div class="space-y-1">
                                <div class="text-xs font-mono font-bold text-slate-500 uppercase">直向組合 (Vertical Lockup)
                                </div>
                                <div class="text-xs text-slate-600 dark:text-slate-300">數位顯示最小高度：75px</div>
                            </div>
                        </div>

                        <!-- Emblem only -->
                        <div
                            class="bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D] p-5 rounded-xl space-y-4 flex flex-col justify-between">
                            <div
                                class="h-32 bg-[#F7F9FC] dark:bg-[#0D1117] rounded-lg border border-slate-200/60 dark:border-[#30363D]/80 flex items-center justify-center p-4 shadow-sm">
                                <UColorModeImage light="/brand/svg/logo-black.svg" dark="/brand/svg/logo-white.svg"
                                    alt="ForestWork Symbol Only" class="h-10 w-auto" />
                            </div>
                            <div class="space-y-1">
                                <div class="text-xs font-mono font-bold text-slate-500 uppercase">純圖案 (Symbol Only)</div>
                                <div class="text-xs text-slate-600 dark:text-slate-300">數位顯示最小高度：24px</div>
                            </div>
                        </div>

                    </div>
                </div>

                <div>
                    <h3 class="text-lg font-bold text-slate-900 dark:text-white">不同背景下的標誌呈現</h3>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-5">
                        <div class="space-y-2">
                            <div
                                class="bg-[#231F20] h-48 rounded-2xl flex items-center justify-center p-8 border border-[#30363D] shadow-inner">
                                <img src="/brand/svg/logo-white.svg" alt="ForestWork 白色標誌"
                                    class="h-24 w-auto object-contain" />
                            </div>
                            <div class="text-xs font-mono text-center text-slate-500">炭黑背景 (Charcoal Black) — 白色標誌</div>
                        </div>

                        <div class="space-y-2">
                            <div class="bg-[#4C7766] h-48 rounded-2xl flex items-center justify-center p-8 shadow-inner">
                                <img src="/brand/svg/logo-white.svg" alt="ForestWork 白色標誌"
                                    class="h-24 w-auto object-contain" />
                            </div>
                            <div class="text-xs font-mono text-center text-slate-500">森林墨綠背景 (Forest Emerald) — 白色標誌
                            </div>
                        </div>

                        <div class="space-y-2">
                            <div
                                class="bg-white border border-slate-200 h-48 rounded-2xl flex items-center justify-center p-8 shadow-inner">
                                <img src="/brand/svg/logo-black.svg" alt="ForestWork 黑色標誌"
                                    class="h-24 w-auto object-contain" />
                            </div>
                            <div class="text-xs font-mono text-center text-slate-500">純白 / 淺灰背景 — 黑色標誌</div>
                        </div>
                    </div>
                </div>

                <div
                    class="bg-secondary/10 border-l-4 border-secondary p-4 rounded-r-xl text-sm text-slate-800 dark:text-slate-200">
                    <span class="font-bold">僅限使用品牌庫中核准的標誌檔案。</span> 切勿重繪、改色、拉伸、旋轉、加邊框、添加陰影、更改 viewBox，或將標誌放置於低對比度的複雜背景圖上。
                </div>
            </section>

            <USeparator />

            <!-- 3. Typeface, size and spacing -->
            <section class="space-y-8">
                <div>
                    <span class="text-xs font-mono font-bold uppercase tracking-widest text-secondary">TYPEFACE</span>
                    <h2 class="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">Open Sans 與 JetBrains Mono</h2>
                </div>
                <div class="space-y-3 text-sm text-slate-600 dark:text-slate-400 max-w-prose text-justify">
                    <p><strong>標題與正文：</strong>Open Sans，中文則使用系統的繁體中文字型 (PingFang TC、Microsoft JhengHei 或 Noto Sans TC)。</p>
                    <p><strong>數據與程式碼：</strong>JetBrains Mono，適用於賽事比分、統計數據、代碼與區塊小標。Open Sans 最粗為 800 (ExtraBold)，請勿使用 900。</p>
                </div>

                <!-- Type specimen (shows several sizes on purpose) -->
                <div class="bg-[#0D1117] text-white p-8 sm:p-12 rounded-3xl space-y-16 border border-[#30363D] shadow-2xl">
                    <div>
                        <div class="text-xs font-mono text-secondary font-bold tracking-widest uppercase">XL 標題 (XL HEADLINE)</div>
                        <h1 class="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight mt-2">
                            林間小鎮電競賽事平台
                        </h1>
                    </div>

                    <div>
                        <div class="text-xs font-mono text-slate-400 font-bold tracking-widest uppercase">主標題 (HEADLINE)</div>
                        <h2 class="text-2xl sm:text-3xl font-bold text-slate-100 mt-2">
                            社群賽事歷史與活動中心
                        </h2>
                    </div>

                    <div>
                        <div class="text-xs font-mono text-slate-400 font-bold tracking-widest uppercase">副標題 (SUBHEAD)</div>
                        <h3 class="text-lg font-semibold text-slate-300 mt-2">
                            副標題用於承載排行榜與賽事歸檔的結構脈絡。
                        </h3>
                    </div>

                    <div class="pt-4 border-t border-[#30363D]">
                        <div class="text-xs font-mono text-slate-400 font-bold tracking-widest uppercase">正文段落 (BODY COPY)</div>
                        <p class="text-sm sm:text-base text-slate-300 leading-relaxed max-w-prose mt-2 text-justify">
                            正文使用 Open Sans Regular。建議每行保持在 30–45 個中文字（或 60–75 個英文字元）以獲得最佳閱讀體驗。賽事數據與排行榜使用等寬字型，確保數字在不同螢幕寬度下對齊。
                        </p>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div
                        class="bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D] p-6 rounded-2xl">
                        <h4 class="text-base font-bold text-slate-900 dark:text-white">字級規範</h4>
                        <ul class="space-y-2 mt-4">
                            <li v-for="r in sizeRules" :key="r.size" class="text-sm text-slate-600 dark:text-slate-300">
                                <span class="font-mono font-bold text-slate-900 dark:text-slate-100">{{ r.size }}</span>：{{ r.use }}
                            </li>
                        </ul>
                    </div>
                    <div
                        class="bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D] p-6 rounded-2xl">
                        <h4 class="text-base font-bold text-slate-900 dark:text-white">間距規範</h4>
                        <ul class="space-y-2 mt-4">
                            <li v-for="r in spacingRules" :key="r.rule" class="text-sm text-slate-600 dark:text-slate-300">
                                <span class="font-bold text-slate-900 dark:text-slate-100">{{ r.rule }}</span>：{{ r.value }}
                            </li>
                        </ul>
                    </div>
                </div>

                <div
                    class="bg-secondary/10 border-l-4 border-secondary p-4 rounded-r-xl text-sm text-slate-800 dark:text-slate-200">
                    <span class="font-bold">階梯即訊息（Hierarchy is the message）。</span> 同一張卡片或同一區塊最多使用 3 種字級（含標題）；需要更多時，代表內容結構需要重組。唯一例外是字級樣本（例如上方的標題示範），它的用途就是展示字級階梯。
                </div>
            </section>

            <USeparator />

            <!-- 4. Language -->
            <section class="space-y-8">
                <div>
                    <span class="text-xs font-mono font-bold uppercase tracking-widest text-secondary">LANGUAGE</span>
                    <h2 class="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">用語規範</h2>
                </div>
                <ul class="space-y-3 text-sm text-slate-600 dark:text-slate-300 max-w-prose text-justify list-disc pl-5">
                    <li>全站使用<strong>繁體中文（台灣用語）</strong>，包含頁面標題與分享描述。</li>
                    <li>同一項數據在各頁面使用同一個名稱：<strong>默聽率</strong>、<strong>流局聽牌率</strong>、<strong>平均和牌巡數</strong>。</li>
                    <li>中英雙語標籤（例如「玩家數據 · Player Stats」）可以使用。</li>
                </ul>
            </section>

        </UContainer>
    </div>
</template>
