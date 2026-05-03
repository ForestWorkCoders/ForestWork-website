<script setup>
import { computed } from 'vue'

const props = defineProps({
  upperBracket: { type: Array, default: () => [] },
  lowerBracket: { type: Array, default: () => [] }
})

// --- 幾何常數設定 (Geometry Constants) ---
const CARD_W = 220    // 卡片寬度
const CARD_H = 90     // 卡片高度
const GAP_X = 64      // 水平間距 (連線的長度)
const GAP_Y = 32      // 垂直間距
const PADDING_X = 64  // 💎 新增：整個樹狀圖的左右留白 (呼吸空間)
const PADDING_Y = 64  // 💎 新增：整個樹狀圖的上下留白

// --- 核心佈局引擎 (Layout Engine) ---
const graphData = computed(() => {
  const nodes = []
  const edges = []
  const headers = []
  const nodeMap = new Map()

  // 輔助函數：計算單個 Bracket 的座標
  const buildNodes = (rounds, startY, prefix) => {
    let currentMaxY = startY

    rounds.forEach((round, colIndex) => {
      const x = PADDING_X + colIndex * (CARD_W + GAP_X)

      // 💎 3. 收集標題座標：精準定位在該列第一張卡片的正上方 36px 處
      headers.push({
        id: `${prefix}-header-${colIndex}`,
        x: x,
        y: startY - 36, 
        text: round.title
      })

      round.matches.forEach((match, rowIndex) => {
        // X 座標
        const x = PADDING_X + colIndex * (CARD_W + GAP_X)
        let y = 0

        // Y 座標計算
        if (colIndex === 0) {
          y = startY + rowIndex * (CARD_H + GAP_Y)
        } else {
          const parents = nodes.filter(n => n.match.nextMatchId === match.id)
          if (parents.length > 0) {
            y = parents.reduce((sum, p) => sum + p.y, 0) / parents.length
          } else {
            y = startY + rowIndex * (CARD_H + GAP_Y) * Math.pow(2, colIndex)
          }
        }

        const node = { id: match.id, x, y, match, colIndex }
        nodes.push(node)
        nodeMap.set(match.id, node)
        currentMaxY = Math.max(currentMaxY, y)
      })
    })
    return currentMaxY
  }

  // 1. 計算勝者組座標
  const upperMaxY = buildNodes(props.upperBracket, PADDING_Y, 'ub')
  
  // 2. 計算敗者組座標 (接在勝者組下方 240px 處，防止重疊)
  if (props.lowerBracket.length > 0) {
    buildNodes(props.lowerBracket, upperMaxY + 240, 'lb')
  }

  // 3. 繪製連線 (Edges)
  nodes.forEach(node => {
    // 繪製勝者晉級線 (綠/藍/主題色)
    if (node.match.nextMatchId) {
      const target = nodeMap.get(node.match.nextMatchId)
      if (target) {
        // 勝者線從卡片右側中間出發，連到下一場卡片的左側中間
        edges.push({
          id: `win-${node.id}`,
          x1: node.x + CARD_W,
          y1: node.y + CARD_H / 2,
          x2: target.x,
          y2: target.y + CARD_H / 2,
          isDrop: false,
          // 如果這場有贏家，線條亮起對應隊伍的顏色，否則為灰色
          color: node.match.winner === 'A' ? (node.match.colourA || '#3b82f6') : 
                 (node.match.winner === 'B' ? (node.match.colourB || '#3b82f6') : '#374151') 
        })
      }
    }

    // 繪製敗者掉落線 (紅色虛線 - 這是雙敗賽制的靈魂)
    if (node.match.nextLoserMatchId) {
      const dropTarget = nodeMap.get(node.match.nextLoserMatchId)
      if (dropTarget) {
        // 敗者線從卡片底部正中央出發
        edges.push({
          id: `drop-${node.id}`,
          x1: node.x + CARD_W / 2,
          y1: node.y + CARD_H,
          x2: dropTarget.x + CARD_W / 2,
          y2: dropTarget.y,
          isDrop: true,
          color: '#ef4444' // 紅色警告線
        })
      }
    }
  })

  // 4. 計算畫布總尺寸 (確保右側和底部也有同樣的留白，防止手機端滾動截斷)
  const totalWidth = nodes.length > 0 
    ? Math.max(...nodes.map(n => n.x)) + CARD_W + PADDING_X 
    : 800
    
  const totalHeight = nodes.length > 0 
    ? Math.max(...nodes.map(n => n.y)) + CARD_H + PADDING_Y 
    : 600

  return { nodes, edges, headers, totalWidth, totalHeight }
})

