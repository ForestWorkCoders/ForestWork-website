// server/utils/mahjongPairing.ts

/**
 * 斯巴達式 Pair Key 產生器 (按字典序排序保證無向性: "PlayerA:PlayerB")
 */
export function getPairKey(pA: string, pB: string): string {
  return pA < pB ? `${pA}:${pB}` : `${pB}:${pA}`
}

/**
 * 斯巴達式 Fisher-Yates 洗牌 (打破平局確定性，消滅死板輸出)
 */
export function shuffle<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!]
  }
  return arr
}

/**
 * ★ 核心好品味：構建統一懲罰權重圖 (Penalty Map)
 * - 歷史牌譜交手：每次交手權重 +10 (長期熟人微量避碰)
 * - 本場賽事同桌：碰面 1 次 +500，碰面 2 次暴增至 +2000 (平方懲罰嚴格拆散)
 */
export function buildCompositePenaltyMap(
  historicalPairs: { player1: string; player2: string; count: number }[],
  currentTournamentPastTables: string[][][] // 三維陣列: [輪次][桌次][玩家]
): Map<string, number> {
  const penaltyMap = new Map<string, number>()

  // 1. 注入歷史牌譜權重
  for (const item of historicalPairs) {
    const key = getPairKey(item.player1, item.player2)
    penaltyMap.set(key, item.count * 10)
  }

  // 2. 統計本場賽事內各選手已碰面次數
  const tourneyMeetCounts = new Map<string, number>()
  for (const roundTables of currentTournamentPastTables) {
    for (const table of roundTables) {
      for (let i = 0; i < table.length; i++) {
        for (let j = i + 1; j < table.length; j++) {
          const key = getPairKey(table[i]!, table[j]!)
          tourneyMeetCounts.set(key, (tourneyMeetCounts.get(key) || 0) + 1)
        }
      }
    }
  }

  // 3. 將本場碰撞施加強效平方懲罰，累加至權重圖
  for (const [key, count] of tourneyMeetCounts.entries()) {
    const existing = penaltyMap.get(key) || 0
    // 碰面 1 次罰 500 分，碰面 2 次罰 2000 分，碰面 3 次罰 4500 分！
    const heavyPenalty = Math.pow(count, 2) * 500
    penaltyMap.set(key, existing + heavyPenalty)
  }

  return penaltyMap
}

/**
 * ★ 計算單桌 (4人) 的懲罰總分 (純粹查表求和，零複雜副作用！)
 */
export function calculateTablePenalty(table: string[], penaltyMap: Map<string, number>): number {
  let penalty = 0
  for (let i = 0; i < table.length; i++) {
    for (let j = i + 1; j < table.length; j++) {
      const key = getPairKey(table[i]!, table[j]!)
      penalty += penaltyMap.get(key) || 0
    }
  }
  return penalty
}

/**
 * 計算全場所有桌次的懲罰總和
 */
export function calculateTotalPenalty(tables: string[][], penaltyMap: Map<string, number>): number {
  return tables.reduce((acc, table) => acc + calculateTablePenalty(table, penaltyMap), 0)
}

/**
 * 將一維選手陣列切分為 4 人一桌
 */
export function chunkToTables(players: string[]): string[][] {
  const tables: string[][] = []
  for (let i = 0; i < players.length; i += 4) {
    tables.push(players.slice(i, i + 4))
  }
  return tables
}

/**
 * ★★★ 核心補齊：分桌最優化解算器 (Greedy 2-opt Swap Optimizer) ★★★
 * 先洗牌打破平局，隨後透過隨機交換尋求全域最小懲罰分桌
 */
export function optimizeTables(
  players: string[],
  penaltyMap: Map<string, number>,
  iterations: number = 1000
): string[][] {
  if (players.length % 4 !== 0) {
    throw new Error(`選手總人數必須為 4 的倍數，當前人數: ${players.length}`)
  }

  // 1. 隨機初始狀態 (注入微量熵，徹底消滅死板輸出)
  let currentPlayers = shuffle(players)
  let bestTables = chunkToTables(currentPlayers)
  let bestScore = calculateTotalPenalty(bestTables, penaltyMap)

  // 若初始狀態已經完美 (0 懲罰)，直接交差
  if (bestScore === 0) return bestTables

  // 2. 局部搜尋優化 (2-opt 隨機交換)
  for (let iter = 0; iter < iterations; iter++) {
    const i = Math.floor(Math.random() * currentPlayers.length)
    const j = Math.floor(Math.random() * currentPlayers.length)
    if (i === j) continue

    // 嘗試交換兩名選手
    const candidatePlayers = [...currentPlayers];
    [candidatePlayers[i], candidatePlayers[j]] = [candidatePlayers[j]!, candidatePlayers[i]!]

    const candidateTables = chunkToTables(candidatePlayers)
    const candidateScore = calculateTotalPenalty(candidateTables, penaltyMap)

    // 若交換後總懲罰降低，接受新狀態
    if (candidateScore < bestScore) {
      bestScore = candidateScore
      bestTables = candidateTables
      currentPlayers = candidatePlayers

      // 達到全域最優解時提前安全煞車
      if (bestScore === 0) break
    }
  }

  return bestTables
}