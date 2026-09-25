// server/discord/utils/coc-parser.ts
import { COC_ATTRIBUTES, ALL_COC_SKILLS, BASE_ATTR_KEYS } from '../assets/coc-skills'

export interface ParsedCharacterData {
  hp: number
  mp: number
  san: number
  attributes: Record<string, number>
  skills: Record<string, number>
}

const CANONICAL_ATTR_MAP: Record<string, string> = {
  STR: 'STR', 力量: 'STR',
  CON: 'CON', 體質: 'CON',
  SIZ: 'SIZ', 體型: 'SIZ',
  DEX: 'DEX', 敏捷: 'DEX',
  APP: 'APP', 外貌: 'APP',
  INT: 'INT', 智力: 'INT', 靈感: 'INT',
  POW: 'POW', 意志: 'POW',
  EDU: 'EDU', 教育: 'EDU',
  LUK: 'LUK', 幸運: 'LUK', 幸运: 'LUK', LUCK: 'LUK',
  SAN: 'SAN', 理智: 'SAN',
  HP: 'HP', 體力: 'HP', 体力: 'HP',
  MP: 'MP', 魔力: 'MP'
}

/**
 * 健壯的文本解析器：從玩家自由輸入的多行文本中提取八圍與技能數據
 */
export function parseCharacterCard(rawContent: string): ParsedCharacterData {
  const attributes: Record<string, number> = {}
  const skills: Record<string, number> = {}

  // 1. 解析基础属性（直接查表，消灭 toUpperCase 隐患）
  for (const [alias, canonicalKey] of Object.entries(CANONICAL_ATTR_MAP)) {
    const regex = new RegExp(`(?:^|[^a-zA-Z0-9\u4e00-\u9fa5])${alias}[:：\\s-]*(\\d+)`, 'i')
    const match = rawContent.match(regex)
    if (match && match[1]) {
      const val = parseInt(match[1], 10)
      // 只要匹配到且尚未赋值，直接赋给标准的大写英文键（如 STR）
      if (attributes[canonicalKey] === undefined) {
        attributes[canonicalKey] = val
      }
    }
  }

  // 2. 解析技能字典 (保持原样)
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

  // 3. 计算生存槽
  const con = attributes.CON || 50
  const siz = attributes.SIZ || 65
  const pow = attributes.POW || 50

  const hp = attributes.HP || Math.floor((con + siz) / 10)
  const mp = attributes.MP || Math.floor(pow / 5)
  const san = attributes.SAN || pow

  // 剔除八围字典中的瞬态值
  delete attributes.HP
  delete attributes.MP
  delete attributes.SAN

  return { hp, mp, san, attributes, skills }
}