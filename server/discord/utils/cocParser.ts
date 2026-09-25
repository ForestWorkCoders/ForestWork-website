// server/discord/utils/coc-parser.ts
import { COC_ATTRIBUTES, ALL_COC_SKILLS, BASE_ATTR_KEYS } from '../assets/coc-skills'

export interface ParsedCharacterData {
  hp: number
  mp: number
  san: number
  attributes: Record<string, number>
  skills: Record<string, number>
}

/**
 * 健壯的文本解析器：從玩家自由輸入的多行文本中提取八圍與技能數據
 */
export function parseCharacterCard(rawContent: string): ParsedCharacterData {
  const attributes: Record<string, number> = {}
  const skills: Record<string, number> = {}

  // 1. 解析基礎屬性 (英文 Key 統一存入 attributes)
  for (const [key, alias] of Object.entries(COC_ATTRIBUTES)) {
    // 匹配如: STR: 60 或 力量 60 或 DEX-70
    const regex = new RegExp(`(?:^|[^a-zA-Z0-9\u4e00-\u9fa5])${key}[:：\\s-]*(\\d+)`, 'i')
    const match = rawContent.match(regex)
    if (match && match[1]) {
      const val = parseInt(match[1], 10)
      const standardKey = key.length <= 4 && key === key.toUpperCase() ? key : alias
      if (standardKey && !attributes[standardKey]) {
        attributes[standardKey] = val
      }
    }
  }

  // 2. 解析技能字典
  for (const skill of ALL_COC_SKILLS) {
    const regex = new RegExp(`(?:^|[^a-zA-Z0-9\u4e00-\u9fa5])${skill}[:：\\s-]*(\\d+)`, 'i')
    const match = rawContent.match(regex)
    if (match && match[1]) {
      const val = parseInt(match[1], 10)
      if (val > 0) {
        skills[skill] = val
      }
    }
  }

  // 3. 核心生存狀態值處理 (若未填寫，依 CoC 7th 規則自動計算兜底)
  const con = attributes.CON || 50
  const siz = attributes.SIZ || 65
  const pow = attributes.POW || 50

  const hp = attributes.HP || Math.floor((con + siz) / 10)
  const mp = attributes.MP || Math.floor(pow / 5)
  const san = attributes.SAN || pow

  // 確保八圍中不含非八圍的暫態字段
  for (const key of ['HP', 'MP', 'SAN']) {
    delete attributes[key]
  }

  return { hp, mp, san, attributes, skills }
}