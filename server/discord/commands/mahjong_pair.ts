// server/discord/commands/mahjong-pair.ts
import type { H3Event } from 'h3'
import { getSupabase } from '../../utils/supabase'
import { getInteractionOption, tokenizeChoices } from '../utils'

// 位運算常數 (100% 對齊原 Python 邏輯)
const OFFSET = 10000000
const XOR_CODE = 6139246
const ALPHABET = 67108863
const EXCEEDED = ALPHABET + 1
const SEATS = ['east', 'south', 'west'] as const

export function fri2account(friendId: number): number {
  const data = friendId - OFFSET
  const tmp = data & ALPHABET
  const shifted = ((tmp & 127) << 19) | (tmp >> 7)
  return ((data & EXCEEDED) + shifted) ^ XOR_CODE
}

export function acc2friend(accountId: number): number {
  const data = accountId ^ XOR_CODE
  const tmp = data & ALPHABET
  const shifted = ((tmp & 524287) << 7) | (tmp >> 19)
  return shifted + (data & EXCEEDED) + OFFSET
}

function getPairKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`
}

// 斯巴達式 Fisher-Yates 洗牌 (打破 0 成本平局確定性，消滅死板輸出)
function shuffle<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!]
  }
  return arr
}

// 輔助函式：3 人組合生成器
function getTriplets<T>(arr: T[]): T[][] {
  const result: T[][] = []
  const n = arr.length
  for (let i = 0; i < n - 2; i++) {
    for (let j = i + 1; j < n - 1; j++) {
      for (let k = j + 1; k < n; k++) {
        const a = arr[i]
        const b = arr[j]
        const c = arr[k]
        if (a !== undefined && b !== undefined && c !== undefined) {
          result.push([a, b, c])
        }
      }
    }
  }
  return result
}

// 好品味：3 個人只有固定的 6 種全排列，直接列出消滅複雜遞迴
function getPermutations3<T>(triplet: [T, T, T]): [T, T, T][] {
  const [a, b, c] = triplet
  return [
    [a, b, c],
    [a, c, b],
    [b, a, c],
    [b, c, a],
    [c, a, b],
    [c, b, a]
  ]
}

export async function handleMahjongPair(interaction: any, event: H3Event) {
  const rawInput = getInteractionOption<string>(interaction, 'players') || ''
  const idType = getInteractionOption<string>(interaction, 'id_type') || 'friend'
  const isAccountMode = idType === 'account'
  const channelId = String(interaction.channel_id || 'default_channel')

  const tokens = tokenizeChoices(rawInput)

  // 1. 提取有效純數字 (統一防禦正整數)
  const rawNumbers = tokens
    .map(t => parseInt(t.replace(/\D/g, ''), 10))
    .filter(n => !isNaN(n) && n > 0)

  if (rawNumbers.length === 0 || rawNumbers.length % 3 !== 0) {
    return {
      type: 4,
      data: {
        content: `⚠️ **參賽人數異常**：檢測到有效 ID 共 \`${rawNumbers.length}\` 位，必須為 3 的正整數倍（例如 6、9、12 人）！\n* 當前模式: **\`${isAccountMode ? '帳號 ID (Account ID)' : '好友碼 (Friend ID)'}\`**`
      }
    }
  }

  // 2. 帳號統一歸一化為底層 Account ID
  const accountIds = rawNumbers.map(n => isAccountMode ? n : fri2account(n))
  const supabase = await getSupabase()

  // ★★★ 改造點 1：並行拉取「歷史牌譜頻次」、「座位頻次」以及「本頻道過去 4 小時內的前 3 輪分桌」★★★
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
  const [meetupRes, seatRes, recentRoundsRes] = await Promise.all([
    supabase.schema('mahjong').rpc('get_player_meetup_frequency' as any),
    supabase.schema('mahjong').rpc('get_seat_frequency' as any),
    supabase.schema('mahjong')
      .from('recent_pairings')
      .select('triplets')
      .eq('channel_id', channelId)
      .gte('created_at', fourHoursAgo)
      .order('created_at', { ascending: false })
      .limit(3)
  ])

  const meetupData = (meetupRes.data || []) as any[]
  const seatData = (seatRes.data || []) as any[]
  const recentRounds = (recentRoundsRes.data || []) as any[]

  // 構造碰面頻次表 (基礎歷史值)
  const playerFrequency = new Map<string, number>()
  meetupData.forEach(r => {
    const pairKey = getPairKey(Number(r.player1), Number(r.player2))
    playerFrequency.set(pairKey, (playerFrequency.get(pairKey) || 0) + r.meet_up_count)
  })

  // ★★★ 改造點 2：核心好品味！疊加本場近期輪次，施加超強 L6 範數虛擬懲罰 (+20 次) ★★★
  recentRounds.forEach(roundRow => {
    const pastTriplets = roundRow.triplets as [number, number, number][]
    if (Array.isArray(pastTriplets)) {
      pastTriplets.forEach(([p1, p2, p3]) => {
        if (p1 === undefined || p2 === undefined || p3 === undefined) return
        
        // 明確定義為固定 2 元組陣列，消滅解構 undefined 隱患
        const pairs: [number, number][] = [[p1, p2], [p2, p3], [p1, p3]]
        for (const [a, b] of pairs) {
          const pairKey = getPairKey(a, b) // ★ 使用純函數，零 TS 警告！
          playerFrequency.set(pairKey, (playerFrequency.get(pairKey) || 0) + 20)
        }
      })
    }
  })

  // 構造座位頻次與昵稱表
  const seatFrequency = new Map<number, { east: number; south: number; west: number }>()
  const playerMap = new Map<number, string>()
  seatData.forEach(r => {
    seatFrequency.set(r.account_id, {
      east: r.east || 0,
      south: r.south || 0,
      west: r.west || 0
    })
    playerMap.set(r.account_id, r.mahjong_username || `ID:${r.account_id}`)
  })

  const getPairFreq = (p1: number, p2: number) => {
    return playerFrequency.get(getPairKey(p1, p2)) || 0
  }

  // ★★★ 改造點 3：在生成組合前洗牌，打破同等成本下的確定性平局！★★★
  const shuffledAccountIds = shuffle(accountIds)

  // 3. 計算 3 人組合與 L6 範數懲罰
  const allTriplets = getTriplets(shuffledAccountIds)
  const numTriplets = shuffledAccountIds.length / 3

  const tripletCosts = allTriplets.map(triplet => {
    const [p1, p2, p3] = triplet as [number, number, number]
    const f1 = getPairFreq(p1, p2)
    const f2 = getPairFreq(p2, p3)
    const f3 = getPairFreq(p1, p3)
    // L6 範數，強力懲罰高頻重聚
    const cost = Math.pow(f1, 6) + Math.pow(f2, 6) + Math.pow(f3, 6)
    return { triplet, cost }
  })

  tripletCosts.sort((a, b) => a.cost - b.cost)

  // 4. 分支限界回溯演算法 (Branch & Bound Backtracking)
  let bestCost = Infinity
  let selectedTriplets: [number, number, number][] = []

  function backtrack(
    usedPlayers: Set<number>,
    currentTriplets: [number, number, number][],
    currentCost: number,
    startIndex: number
  ) {
    const remaining = numTriplets - currentTriplets.length
    if (remaining === 0) {
      if (currentCost < bestCost) {
        bestCost = currentCost
        selectedTriplets = [...currentTriplets]
      }
      return
    }

    for (let i = startIndex; i < tripletCosts.length; i++) {
      const item = tripletCosts[i]
      if (!item) continue

      if (currentCost + remaining * item.cost >= bestCost) {
        break
      }

      const [p1, p2, p3] = item.triplet as [number, number, number]
      if (!usedPlayers.has(p1) && !usedPlayers.has(p2) && !usedPlayers.has(p3)) {
        usedPlayers.add(p1); usedPlayers.add(p2); usedPlayers.add(p3)
        currentTriplets.push([p1, p2, p3])

        backtrack(usedPlayers, currentTriplets, currentCost + item.cost, i + 1)

        currentTriplets.pop()
        usedPlayers.delete(p1); usedPlayers.delete(p2); usedPlayers.delete(p3)
      }
    }
  }

  backtrack(new Set(), [], 0, 0)

  // ★★★ 改造點 4：持久化本輪選中的三元組！立刻成為下一輪的避碰約束 ★★★
  if (selectedTriplets.length > 0) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    await Promise.all([
      // 寫入本輪
      supabase.schema('mahjong').from('recent_pairings').insert({
        channel_id: channelId,
        triplets: selectedTriplets
      }),
      // 順手把 1 天前的陳年廢紙清理掉，資料表永遠只有幾十行，乾淨無比
      supabase.schema('mahjong').from('recent_pairings').delete().lt('created_at', oneDayAgo)
    ])
  }

  // 5. 座位均衡分配與雙通道輸出構造
  const matchResults: string[] = []
  const pureClipboardRows: string[] = []

  selectedTriplets.forEach((triplet, idx) => {
    const perms = getPermutations3(triplet)
    
    let minSeatCost = Infinity
    let bestPerm = perms[0]!

    perms.forEach(perm => {
      let cost = 0
      perm.forEach((pid, seatIdx) => {
        const seatName = SEATS[seatIdx]!
        const counts = seatFrequency.get(pid) || { east: 0, south: 0, west: 0 }
        cost += Math.pow(counts[seatName], 2)
      })
      if (cost < minSeatCost) {
        minSeatCost = cost
        bestPerm = perm
      }
    })

    const names = bestPerm.map(pid => playerMap.get(pid) || `Unknown_${pid}`)
    
    const exportIds = isAccountMode 
      ? bestPerm 
      : bestPerm.map(acc2friend)

    // 真實牌譜碰撞頻次 (扣除本場虛擬疊加的 +20，給人類看真實次數)
    const [p1, p2, p3] = bestPerm
    const rawF1 = getPairFreq(p1, p2) % 20
    const rawF2 = getPairFreq(p2, p3) % 20
    const rawF3 = getPairFreq(p1, p3) % 20

    // 通道 A: 人類核對用富文本卡片
    matchResults.push(
      `🀄 **桌次 #${idx + 1}**\n` +
      `> 東家: **${names[0]}** (\`${exportIds[0]}\`)\n` +
      `> 南家: **${names[1]}** (\`${exportIds[1]}\`)\n` +
      `> 西家: **${names[2]}** (\`${exportIds[2]}\`)\n` +
      `> *(歷史碰撞: {${rawF1}, ${rawF2},${rawF3}})*`
    )

    // 通道 B: 外部表格粘貼專用純數字行
    pureClipboardRows.push(`${exportIds[0]},${exportIds[1]},${exportIds[2]}`)
  })

  // 6. 終極報文拼裝
  const content = 
    `🎲 **三麻均衡隨機分桌完成** (${isAccountMode ? '帳號 ID 模式' : '好友碼模式'}，共 ${rawNumbers.length} 人，${numTriplets} 桌)：\n\n` +
    matchResults.join('\n\n') +
    `\n\n📋 **外部主表格粘貼專用 (點擊右上角複製)：**\n\`\`\`text\n${pureClipboardRows.join('\n')}\n\`\`\``

  return {
    type: 4,
    data: { content }
  }
}