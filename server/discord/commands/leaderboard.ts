// server/discord/commands/leaderboard.ts
import type { H3Event } from 'h3'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

/**
 * 構造單一複合下拉選單 ActionRow (好品味：狀態自包含，當前選中項自動高亮 default: true)
 */
export function buildCurseLeaderboardComponents(currentYear: number, currentMode: 'count' | 'ratio') {
  // 可擴充的歷史年份清單 (乾淨線性，可輕鬆排到 2020 年)
  const availableYears = [2026, 2025, 2024, 2023, 2022, 2021, 2020]

  return [
    // ---------------------------------------------------------
    // Row 0: 模式切換下拉選單 (custom_id 攜帶當前年份)
    // ---------------------------------------------------------
    {
      type: 1, // ACTION_ROW
      components: [
        {
          type: 3, // STRING_SELECT
          custom_id: `curse_switch_mode:${currentYear}`,
          placeholder: '📊 選擇統計維度 (次數榜 / 濃度百分比)...',
          options: [
            {
              label: '口吐芬芳次數榜',
              value: 'count',
              description: '按累計粗口總次數由高到低排名',
              emoji: { name: '🔢' },
              default: currentMode === 'count'
            },
            {
              label: '芬芳濃度百分比榜',
              value: 'ratio',
              description: '按粗口佔發言總量之百分比排名 (低門檻防噪)',
              emoji: { name: '📈' },
              default: currentMode === 'ratio'
            }
          ]
        }
      ]
    },
    // ---------------------------------------------------------
    // Row 1: 年份切換下拉選單 (custom_id 攜帶當前模式)
    // ---------------------------------------------------------
    {
      type: 1, // ACTION_ROW
      components: [
        {
          type: 3, // STRING_SELECT
          custom_id: `curse_switch_year:${currentMode}`,
          placeholder: '📅 選擇統計年度...',
          options: availableYears.map(year => ({
            label: `${year} 年度數據`,
            value: String(year),
            description: year === 2026 ? '當前活躍統計年度 (進行中)' : `${year} 歷史歸檔數據`,
            emoji: { name: year === 2026 ? '⚡' : '🏛️' },
            default: year === currentYear
          }))
        }
      ]
    }
  ]
}

/**
 * 核心渲染純函數：傳入 (年份, 模式, 觀察者ID)，產出 (Embed + Components)
 */
