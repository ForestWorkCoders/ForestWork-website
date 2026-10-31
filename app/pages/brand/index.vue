<script setup lang="ts">
import { ref } from 'vue'

// 1. SEO 元数据 (正体中文)
useSeoMeta({
    title: '品牌資源中心 · ForestWork 品牌指南',
    ogTitle: '品牌資源中心 · ForestWork 品牌指南',
    description: '林間小鎮 (ForestWork) 官方品牌指南：涵蓋標誌矩陣、色彩 Token 規範、標準字型與排版系統。',
    ogDescription: '林間小鎮 (ForestWork) 官方品牌指南：涵蓋標誌矩陣、色彩 Token 規範、標準字型與排版系統。'
})

// 2. 剪贴板复制逻辑
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

// 3. 核心数据结构：正体中文 Color Tokens 字典 (未来可直接提取为 i18n JSON)
interface ColorToken {
    name: string
    role: '主色' | '次要色' | '中性色'
    hex: string
    rgb: string
    cmyk: string
    description: string
    bgClass: string
    textLight?: boolean
}

const colors: ColorToken[] = [
    {
        name: '森林墨綠 (Forest Emerald)',
        role: '主色',
        hex: '#4C7766',
        rgb: '76, 119, 102',
        cmyk: '64/29/54/10',
        description: '信任 · 自然 · 沉穩。錨定 ForestWork 社群的公信力、自然平衡与電競氛圍。',
        bgClass: 'bg-[#4C7766]',
        textLight: true
    },
    {
        name: '琥珀金 (Amber Gold)',
        role: '次要色',
        hex: '#D97706',
        rgb: '217, 119, 6',
        cmyk: '14/60/100/2',
        description: '能量 · 成就 · 亮點。用於賽事冠軍榜、實況直播高亮与核心操作按鈕。',
        bgClass: 'bg-[#D97706]',
        textLight: true
    },
    {
        name: '雪白 (Crisp White)',
        role: '中性色',
        hex: '#FFFFFF',
        rgb: '255, 255, 255',
        cmyk: '0/0/0/0',
        description: '提供淺色主題下的空間感、高對比度与清爽的版面邊界。',
        bgClass: 'bg-white border border-gray-200 dark:border-zinc-700'
    },
    {
        name: '冷灰 (Cool Grey)',
        role: '中性色',
        hex: '#D2D6DC',
        rgb: '210, 214, 220',
        cmyk: '14/10/8/0',
        description: '結構元素、停用控制項、邊框線條与次要元數據文字。',
        bgClass: 'bg-[#D2D6DC]'
    },
    {
        name: '炭黑 (Charcoal Black)',
        role: '中性色',
        hex: '#231F20',
        rgb: '35, 31, 32',
        cmyk: '70/67/64/74',
        description: '建立深色模式基底、高對比容器卡片与厚重的字型排版。',
        bgClass: 'bg-[#231F20]',
        textLight: true
    }
]
</script>

