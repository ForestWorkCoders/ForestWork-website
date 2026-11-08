// server/utils/mahjongScoreEngine.ts

// 定義規則介面，確保型別安全
export interface MahjongRules {
  basepts: number | null
  uma1: number | null
  uma2: number | null
  uma3: number | null
  uma4: number | null
}

/**
 * 核心麻將算分引擎：保證全站所有的積分計算絕對一致
 */
export const calculateMahjongPoints = (
  score: number, 
  rank: number, 
  isSanma: boolean, 
  rules?: MahjongRules | null
): number => {
  if (isSanma) {
    const base = rules?.basepts ?? 35000
    const sanmaUmaMap = [ rules?.uma1 ?? 15, rules?.uma2 ?? 0, rules?.uma3 ?? -15 ]
    const basePts = (score - base) / 1000
    return Number((basePts + (sanmaUmaMap[rank - 1] ?? 0)).toFixed(1))
  } else {
    const base = rules?.basepts ?? 25000
    const yonmaUmaMap = [ rules?.uma1 ?? 15, rules?.uma2 ?? 5, rules?.uma3 ?? -5, rules?.uma4 ?? -15 ]
    const basePts = (score - base) / 1000
    return Number((basePts + (yonmaUmaMap[rank - 1] ?? 0)).toFixed(1))
  }
}