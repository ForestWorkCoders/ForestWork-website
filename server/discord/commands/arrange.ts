// server/discord/commands/arrange.ts
import crypto from 'node:crypto'
import type { H3Event } from 'h3'
import { getInteractionOption, tokenizeChoices } from '../utils'

/**
 * Fisher-Yates (Knuth) 密码学洗牌算法
 * 严格适配 noUncheckedIndexedAccess 模式，类型零警告
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1)
    
    // 好品味：提取不可变局部变量并由守卫收窄类型，彻底消灭 T | undefined 报错
    const current = result[i]
    const target = result[j]
    
    if (current !== undefined && target !== undefined) {
      result[i] = target
      result[j] = current
    }
  }
  return result
}

export async function handleArrange(interaction: any, event: H3Event) {
  const rawInput = getInteractionOption<string>(interaction, 'items') || ''
  const groupsCount = getInteractionOption<number>(interaction, 'groups')
  const items = tokenizeChoices(rawInput)

  // 卫语句 1：基础名单数量校验
  if (items.length < 2) {
    return {
      type: 4,
      data: {
        content: '⚠️ **名單項目不足**：請至少提供 2 個項目以進行隨機重排！\n' +
                 '* 範例: `/arrange items: 隊伍A, 隊伍B, 隊伍C, 隊伍D`'
      }
    }
  }

  // 卫语句 2：分组数量合法性
  if (groupsCount !== undefined && groupsCount > items.length) {
    return {
      type: 4,
      data: {
        content: `⚠️ **分組數量異常**：欲切分的組數 (\`${groupsCount}\`) 不能大於名單總人數 (\`${items.length}\`)！`
      }
    }
  }

  // 1. 统一执行洗牌
  const shuffled = shuffleArray(items)

  let outputText = ''

  // 2. 分支处理：有无分组
  if (groupsCount && groupsCount >= 2) {
    // 采用轮流发牌机制 (Round-robin)，保证各组人数绝对均匀
    const buckets: string[][] = Array.from({ length: groupsCount }, () => [])
    
    shuffled.forEach((item, index) => {
      // 好品味：提取局部桶引用并通过守卫确认存在，消除 Object is possibly 'undefined'
      const targetBucket = buckets[index % groupsCount]
      if (targetBucket) {
        targetBucket.push(item)
      }
    })

    const groupBlocks = buckets.map((group, idx) => {
      const members = group.map((m, mIdx) => `${mIdx + 1}. ${m}`).join('  |  ')
      return `🚩 **第 ${idx + 1} 組** (${group.length} 人)\n> ${members}`
    })

    outputText = `🔀 **隨機分組結果** (共 ${shuffled.length} 人，分為 ${groupsCount} 組)：\n\n` + groupBlocks.join('\n\n')
  } else {
    // 默认单序列展示（向后兼容原版）
    const listLines = shuffled.map((item, idx) => `**${idx + 1}.** ${item}`)
    outputText = `🔀 **隨機重排結果** (共 ${shuffled.length} 項)：\n\n` + listLines.join('\n')
  }

  // 防止超出 Discord 2000 字符限制
  const content = outputText.length > 1800 
    ? outputText.slice(0, 1800) + '\n... (名單過長已截斷)' 
    : outputText

  return {
    type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
    data: { content }
  }
}