export async function renderCurseLeaderboardPayload(
  queryYear: number,
  mode: 'count' | 'ratio',
  viewerId: string
) {
  const supabase = getSupabase()
  const isRatio = mode === 'ratio'

  // 1. 精準拉取前 10 名
  let topQuery = supabase
    .schema('trpg')
    .from('curse_stats')
    .select('user_id, username, count, total_messages')
    .eq('year', queryYear)

  let top10: any[] = []

  if (isRatio) {
    const { data: ratioData } = await topQuery
      .gte('total_messages', 5)
      .order('count', { ascending: false })
      .limit(50)

    if (ratioData) {
      top10 = [...ratioData]
        .sort((a, b) => {
          const rA = a.total_messages > 0 ? a.count / a.total_messages : 0
          const rB = b.total_messages > 0 ? b.count / b.total_messages : 0
          return rB - rA
        })
        .slice(0, 10)
    }
  } else {
    const { data: countData } = await topQuery
      .order('count', { ascending: false })
      .limit(10)
    top10 = countData || []
  }

  // 構造前 10 名文本
  let rankContent = ''
  if (top10.length === 0) {
    rankContent = `📊 **${queryYear} 年度口吐芬芳排行榜** 尚無統計數據！`
  } else {
    rankContent = top10.map((item, idx) => {
      const name = item.username || `用戶_${String(item.user_id).slice(-4)}`
      if (isRatio) {
        const pct = item.total_messages > 0 ? ((item.count / item.total_messages) * 100).toFixed(2) : '0.00'
        return `#${idx + 1} **${name}**\n口吐芬芳百分比: \`${pct}%\` (${item.count}/${item.total_messages})`
      } else {
        return `#${idx + 1} **${name}**\n口吐芬芳次數: \`${item.count}\` 次`
      }
    }).join('\n\n')
  }

  // 2. 獨立查詢當前操作者的個人戰績
  let personalRankBlock = ''
  const { data: myData } = await supabase
    .schema('trpg')
    .from('curse_stats')
    .select('user_id, username, count, total_messages')
    .eq('year', queryYear)
    .eq('user_id', viewerId)
    .maybeSingle()

  if (myData && myData.count > 0) {
    let myRank = 1
    if (!isRatio) {
      const { count: higherCount } = await supabase
        .schema('trpg')
        .from('curse_stats')
        .select('*', { count: 'exact', head: true })
        .eq('year', queryYear)
        .gt('count', myData.count)

      myRank = (higherCount || 0) + 1
      personalRankBlock = `\n\n--- **你的排名** ---\n第 **${myRank}** 名\n次數: \`${myData.count}\`  總訊息: \`${myData.total_messages}\``
    } else {
      const myRate = myData.total_messages > 0 ? myData.count / myData.total_messages : 0
      const myPct = (myRate * 100).toFixed(2)

      const { data: allRatio } = await supabase
        .schema('trpg')
        .from('curse_stats')
        .select('count, total_messages')
        .eq('year', queryYear)
        .gte('total_messages', 5)

      if (allRatio) {
        const higher = allRatio.filter(r => (r.count / r.total_messages) > myRate).length
        myRank = higher + 1
      }
      personalRankBlock = `\n\n--- **你的排名** ---\n第 **${myRank}** 名\n百分比: \`${myPct}%\`  次數: \`${myData.count}/${myData.total_messages}\``
    }
  } else {
    personalRankBlock = `\n\n--- **你的排名** ---\n未入榜 (閣下在 ${queryYear} 年尚未在監控頻道發表帶有口吐芬芳的訊息)`
  } const title = isRatio ? `📊 口吐芬芳 百分比排行榜 (${queryYear})`
    : `📊 口吐芬芳 次數排行榜 (${queryYear})`
  return {
    embeds: [{
      title, description: rankContent + personalRankBlock, color: isRatio ? 0x3498DB : 0x2ECC71, footer: {
        text: `更新時間: ${new Date().toISOString().replace('T', ' ').slice(0, 19)} · 每年 1 月 1 日重置`
      }
    }],
    components: buildCurseLeaderboardComponents(queryYear, mode)
  }
}

/**
 * 構造 Quaso 排行榜專用下拉選單
 */
export function buildQuasoLeaderboardComponents(currentMode: 'received' | 'sent') {
  return [
    {
      type: 1, // ACTION_ROW
      components: [
        {
          type: 3, // STRING_SELECT
          custom_id: 'leaderboard_quaso_switch',
          placeholder: '⚡ 點擊切換 Quaso 排行榜模式...',
          options: [
            {
              label: '🥐 團寵人氣榜 (收到最多)',
              value: 'received',
              description: '查看全伺服器累計獲得最多 Quaso 的人氣王',
              emoji: { name: '🥐' },
              default: currentMode === 'received'
            },
            {
              label: '✨ 大善人奉獻榜 (送出最多)',
              value: 'sent',
              description: '查看最慷慨分享 Quaso 的大善人',
              emoji: { name: '✨' },
              default: currentMode === 'sent'
            }
          ]
        }
      ]
    }
  ]
}

/**
 * 渲染 Quaso 排行榜 Payload (純函數)
 */