<template>
    <div
        class="min-h-screen bg-white dark:bg-[#090A0F] text-gray-900 dark:text-gray-100 transition-colors duration-300">
        <UContainer class="py-12 md:py-16 space-y-20 max-w-6xl">

            <!-- 页头 Header -->
            <header
                class="border-b border-gray-200 dark:border-zinc-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <span class="text-xs font-mono font-bold uppercase tracking-widest text-[#D97706]">
                        BRAND GUIDANCE & ASSETS
                    </span>
                    <h1 class="text-4xl sm:text-5xl font-black tracking-tight mt-1 text-gray-900 dark:text-white">
                        品牌資源中心
                    </h1>
                    <p class="text-gray-500 dark:text-gray-400 mt-2 max-w-2xl text-base">
                        林間小鎮 (ForestWork) 官方品牌指南：包含標誌矩陣、色彩規範、標準字型与排版系統，供社群成員、賽事主辦方及合作夥伴使用。
                    </p>
                </div>

                <div class="flex items-center gap-3">
                    <UButton to="/brand/forestwork-brand-assets.zip" external download color="primary" size="lg"
                        icon="i-lucide-download" class="font-bold shadow-lg">
                        下載品牌資產包 (.ZIP)
                    </UButton>
                </div>
            </header>

            <!-- Section 1: Color Palette (色彩系统) -->
            <section class="space-y-8">
                <div>
                    <span class="text-xs font-mono font-bold uppercase tracking-widest text-[#D97706]">PALETTE</span>
                    <h2 class="text-3xl font-black text-gray-900 dark:text-white mt-1">主色調與中性色</h2>
                </div>

                <!-- 2 列：主色 & 次要色 -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div v-for="color in colors.filter(c => c.role !== '中性色')" :key="color.hex"
                        @click="copyToClipboard(color.hex)"
                        class="group cursor-pointer bg-gray-50 dark:bg-[#12141A] border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden hover:border-[#4C7766] transition-all duration-200 shadow-sm">
                        <!-- 色块头部 -->
                        <div :class="[color.bgClass, 'h-40 w-full relative p-4 flex items-end justify-end']">
                            <span
                                class="text-xs font-mono px-2 py-1 rounded bg-black/40 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                {{ copiedHex === color.hex ? '已複製！' : '點擊複製色號' }}
                            </span>
                        </div>
                        <!-- 色彩元数据 -->
                        <div class="p-6 space-y-3">
                            <div class="flex items-center justify-between">
                                <h3 class="text-xl font-bold text-gray-900 dark:text-white">
                                    {{ color.name }} — <span class="text-sm font-normal text-gray-500">{{ color.role
                                        }}</span>
                                </h3>
                            </div>
                            <p class="text-xs font-mono text-gray-500 dark:text-gray-400">
                                HEX <span class="text-gray-900 dark:text-gray-200 font-bold">{{ color.hex }}</span>
                                &nbsp;·&nbsp;
                                RGB {{ color.rgb }} &nbsp;·&nbsp;
                                CMYK {{ color.cmyk }}
                            </p>
                            <p class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                                {{ color.description }}
                            </p>
                        </div>
                    </div>
                </div>

                <!-- 3 列：中性色 Neutrals -->
                <div>
                    <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-4">中性色 (Neutrals)</h3>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div v-for="color in colors.filter(c => c.role === '中性色')" :key="color.hex"
                            @click="copyToClipboard(color.hex)"
                            class="group cursor-pointer bg-gray-50 dark:bg-[#12141A] border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden hover:border-[#4C7766] transition-all duration-200 shadow-sm">
                            <div :class="[color.bgClass, 'h-28 w-full relative p-3 flex items-end justify-end']">
                                <span
                                    class="text-xs font-mono px-2 py-0.5 rounded bg-black/40 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                    {{ copiedHex === color.hex ? '已複製！' : '複製' }}
                                </span>
                            </div>
                            <div class="p-5 space-y-2">
                                <h4 class="font-bold text-gray-900 dark:text-white">{{ color.name }}</h4>
                                <p class="text-xs font-mono text-gray-500 dark:text-gray-400">
                                    HEX <span class="text-gray-900 dark:text-gray-200 font-bold">{{ color.hex }}</span>
                                </p>
                                <p class="text-xs text-gray-500 dark:text-gray-400">
                                    CMYK {{ color.cmyk }}
                                </p>
                            </div>
                        </div>
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-4">
                        中性色代表極簡、結構与專注——為電競介面提供清晰的視差層級与易讀的介面環境。
                    </p>
                </div>
            </section>

            <UDivider />

            <!-- Section 2: Logo Guidelines (标志矩阵) -->
            <section class="space-y-10">
                <div>
                    <span class="text-xs font-mono font-bold uppercase tracking-widest text-[#D97706]">PRIMARY
                        LOCKUP</span>
                    <h2 class="text-3xl font-black text-gray-900 dark:text-white mt-1">Logo 規範與應用場景</h2>
                </div>

                <!-- 尺寸与安全边距 Clearspace -->
                <div class="space-y-4">
                    <h3 class="text-lg font-bold text-gray-900 dark:text-white">留白與最小尺寸規範</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400 max-w-3xl">
                        標誌四周須保持至少 <code class="font-bold text-[#4C7766]">0.25x</code> 的安全留白，其中 <code
                            class="font-bold text-[#4C7766]">x</code> 為標誌圖案的物理高度。任何文字或圖像元素均不得侵入此區域。
                    </p>

                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                        <div
                            class="bg-gray-50 dark:bg-[#12141A] border border-gray-200 dark:border-zinc-800 p-5 rounded-xl space-y-1">
                            <div class="text-xs font-mono font-bold text-gray-400 uppercase">橫向組合 (Horizontal Lockup)
                            </div>
                            <div class="text-xs text-gray-600 dark:text-gray-300">數位顯示最小高度：45px</div>
                        </div>
                        <div
                            class="bg-gray-50 dark:bg-[#12141A] border border-gray-200 dark:border-zinc-800 p-5 rounded-xl space-y-1">
                            <div class="text-xs font-mono font-bold text-gray-400 uppercase">直向組合 (Vertical Lockup)
                            </div>
                            <div class="text-xs text-gray-600 dark:text-gray-300">數位顯示最小高度：75px</div>
                        </div>
                        <div
                            class="bg-gray-50 dark:bg-[#12141A] border border-gray-200 dark:border-zinc-800 p-5 rounded-xl space-y-1">
                            <div class="text-xs font-mono font-bold text-gray-400 uppercase">純圖案 (Symbol Only)</div>
                            <div class="text-xs text-gray-600 dark:text-gray-300">數位顯示最小高度：24px</div>
                        </div>
                    </div>
                </div>

                <!-- 背景渲染矩阵 (Colour Usage on Backgrounds) -->
                <div class="space-y-4">
                    <h3 class="text-lg font-bold text-gray-900 dark:text-white">不同背景下的標誌呈現</h3>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <!-- 1. On Black -->
                        <div class="space-y-2">
                            <div
                                class="bg-[#231F20] h-48 rounded-2xl flex items-center justify-center p-8 border border-zinc-800 shadow-inner">
                                <img src="/brand/svg/logo-light.svg" alt="ForestWork 白色標誌"
                                    class="h-24 w-auto object-contain" />
                            </div>
                            <div class="text-xs font-mono text-center text-gray-500">炭黑背景 (Charcoal Black) — 白色標誌</div>
                        </div>

                        <!-- 2. On Forest Emerald -->
                        <div class="space-y-2">
                            <div
                                class="bg-[#4C7766] h-48 rounded-2xl flex items-center justify-center p-8 shadow-inner">
                                <img src="/brand/svg/logo-light.svg" alt="ForestWork 白色標誌"
                                    class="h-24 w-auto object-contain" />
                            </div>
                            <div class="text-xs font-mono text-center text-gray-500">森林墨綠背景 (Forest Emerald) — 白色標誌
                            </div>
                        </div>

                        <!-- 3. On White -->
                        <div class="space-y-2">
                            <div
                                class="bg-white border border-gray-200 h-48 rounded-2xl flex items-center justify-center p-8 shadow-inner">
                                <img src="/brand/svg/logo-dark.svg" alt="ForestWork 黑色標誌"
                                    class="h-24 w-auto object-contain" />
                            </div>
                            <div class="text-xs font-mono text-center text-gray-500">純白 / 淺灰背景 — 黑色標誌</div>
                        </div>
                    </div>
                </div>

                <!-- 警示框 Warning Callout Box -->
                <div
                    class="bg-amber-50 dark:bg-amber-950/30 border-l-4 border-[#D97706] p-4 rounded-r-xl text-sm text-amber-900 dark:text-amber-200">
                    <span class="font-bold">僅限使用品牌庫中核準的標誌檔案。</span> 切勿重繪、改色、拉伸、旋轉、加邊框、添加陰影，或將標誌放置於低對比度的複雜背景圖上。
                </div>
            </section>

            <UDivider />

            <!-- Section 3: Typography Guidelines (字体系统) -->
            <section class="space-y-8">
                <div>
                    <span class="text-xs font-mono font-bold uppercase tracking-widest text-[#D97706]">TYPEFACE</span>
                    <h2 class="text-3xl font-black text-gray-900 dark:text-white mt-1">Open Sans 與 JetBrains Mono</h2>
                    <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        <strong>標題與正文：</strong> Open Sans（免費且在各種尺寸下皆具極佳易讀性）。
                        <strong>數據與程式碼：</strong> JetBrains Mono（適用於賽事比分、戰報數據与電競標語）。
                    </p>
                </div>

                <!-- Typography Demo Slate Box -->
                <div
                    class="bg-[#090D16] text-white p-8 sm:p-12 rounded-3xl space-y-6 border border-zinc-800 shadow-2xl">
                    <div class="space-y-2">
                        <div class="text-xs font-mono text-[#D97706] font-bold tracking-widest uppercase">XL 標題 (XL
                            HEADLINE)</div>
                        <h1 class="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
                            林間小鎮電競賽事平台
                        </h1>
                    </div>

                    <div class="space-y-1">
                        <div class="text-xs font-mono text-emerald-400 font-bold tracking-widest uppercase">主標題
                            (HEADLINE)</div>
                        <h2 class="text-2xl sm:text-3xl font-bold text-gray-100">
                            社群賽事歷史與活動中心
                        </h2>
                    </div>

                    <div class="space-y-1">
                        <div class="text-xs font-mono text-gray-400 font-bold tracking-widest uppercase">副標題 (SUBHEAD)
                        </div>
                        <h3 class="text-lg font-semibold text-gray-300">
                            副標題用於承載排行榜与賽事歸檔的結構脈絡。
                        </h3>
                    </div>

                    <div class="pt-4 border-t border-zinc-800 space-y-2">
                        <div class="text-xs font-mono text-gray-400 font-bold tracking-widest uppercase">正文段落 (BODY
                            COPY)</div>
                        <p class="text-sm sm:text-base text-gray-300 leading-relaxed max-w-3xl">
                            正文採用 Open Sans Regular 渲染。建議每行字數保持在 30–45 個中文字（或 60–75 個英文字符）以獲得最佳閱讀體驗。賽事數據与排行榜使用等寬字型
                            stacks，確保在自適應視口下數字對齊。
                        </p>
                    </div>
                </div>

                <!-- 规则与间距 Grid -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div
                        class="bg-gray-50 dark:bg-[#12141A] border border-gray-200 dark:border-zinc-800 p-6 rounded-2xl space-y-2">
                        <h4 class="font-bold text-gray-900 dark:text-white">最小字號規範</h4>
                        <p class="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                            印刷物料最小使用 10pt，數位螢幕最小使用 14px，絕不低於平台的清晰度底線。不確定時請適度放大。
                        </p>
                    </div>
                    <div
                        class="bg-gray-50 dark:bg-[#12141A] border border-gray-200 dark:border-zinc-800 p-6 rounded-2xl space-y-2">
                        <h4 class="font-bold text-gray-900 dark:text-white">間距比例規範</h4>
                        <p class="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                            標題与正文最小間距比為 1:1——20pt 標題下方至少保留 20pt 間距。標題与正文間使用 2× 間距，段落之間使用 1.5× 間距。
                        </p>
                    </div>
                </div>

                <!-- 核心法则金句 Callout -->
                <div
                    class="bg-amber-50 dark:bg-amber-950/30 border-l-4 border-[#D97706] p-4 rounded-r-xl text-sm text-amber-900 dark:text-amber-200">
                    <span class="font-bold">階梯即訊息（Hierarchy is the message）。</span> 如果一個版面需要超過 3 種字號，說明內容結構本身需要重組。
                </div>
            </section>

        </UContainer>
    </div>
</template>