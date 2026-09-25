// server/discord/utils/coc-dice.ts
import crypto from 'node:crypto'

export type CoCSuccessLevel = '★大成功' | '極限成功' | '困難成功' | '普通成功' | '失敗' | '●大失敗'

export interface CoCCheckResult {
  dice: number
  rolls: number[]
  level: CoCSuccessLevel
  isSuccess: boolean
}

/**
 * CoC 7版正統對抗檢定演算法 (支援獎懲骰)
 * @param target 技能或屬性目標值 (1 ~ 100)
 * @param bonus 獎勵骰為正數 (+1, +2)，懲罰骰為負數 (-1, -2)，常規為 0
 */
export function rollCoC(target: number, bonus: number = 0): CoCCheckResult {
  const units = crypto.randomInt(0, 10) // 個位數 0~9
  const count = Math.min(2, Math.max(0, Math.abs(bonus))) + 1 // 候選十位數數量: 1 ~ 3
  
  // 生成十位數候選組 (0, 10, 20 ... 90)
  const tensList = Array.from({ length: count }, () => crypto.randomInt(0, 10) * 10)
  
  // 拼接十位與個位 (00 + 0 = 100)
  const rolls = tensList.map(t => (t + units === 0 ? 100 : t + units))

  // 獎勵骰取最小值，懲罰骰取最大值，標準檢定取第 1 個
  const dice = bonus > 0 ? Math.min(...rolls) : bonus < 0 ? Math.max(...rolls) : rolls[0]!

  let level: CoCSuccessLevel = '失敗'
  let isSuccess = false

  // 正統 CoC 7版判定規則：
  // 1. 01 永遠是大成功
  if (dice === 1) {
    level = '★大成功'
    isSuccess = true
  }
  // 2. 大失敗判定：目標值 < 50 時 96~100 為大失敗；目標值 >= 50 時僅 100 為大失敗
  else if ((target < 50 && dice >= 96) || dice === 100) {
    level = '●大失敗'
    isSuccess = false
  }
  // 3. 極限成功：<= 目標值 / 5
  else if (dice <= Math.floor(target / 5)) {
    level = '極限成功'
    isSuccess = true
  }
  // 4. 困難成功：<= 目標值 / 2
  else if (dice <= Math.floor(target / 2)) {
    level = '困難成功'
    isSuccess = true
  }
  // 5. 普通成功：<= 目標值
  else if (dice <= target) {
    level = '普通成功'
    isSuccess = true
  }
  // 6. 失敗
  else {
    level = '失敗'
    isSuccess = false
  }

  return { dice, rolls, level, isSuccess }
}