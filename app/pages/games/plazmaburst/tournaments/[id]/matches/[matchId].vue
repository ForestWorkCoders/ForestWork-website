<script setup>
import { ref, computed } from 'vue'

const route = useRoute()
const tournamentId = route.params.id
const matchId = route.params.matchId

// 調用我們剛剛寫好的極致 API
const { data: match, pending, error } = await useFetch(`/api/plazmaburst/tournaments/${tournamentId}/matches/${matchId}`)

// 狀態管理：目前選中的 Tab ('all' 或具體的 gameNumber)
// 預設為第一局 (gameNumber: 1)，如果沒有則回退到 'all'
const activeTab = ref('all')

const displayData = computed(() => {
  if (!match.value) return null

  // 模式 A：總覽模式 (All Maps) - 啟動記憶體聚合引擎
  if (activeTab.value === 'all') {
    
    // 內部輔助函數：將所有地圖的數據揉合在一起
    const aggregateTeamStats = (teamStatsKey) => {
      const totals = {}
      
      // 遍歷所有單局遊戲
      match.value.games.forEach(game => {
        const stats = game[teamStatsKey] || []
        stats.forEach(s => {
          if (!totals[s.id]) {
            // 如果是第一次遇到這個選手，建立一個乾淨的拷貝，並把數值歸零
            totals[s.id] = { ...s, kills: 0, deaths: 0, headshots: 0, aces: 0 }
          }
          // 累加所有地圖的數據 (防禦性編程：轉為 Number 確保不會變成字串拼接)
          totals[s.id].kills += Number(s.kills || 0)
          totals[s.id].deaths += Number(s.deaths || 0)
          totals[s.id].headshots += Number(s.headshots || 0)
          totals[s.id].aces += Number(s.aces || 0)
        })
      })

      // 將字典轉回陣列，重新計算系列賽總 KDR，並按「總擊殺數」降序排列
      return Object.values(totals).map(p => {
        const k = p.kills
        const d = p.deaths
        p.kdr = d === 0 ? (k === 0 ? '0.00' : k.toFixed(2)) : (k / d).toFixed(2)
        return p
      }).sort((a, b) => b.kills - a.kills)
    }

    return {
      scoreRed: match.value.score.red,
      scoreBlue: match.value.score.blue,
      isOverview: true,
      roundHistory: [], // 總覽不顯示時間軸
      redTeamStats: aggregateTeamStats('redTeamStats'),   // 注入聚合後的紅隊總數據
      blueTeamStats: aggregateTeamStats('blueTeamStats')  // 注入聚合後的藍隊總數據
    }
  }

  // 單局模式：找到對應的 game
  const game = match.value.games.find(g => g.gameNumber === activeTab.value)
  return {
    scoreRed: game?.score.red,
    scoreBlue: game?.score.blue,
    roundHistory: game?.roundHistory || [],
    redTeamStats: game?.redTeamStats || [],  // <--- 新增這行
    blueTeamStats: game?.blueTeamStats || [], // <--- 新增這行
    isOverview: false
  }
})

// 生成回合數陣列 (確保格子數量至少能塞滿歷史紀錄，或者固定最少 15 格)
const totalRounds = computed(() => {
  if (!displayData.value || displayData.value.isOverview) return 0
  const historyLen = displayData.value.roundHistory.length
  return Math.max(historyLen, 15) // 即使沒打滿也預留 15 格的空間，比較好看
})


// ... 保留你原有的 match fetch 邏輯

// 動態麵包屑導航
const breadcrumbLinks = computed(() => {
  return [
    {
      label: '首頁 · Home',
      icon: 'i-lucide-home',
      to: '/'
    },
    {
      label: 'Plazma Burst 2',
      icon: 'i-lucide-gamepad-2',
      to: '/games/plazmaburst'
    },
    {
      // 這裡退回賽事首頁。由於我們沒在 match API 裡抓賽事名稱，用通用字眼即可，
      // 或是你可以回後端 API 把 tournament(title) 也 JOIN 出來。
      label: '賽事主頁 · Tournament',
      icon: 'i-lucide-trophy',
      to: `/games/plazmaburst/tournaments/${tournamentId}`
    },
    {
      // 動態顯示當前對戰的兩支隊伍
      label: match.value ? `${match.value.redTeam.short_sign} vs ${match.value.blueTeam.short_sign}` : '載入中...',
      icon: 'i-lucide-swords'
    }
  ]
})

