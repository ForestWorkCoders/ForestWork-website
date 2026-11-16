<script setup lang="ts">
// A bracket: each section (upper, lower, or the only lane) is a row of round columns,
// sections stacked top to bottom. Winner lines follow `match.next`.
import type { Match, Section, Side } from '~/types/phases'

const props = defineProps<{ sections: Section[] }>()

// --- 幾何常數設定 (Geometry Constants) ---
const CARD_W = 220    // 卡片寬度
const CARD_H = 90     // 卡片高度
const GAP_X = 64      // 水平間距 (連線的長度)
const GAP_Y = 32      // 垂直間距
const PADDING_X = 64  // 整個樹狀圖的左右留白
const PADDING_Y = 64  // 整個樹狀圖的上下留白
const SECTION_GAP = 240 // 兩個 section 之間的距離，防止重疊

interface Node { id: string; x: number; y: number; match: Match }

// A side is dimmed only once the match has a winner and it isn't this side
const decided = (m: Match) => m.sides.some(s => s.winner)
const sideClass = (m: Match, s: Side) =>
  s.winner ? 'font-extrabold text-gray-900 dark:text-white'
    : !decided(m) ? 'font-bold text-gray-700 dark:text-gray-300' : 'font-medium text-gray-500'

// --- 核心佈局引擎 (Layout Engine) ---
const graphData = computed(() => {
  const nodes: Node[] = []
  const edges: { id: string; x1: number; y1: number; x2: number; y2: number; color: string }[] = []
  const headers: { id: string; x: number; y: number; text: string }[] = []
  const nodeMap = new Map<string, Node>()

  let startY = PADDING_Y
  for (const section of props.sections) {
    let maxY = startY
    section.rounds.forEach((round, col) => {
      const x = PADDING_X + col * (CARD_W + GAP_X)
      headers.push({ id: `${section.id}-header-${col}`, x, y: startY - 36, text: round.title })

      round.matches.forEach((match, row) => {
        // First column stacks; later columns sit between the matches that feed them
        const parents = col ? nodes.filter(n => n.match.next === match.id) : []
        const y = parents.length
          ? parents.reduce((sum, p) => sum + p.y, 0) / parents.length
          : startY + row * (CARD_H + GAP_Y) * Math.pow(2, col)
        const node = { id: match.id, x, y, match }
        nodes.push(node)
        nodeMap.set(match.id, node)
        maxY = Math.max(maxY, y)
      })
    })
    startY = maxY + SECTION_GAP
  }

  // 勝者晉級線：亮起勝方隊伍的顏色，未分勝負為灰色
  for (const node of nodes) {
    const target = node.match.next && nodeMap.get(node.match.next)
    if (!target) continue
    const winner = node.match.sides.find(s => s.winner)
    edges.push({
      id: `win-${node.id}`,
      x1: node.x + CARD_W, y1: node.y + CARD_H / 2,
      x2: target.x, y2: target.y + CARD_H / 2,
      color: winner ? (winner.entrant?.colour || '#3b82f6') : '#374151'
    })
  }
  // TODO: the loser drop lines (match.nextLoser) were switched off before; they stay off.

  // 畫布總尺寸 (右側和底部同樣留白，防止手機端滾動截斷)
  const totalWidth = nodes.length ? Math.max(...nodes.map(n => n.x)) + CARD_W + PADDING_X : 800
  const totalHeight = nodes.length ? Math.max(...nodes.map(n => n.y)) + CARD_H + PADDING_Y : 600

  return { nodes, edges, headers, totalWidth, totalHeight }
})

// --- 直角連線演算法 (Orthogonal Routing) ---
// 先水平走到中間，再垂直對齊目標，再水平連入
const orthogonal = (x1: number, y1: number, x2: number, y2: number) => {
  const midX = x1 + (x2 - x1) / 2
  return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`
}
</script>

<template>
  <div
    class="w-full overflow-auto [&::-webkit-scrollbar]:hidden relative bg-gray-50 dark:bg-default rounded-xl border border-gray-200 dark:border-default shadow-inner">

    <div class="relative" :style="{ minWidth: graphData.totalWidth + 'px', minHeight: graphData.totalHeight + 'px' }">

      <svg class="absolute inset-0 w-full h-full pointer-events-none z-0">
        <path v-for="edge in graphData.edges" :key="edge.id" :d="orthogonal(edge.x1, edge.y1, edge.x2, edge.y2)"
          fill="none" :stroke="edge.color" stroke-width="2" stroke-linejoin="round" class="transition-colors duration-500" />
      </svg>

      <div v-for="header in graphData.headers" :key="header.id"
        class="absolute text-xs font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-widest text-center select-none pointer-events-none"
        :style="{ left: header.x + 'px', top: header.y + 'px', width: CARD_W + 'px' }">
        {{ header.text }}
      </div>

      <NuxtLink v-for="node in graphData.nodes" :key="node.id" :to="node.match.url ?? undefined"
        class="absolute block bg-white dark:bg-elevated border border-gray-200 dark:border-default rounded-lg shadow-sm z-10 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group"
        :style="{ left: node.x + 'px', top: node.y + 'px', width: CARD_W + 'px', height: CARD_H + 'px' }">
        <div v-for="(side, i) in node.match.sides" :key="i"
          class="flex items-center justify-between p-2.5 transition-all duration-300"
          :class="[{ 'border-b border-gray-100 dark:border-default': i === 0 }, { 'opacity-40 grayscale-[50%]': decided(node.match) && !side.winner }]">
          <div class="flex items-center gap-2">
            <div class="w-1.5 h-6 rounded-sm transition-colors"
              :style="side.winner && side.entrant?.colour ? { backgroundColor: side.entrant.colour } : {}"
              :class="side.winner ? (side.entrant?.colour ? '' : 'bg-blue-500') : 'bg-gray-200 dark:bg-accented'" />
            <span class="text-xs truncate w-28 transition-all" :class="sideClass(node.match, side)">
              {{ side.entrant?.name || 'TBD' }}
            </span>
          </div>
          <span class="font-mono text-xs transition-all" :class="sideClass(node.match, side)">
            {{ side.score ?? '-' }}
          </span>
        </div>
      </NuxtLink>

    </div>
  </div>
</template>