export async function renderQuasoLeaderboardPayload(mode: 'received' | 'sent', viewerId: string) {
  const supabase = getSupabase()
  const isReceived = mode === 'received'

  // 1. 呼叫 Postgres 聚合 RPC 拿前 10 名
  const { data: topList, error } = await supabase.rpc('get_quaso_leaderboard', {
    p_mode: mode,
    p_limit: 10
  })

  let rankContent = ''
  if (error || !topList || topList.length === 0) {
    rankContent = `🥐 **Quaso ${isReceived ? '團寵人氣榜' : '大善人奉獻榜'}** 尚無統計數據！快使用右鍵選單投遞第一個 Quaso 吧！`
  } else {
    rankContent = topList.map((item: any, idx: number) => {
      const medals = ['🥇', '🥈', '🥉']
      const prefix = medals[idx] || `\`#${idx + 1}\``
      const name = item.username || `用戶_${String(item.user_id).slice(-4)}`
      const actionText = isReceived ? '累計收穫' : '慷慨送出'
      return `${prefix} **${name}** ➔ ${actionText} \`${item.total}\` 個 🥐`
    }).join('\n')
  }

  // 2. 獨立查詢發起者個人戰績與今日剩餘 Quaso 額度
  let personalBlock = ''
  
  // 查個人總量
  let personalTotal = 0
  if (isReceived) {
    const { data } = await supabase
      .schema('trpg')
      .from('quaso_transactions')
      .select('amount')
      .eq('receiver_id', viewerId)
    personalTotal = data?.reduce((acc, cur) => acc + cur.amount, 0) || 0
  } else {
    const { data } = await supabase
      .schema('trpg')
      .from('quaso_transactions')
      .select('amount')
      .eq('giver_id', viewerId)
    personalTotal = data?.reduce((acc, cur) => acc + cur.amount, 0) || 0
  }

  // 查今日剩餘額度
  const todayStr = new Date().toISOString().split('T')[0]
  const { data: todayRecords } = await supabase
    .schema('trpg')
    .from('quaso_transactions')
    .select('amount')
    .eq('giver_id', viewerId)
    .eq('give_date', todayStr)
  
  const todayUsed = todayRecords?.reduce((acc, cur) => acc + cur.amount, 0) || 0
  const remainingToday = Math.max(0, 3 - todayUsed)

  personalBlock = [
    '',
    '--- **你的 Quaso 檔案** ---',
    `個人累計: ${isReceived ? '獲得' : '送出'} \`${personalTotal}\` 個 🥐`,
    `今日可用額度: \`${remainingToday}/3\` 枚 (午夜 00:00 刷新)`
  ].join('\n')

  const title = isReceived ? '🥐 Quaso 團寵人氣排行榜 (收到最多)' : '✨ Quaso 大善人奉獻排行榜 (送出最多)'

  return {
    embeds: [{
      title,
      description: rankContent + '\n' + personalBlock,
      color: isReceived ? 0xE67E22 : 0xF1C40F,
      footer: {
        text: '林間小鎮 社交激勵系統 · 對成員右鍵點選「Apps ➔ 🥐 送 1 個 Quaso」即可投遞',
        icon_url: 'https://i.imgur.com/cu2YAkn.png'
      },
      timestamp: new Date().toISOString()
    }],
    components: buildQuasoLeaderboardComponents(mode)
  }
}

// -------------------------------------------------------------
// 3. 斜槓指令入口 (/leaderboard)
// -------------------------------------------------------------
export async function handleLeaderboardCommand(interaction: any, event: H3Event) {
  const callerId = String(interaction.member?.user?.id || interaction.user?.id || '')
  const subCommand = interaction.data?.options?.[0]?.name
  const subOptions = interaction.data?.options?.[0]?.options || []

  if (subCommand === 'curse') {
    const inputYear = subOptions.find((o: any) => o.name === 'year')?.value
    const inputMode = subOptions.find((o: any) => o.name === 'mode')?.value

    const queryYear = inputYear ? Number(inputYear) : new Date().getFullYear()
    const mode = inputMode === 'ratio' ? 'ratio' : 'count'

    const payload = await renderCurseLeaderboardPayload(queryYear, mode, callerId)

    return {
      type: 4, // 初始回應用戶：發送帶組件的新訊息
      data: payload
    }
  }
  if (subCommand === 'quaso') {
    const mode = subOptions.find((o: any) => o.name === 'mode')?.value || 'received'
    const payload = await renderQuasoLeaderboardPayload(mode, callerId)
    return { type: 4, data: payload }
  }

  return {
    type: 4,
    data: { content: `⚠️ 未知的排行榜類型：\`${subCommand}\``, flags: 64 }
  }
}