const getContrastClass = (hexColor) => {
  // 如果沒有顏色，預設返回白色文字
  if (!hexColor) return 'text-white'
  
  // 移除 # 號
  const hex = hexColor.replace('#', '')
  
  // 將 3 碼或 6 碼的 hex 轉換為 RGB
  const r = parseInt(hex.length === 3 ? hex.slice(0, 1).repeat(2) : hex.slice(0, 2), 16)
  const g = parseInt(hex.length === 3 ? hex.slice(1, 2).repeat(2) : hex.slice(2, 4), 16)
  const b = parseInt(hex.length === 3 ? hex.slice(2, 3).repeat(2) : hex.slice(4, 6), 16)
  
  // 計算 YIQ 亮度 (數值範圍 0-255)
  // 人眼對綠色最敏感 (58.7%)，紅色次之 (29.9%)，藍色最不敏感 (11.4%)
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000
  
  // 亮度閾值設為 128。大於 128 為亮色背景（用深色字），小於 128 為暗色背景（用淺色字）
  return yiq >= 128 ? 'text-gray-900 drop-shadow-none' : 'text-white drop-shadow-md'
}
</script>

<template>
  <div v-if="pending" class="min-h-screen flex items-center justify-center">
    <UIcon name="i-lucide-loader-2" class="w-10 h-10 animate-spin text-blue-500" />
  </div>
  <div v-else-if="error" class="min-h-screen flex items-center justify-center text-red-500 font-bold">
    加載失敗：{{ error.message }}
  </div>

  <div v-else-if="match" class="max-w-6xl mx-auto p-4 md:p-8 space-y-6 animate-fade-in">

    <div class="mb-8 px-2 animate-fade-in">
      <UBreadcrumb :items="breadcrumbLinks" separator="i-lucide-chevron-right" :ui="{
        wrapper: 'flex flex-wrap items-center gap-1.5',
        li: 'flex items-center gap-1.5',
        base: 'text-xs md:text-sm font-bold tracking-wide transition-colors',
        active: 'text-gray-900 dark:text-white cursor-default',
        inactive: 'text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400',
        icon: { base: 'w-4 h-4', active: 'text-blue-500', inactive: 'text-gray-500' },
        separator: { base: 'w-4 h-4 text-gray-400' }
      }" />
    </div>

    <!-- 1. 地圖切換 Tabs (Wireframe 頂部) -->
    <div class="flex flex-wrap gap-2 justify-center md:justify-start">
      <button @click="activeTab = 'all'"
        class="px-6 py-3 font-bold text-sm transition-colors border border-gray-200 dark:border-gray-800"
        :class="activeTab === 'all' ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900' : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800'">
        All Maps
      </button>
      <button v-for="game in match.games" :key="game.id" @click="activeTab = game.gameNumber"
        class="px-6 py-3 font-bold text-sm transition-colors border border-gray-200 dark:border-gray-800"
        :class="activeTab === game.gameNumber ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900' : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800'">
        Map {{ game.gameNumber }} - {{ game.map.name }}
      </button>
    </div>

    <!-- 2. 核心對戰面板區塊 -->
    <div
      class="bg-gray-50 dark:bg-[#1a1c23] border border-gray-200 dark:border-gray-800 p-6 md:p-8 rounded-xl shadow-sm space-y-10">

      <!-- Header: 隊伍與大比分 -->
      <div class="flex items-center justify-between">

        <!-- 紅隊 (左側) -->
        <div class="flex items-center gap-4 flex-1">
          <!-- 分數：動態讀取，並注入隊伍主題色 -->
          <div class="text-4xl md:text-5xl font-black w-12 text-center"
            :style="{ color: match.redTeam.colour || '#ef4444' }">
            {{ displayData.scoreRed ?? '-' }}
          </div>
          <UAvatar :src="match.redTeam.logo" size="lg" class="hidden md:block bg-white shadow-sm"
            :ui="{ rounded: 'rounded-md' }" />
          <div class="font-black text-xl md:text-3xl tracking-tight text-gray-900 dark:text-white truncate">
            {{ match.redTeam.name }}
          </div>
        </div>

        <!-- VS 標籤 -->
        <div class="px-4 text-gray-400 font-black text-sm uppercase tracking-widest opacity-50">VS</div>

        <!-- 藍隊 (右側) -->
        <div class="flex items-center gap-4 flex-1 justify-end">
          <div class="font-black text-xl md:text-3xl tracking-tight text-gray-900 dark:text-white truncate text-right">
            {{ match.blueTeam.name }}
          </div>
          <UAvatar :src="match.blueTeam.logo" size="lg" class="hidden md:block bg-white shadow-sm"
            :ui="{ rounded: 'rounded-md' }" />
          <div class="text-4xl md:text-5xl font-black w-12 text-center"
            :style="{ color: match.blueTeam.colour || '#3b82f6' }">
            {{ displayData.scoreBlue ?? '-' }}
          </div>
        </div>
      </div>

      <!-- 3. 回合時間軸 (Round Timeline) -->
      <!-- 只在具體的地圖 Tab 下顯示，All Maps 模式不顯示回合軸 -->
      <div v-if="!displayData.isOverview && displayData.roundHistory.length > 0" class="relative">

        <!-- 滾動容器：隱藏滾動條但保持可滾動 -->
        <div class="overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden">
          <div class="inline-flex min-w-full">

            <!-- 隊伍標籤列 (Sticky 吸附在左側，不會被滾走) -->
            <div
              class="sticky left-0 z-10 bg-gray-50 dark:bg-[#1a1c23] pr-4 flex flex-col justify-end gap-1 border-r border-gray-200 dark:border-gray-800 mr-2 shadow-[4px_0_10px_rgba(0,0,0,0.05)] dark:shadow-[4px_0_10px_rgba(0,0,0,0.2)]">
              <!-- 第一行為了對齊頂部的回合數字留空 -->
              <div class="h-6"></div>
              <div class="h-8 flex items-center justify-end">
                <span class="text-sm font-bold text-gray-700 dark:text-gray-300 truncate max-w-[100px]">{{
                  match.redTeam.short_sign }}</span>
              </div>
              <div class="h-8 flex items-center justify-end">
                <span class="text-sm font-bold text-gray-700 dark:text-gray-300 truncate max-w-[100px]">{{
                  match.blueTeam.short_sign }}</span>
              </div>
            </div>

            <!-- 時間軸格子區 -->
            <div class="flex gap-1.5">
              <div v-for="roundNum in totalRounds" :key="roundNum" class="flex flex-col gap-1 w-8 items-center">

                <!-- 頂部回合數字 -->
                <div class="h-6 text-[10px] font-bold text-gray-400 flex items-end justify-center pb-1">
                  {{ roundNum }}
                </div>

                <!-- 紅隊結果格子 (完美修復版) -->
                <!-- 只在勝出時應用內聯顏色，否則交給 Tailwind 處理深淺色 -->
                <div class="w-full h-8 flex items-center justify-center rounded-sm transition-colors shadow-sm"
                  :style="displayData.roundHistory[roundNum - 1] === 1 ? { backgroundColor: match.redTeam.colour || '#ef4444' } : {}"
                  :class="displayData.roundHistory[roundNum - 1] === 1 ? '' : 'bg-gray-200 dark:bg-gray-800/50'">
                  <UIcon v-if="displayData.roundHistory[roundNum - 1] === 1" name="i-lucide-crosshair"
                    class="w-4 h-4" :class="getContrastClass(match.redTeam.colour)" />
                </div>

                <!-- 藍隊結果格子 (完美修復版) -->
                <!-- 2 代表藍隊贏 -->
                <div class="w-full h-8 flex items-center justify-center rounded-sm transition-colors shadow-sm"
                  :style="displayData.roundHistory[roundNum - 1] === 2 ? { backgroundColor: match.blueTeam.colour || '#3b82f6' } : {}"
                  :class="displayData.roundHistory[roundNum - 1] === 2 ? '' : 'bg-gray-200 dark:bg-gray-800/50'">
                  <UIcon v-if="displayData.roundHistory[roundNum - 1] === 2" name="i-lucide-crosshair"
                    class="w-4 h-4" :class="getContrastClass(match.blueTeam.colour)" />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <!-- 總覽模式：顯示所有地圖的比分總結 -->
      <div v-else-if="displayData.isOverview"
        class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-800">
        <div v-for="game in match.games" :key="game.id"
          class="bg-white dark:bg-gray-900 p-4 border border-gray-200 dark:border-gray-800 rounded-lg flex flex-col items-center gap-2 cursor-pointer hover:border-gray-400 transition-colors"
          @click="activeTab = game.gameNumber">
          <span class="text-xs font-bold text-gray-500 tracking-widest uppercase">Map {{ game.gameNumber }}</span>
          <span class="text-sm font-black truncate max-w-full">{{ game.map.name }}</span>
          <div class="flex items-center gap-3 mt-1 font-mono text-lg font-bold">
            <span :style="{ color: match.redTeam.colour }">{{ game.score.red ?? '-' }}</span>
            <span class="text-gray-400 text-sm">:</span>
            <span :style="{ color: match.blueTeam.colour }">{{ game.score.blue ?? '-' }}</span>
          </div>
        </div>
      </div>

      <!-- 如果沒有回合數據的空狀態提示 -->
      <div v-else
        class="py-8 text-center text-sm font-bold text-gray-400 uppercase tracking-widest border-t border-dashed border-gray-200 dark:border-gray-800 pt-12">
        Timeline data not available
      </div>

      <!-- 4. 選手 KDR 統計表 (Player Stats) -->
      <!-- 只在單局地圖模式下顯示，並用 lg:grid-cols-2 實現大螢幕左右分欄，手機端自動上下堆疊 -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8 border-t border-gray-200 dark:border-gray-800 mt-8">
        
        <!-- 紅隊統計表 (左側) -->
        <div class="space-y-3">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-3 h-3 rounded-full" :style="{ backgroundColor: match.redTeam.colour || '#ef4444' }"></div>
            <h4 class="font-black text-gray-900 dark:text-white uppercase tracking-wider text-sm">{{ match.redTeam.name }}</h4>
          </div>
          <div class="overflow-x-auto [&::-webkit-scrollbar]:hidden">
            <table class="w-full text-right text-sm">
              <thead>
                <tr class="text-xs text-gray-400 border-b border-gray-200 dark:border-gray-800">
                  <th class="py-2 pr-4 text-left font-medium">Player</th>
                  <th class="py-2 px-3 font-medium w-12">K</th>
                  <th class="py-2 px-3 font-medium w-12">D</th>
                  <th class="py-2 px-3 font-bold text-gray-600 dark:text-gray-300 w-16">K/D</th>
                  <th class="py-2 px-3 font-medium w-16" title="Headshots">HS</th>
                  <th class="py-2 pl-3 font-medium w-12" title="Aces">ACE</th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="player in displayData.redTeamStats" 
                  :key="player.id"
                  class="border-b border-gray-50 dark:border-gray-800/30 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td class="py-2.5 pr-4 text-left font-bold text-gray-900 dark:text-gray-100 truncate max-w-[120px]">{{ player.name }}</td>
                  <td class="py-2.5 px-3 font-mono">{{ player.kills }}</td>
                  <td class="py-2.5 px-3 font-mono text-gray-500">{{ player.deaths }}</td>
                  <!-- 品味細節：KDR 大於等於 1 顯示高亮色，小於 1 顯示暗色 -->
                  <td class="py-2.5 px-3 font-mono font-bold" :class="Number(player.kdr) >= 1 ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'">{{ player.kdr }}</td>
                  <td class="py-2.5 px-3 font-mono text-gray-500">{{ player.headshots }}</td>
                  <td class="py-2.5 pl-3 font-mono font-bold" :class="player.aces > 0 ? 'text-amber-500' : 'text-gray-300 dark:text-gray-700'">{{ player.aces || '-' }}</td>
                </tr>
              </tbody>
            </table>
            <!-- 無數據防呆 -->
            <div v-if="!displayData.redTeamStats || displayData.redTeamStats.length === 0" class="py-8 text-center text-xs text-gray-400 italic">No player stats available</div>
          </div>
        </div>

        <!-- 藍隊統計表 (右側) -->
        <div class="space-y-3">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-3 h-3 rounded-full" :style="{ backgroundColor: match.blueTeam.colour || '#3b82f6' }"></div>
            <h4 class="font-black text-gray-900 dark:text-white uppercase tracking-wider text-sm">{{ match.blueTeam.name }}</h4>
          </div>
          <div class="overflow-x-auto [&::-webkit-scrollbar]:hidden">
            <table class="w-full text-right text-sm">
              <thead>
                <tr class="text-xs text-gray-400 border-b border-gray-200 dark:border-gray-800">
                  <th class="py-2 pr-4 text-left font-medium">Player</th>
                  <th class="py-2 px-3 font-medium w-12">K</th>
                  <th class="py-2 px-3 font-medium w-12">D</th>
                  <th class="py-2 px-3 font-bold text-gray-600 dark:text-gray-300 w-16">K/D</th>
                  <th class="py-2 px-3 font-medium w-16" title="Headshots">HS</th>
                  <th class="py-2 pl-3 font-medium w-12" title="Aces">ACE</th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="player in displayData.blueTeamStats" 
                  :key="player.id"
                  class="border-b border-gray-50 dark:border-gray-800/30 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td class="py-2.5 pr-4 text-left font-bold text-gray-900 dark:text-gray-100 truncate max-w-[120px]">{{ player.name }}</td>
                  <td class="py-2.5 px-3 font-mono">{{ player.kills }}</td>
                  <td class="py-2.5 px-3 font-mono text-gray-500">{{ player.deaths }}</td>
                  <!-- 品味細節：KDR 變色 -->
                  <td class="py-2.5 px-3 font-mono font-bold" :class="Number(player.kdr) >= 1 ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'">{{ player.kdr }}</td>
                  <td class="py-2.5 px-3 font-mono text-gray-500">{{ player.headshots }}</td>
                  <!-- 有 ACE 時用醒目的琥珀色 -->
                  <td class="py-2.5 pl-3 font-mono font-bold" :class="player.aces > 0 ? 'text-amber-500' : 'text-gray-300 dark:text-gray-700'">{{ player.aces || '-' }}</td>
                </tr>
              </tbody>
            </table>
            <!-- 無數據防呆 -->
            <div v-if="!displayData.blueTeamStats || displayData.blueTeamStats.length === 0" class="py-8 text-center text-xs text-gray-400 italic">No player stats available</div>
          </div>
        </div>

      </div>

    </div>
  </div>
</template>