// --- 直角連線演算法 (Orthogonal Routing) ---
const drawOrthogonalLine = (x1, y1, x2, y2, isDrop) => {
  if (isDrop) {
    // 掉落線：先往下走，再水平移動，再往下連到敗者組
    const midY = y1 + 20
    return `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`
  } else {
    // 正常晉級線：先水平走到中間，再垂直對齊目標，再水平連入
    const midX = x1 + (x2 - x1) / 2
    return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`
  }
}
</script>

<template>
  <div class="w-full overflow-auto [&::-webkit-scrollbar]:hidden relative bg-gray-50 dark:bg-[#0f1115] rounded-xl border border-gray-200 dark:border-gray-800 shadow-inner">
    
    <div class="relative" :style="{ minWidth: graphData.totalWidth + 'px', minHeight: graphData.totalHeight + 'px' }">
      
      <svg class="absolute inset-0 w-full h-full pointer-events-none z-0">
        <path 
          v-for="edge in graphData.edges" 
          :key="edge.id"
          :d="drawOrthogonalLine(edge.x1, edge.y1, edge.x2, edge.y2, edge.isDrop)"
          fill="none"
          :stroke="edge.color"
          stroke-width="2"
          stroke-linejoin="round"
          :stroke-dasharray="edge.isDrop ? '6,6' : 'none'"
          class="transition-colors duration-500"
        />
      </svg>

      <div 
        v-for="header in graphData.headers" 
        :key="header.id"
        class="absolute text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-center select-none pointer-events-none"
        :style="{ left: header.x + 'px', top: header.y + 'px', width: CARD_W + 'px' }"
      >
        {{ header.text }}
      </div>

      <NuxtLink 
        v-for="node in graphData.nodes" 
        :key="node.id"
        :to="`/games/plazmaburst/tournaments/${$route.params.tournamentId}/matches/${node.match.id}`"
        class="absolute block bg-white dark:bg-[#1a1c23] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm z-10 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group"
        :style="{ left: node.x + 'px', top: node.y + 'px', width: CARD_W + 'px', height: CARD_H + 'px' }"
      >
        <div 
          class="flex items-center justify-between p-2.5 border-b border-gray-100 dark:border-gray-800 transition-all duration-300" 
          :class="{ 'opacity-40 grayscale-[50%]': node.match.winner && node.match.winner !== 'A' }"
        >
          <div class="flex items-center gap-2">
            <div 
              class="w-1.5 h-6 rounded-sm transition-colors" 
              :style="node.match.winner === 'A' && node.match.colourA ? { backgroundColor: node.match.colourA } : {}" 
              :class="node.match.winner === 'A' ? (node.match.colourA ? '' : 'bg-blue-500') : 'bg-gray-200 dark:bg-gray-800'"
            ></div>
            <span 
              class="text-xs truncate w-28 transition-all" 
              :class="node.match.winner === 'A' ? 'font-black text-gray-900 dark:text-white' : (!node.match.winner ? 'font-bold text-gray-700 dark:text-gray-300' : 'font-medium text-gray-500')"
            >
              {{ node.match.teamA || 'TBD' }}
            </span>
          </div>
          <span 
            class="font-mono text-xs transition-all" 
            :class="node.match.winner === 'A' ? 'font-black text-gray-900 dark:text-white' : (!node.match.winner ? 'font-bold text-gray-700 dark:text-gray-300' : 'font-medium text-gray-500')"
          >
            {{ node.match.scoreA ?? '-' }}
          </span>
        </div>

        <div 
          class="flex items-center justify-between p-2.5 transition-all duration-300" 
          :class="{ 'opacity-40 grayscale-[50%]': node.match.winner && node.match.winner !== 'B' }"
        >
          <div class="flex items-center gap-2">
            <div 
              class="w-1.5 h-6 rounded-sm transition-colors" 
              :style="node.match.winner === 'B' && node.match.colourB ? { backgroundColor: node.match.colourB } : {}" 
              :class="node.match.winner === 'B' ? (node.match.colourB ? '' : 'bg-blue-500') : 'bg-gray-200 dark:bg-gray-800'"
            ></div>
            <span 
              class="text-xs truncate w-28 transition-all" 
              :class="node.match.winner === 'B' ? 'font-black text-gray-900 dark:text-white' : (!node.match.winner ? 'font-bold text-gray-700 dark:text-gray-300' : 'font-medium text-gray-500')"
            >
              {{ node.match.teamB || 'TBD' }}
            </span>
          </div>
          <span 
            class="font-mono text-xs transition-all" 
            :class="node.match.winner === 'B' ? 'font-black text-gray-900 dark:text-white' : (!node.match.winner ? 'font-bold text-gray-700 dark:text-gray-300' : 'font-medium text-gray-500')"
          >
            {{ node.match.scoreB ?? '-' }}
          </span>
        </div>
      </NuxtLink>

    </div>
  </div>
</template>