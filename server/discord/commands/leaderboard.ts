// server/discord/commands/leaderboard.ts
import type { H3Event } from 'h3'
import { getSupabase } from '../../utils/supabase'

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
  const { data: topList, error } = await supabase.schema('trpg').rpc('get_quaso_leaderboard', {
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
        // icon_url: 'https://i.imgur.com/cu2YAkn.png'
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

  if (subCommand === 'skill') {
    const inputModule = subOptions.find((o: any) => o.name === 'module')?.value
    const targetModuleId = inputModule ? Number(inputModule) : 1
    const payload = await renderSkillLeaderboardPayload(targetModuleId, callerId)
    return {
      type: 4, // 初始回應用戶
      data: payload
    }
  }

  return {
    type: 4,
    data: { content: `⚠️ 未知的排行榜類型：\`${subCommand}\``, flags: 64 }
  }
}


// -------------------------------------------------------------
// 3. 技能評定 10 槽位元數據契約
// -------------------------------------------------------------
interface SkillModuleMeta {
  id: number
  title: string
  code: string
  category: string
  emoji: string
  color: number
  status: 'ready' | 'locked'
}

const SKILL_MODULES: Record<number, SkillModuleMeta> = {
  1: { id: 1, title: '01. PRECISION', code: 'MOD_AIM_01', category: 'TARGET ACQUISITION', emoji: '🎯', color: 0x10B981, status: 'ready' },
  2: { id: 2, title: '02. DUAL AXIS', code: 'MOD_CTRL_02', category: 'MOTOR COORDINATION', emoji: '🎮', color: 0x38BDF8, status: 'ready' },
  3: { id: 3, title: '03. TRAIL LINK', code: 'MOD_SCAN_03', category: 'COGNITIVE SEQUENCE', emoji: '🔢', color: 0xFACC15, status: 'ready' },
  4: { id: 4, title: '04. ODD PAIR', code: 'MOD_PERC_04', category: 'ANOMALY DETECTION', emoji: '🧩', color: 0xF43F5E, status: 'ready' },
  5: { id: 5, title: '05. REACTION', code: 'MOD_REACT_05', category: 'REFLEX KINETICS', emoji: '⚡', color: 0xA855F7, status: 'ready' },
  6: { id: 6, title: '06. APEX TRACK', code: 'MOD_TRACK_06', category: 'DYNAMIC PURSUIT', emoji: '📈', color: 0xEC4899, status: 'ready' },
  7: { id: 7, title: '07. BUFFER FLUSH', code: 'SYS_LOCK_07', category: 'MEMORY CAPACITY', emoji: '🔒', color: 0x52525B, status: 'locked' },
  8: { id: 8, title: '08. PIANO CADENCE', code: 'MOD_TILES_08', category: 'FOUR-LANE CADENCE', emoji: '🎹', color: 0x52525B, status: 'ready' },
  9: { id: 9, title: '09. CHRONO TAP', code: 'MOD_CPS_09', category: 'TEMPORAL CADENCE', emoji: '🔥', color: 0x06B6D4, status: 'ready' },
  10: { id: 10, title: '10. OVERCLOCK', code: 'SYS_LOCK_10', category: 'LIMITER BREAKTHROUGH', emoji: '🔒', color: 0x52525B, status: 'locked' }
}

/**
 * 構造雙排互動組件：Row 1 下拉選單 + Row 2 Activity 原生啟動按鈕
 */
export function buildSkillLeaderboardComponents(currentModuleId: number) {
  const clientId = process.env.DISCORD_CLIENT_ID || process.env.DISCORD_APPLICATION_ID || '311484597248720907'
  
  // 1. 構造 10 槽位下拉選單選項
  const options = Object.values(SKILL_MODULES).map(m => ({
    label: `${m.title} // ${m.category}`,
    value: String(m.id),
    description: m.status === 'locked' ? '【SYS_LOCK】模組鎖定整備中' : `查看該科目全球前 10 強天梯排行`,
    emoji: { name: m.emoji },
    default: m.id === currentModuleId
  }))

  return [
    // ActionRow 1: 下拉選單切換科目
    {
      type: 1,
      components: [
        {
          type: 3, // STRING_SELECT
          custom_id: 'leaderboard_skill_switch',
          placeholder: '⚡ 點擊切換 10 槽位評定科目...',
          options
        }
      ]
    },
    // ActionRow 2: Discord Activity 原生直通按鈕 (Link Button)
    {
      type: 1,
      components: [
        {
          type: 2, // BUTTON
          style: 5, // LINK
          label: '🚀 啟動 Discord 靶場 (Launch Activity)',
          url: `https://discord.com/activities/${clientId}`
        },
        {
          type: 2,
          style: 5,
          label: '🌐 Web 備用入口',
          url: 'https://forestwork.vercel.app/activities/skill-test'
        }
      ]
    }
  ]
}

/**
 * 核心渲染純函數：拉取該科目全球前 10 榜單與查詢者個人 PB
 */
export async function renderSkillLeaderboardPayload(moduleId: number, viewerId: string) {
  const mod = SKILL_MODULES[moduleId] || SKILL_MODULES[1]!
  const supabase = getSupabase()

  // 1. 若為鎖定模組，直接給出斯巴達式安全告知
  if (mod.status === 'locked') {
    return {
      embeds: [{
        title: `${mod.emoji} ${mod.title} // ${mod.category}`,
        description: `🔒 **【SYS_LOCK // 機密限制】**\n\n該科目核心物理矩陣正在整備調試中，尚未向外場操作員開放。\n請切換至其他就緒模組進行評定。`,
        color: mod.color,
        footer: { text: 'ForestWork // Tactical Benchmark Matrix' }
      }],
      components: buildSkillLeaderboardComponents(mod.id)
    }
  }

  // 2. 查詢該科目全服排名前 10 戰績
  const { data: topList, error } = await supabase
    .schema('trpg')
    .from('v_skill_leaderboard')
    .select('global_rank, discord_id, operator_name, score, rating, created_at')
    .eq('module_id', mod.id)
    .order('global_rank', { ascending: true })
    .limit(10)

  let rankContent = ''
  if (error || !topList || topList.length === 0) {
    rankContent = `// 該科目暫無評定記錄 · 等待首位特工登頂`
  } else {
    const medals = ['🥇', '🥈', '🥉']
    rankContent = topList.map(item => {
      const prefix = medals[item.global_rank - 1] || `\`#${item.global_rank}\``
      return `${prefix} **${item.operator_name}** ➔ \`${item.score.toLocaleString()}\` PTS \`[${item.rating}]\``
    }).join('\n')
  }

  // 3. 查詢當前呼叫者在該科目的個人歷史最佳戰績 (PB)
  let personalBlock = ''
  if (viewerId) {
    let myRank: number | null = null
    let myScore: number | null = null
    let myRating: string = 'COMBAT READY'

    // ① 第一優先：如果在剛剛拉取的前 10 強中，直接內存命中！0 次額外網路請求！
    const inTopEntry = topList?.find(item => String(item.discord_id) === String(viewerId))
    if (inTopEntry) {
      myRank = inTopEntry.global_rank
      myScore = inTopEntry.score
      myRating = inTopEntry.rating || 'COMBAT READY'
    } 
    // ② 第二優先：若未進入前 10 強，直接向 v_skill_leaderboard 單表反查該選手的全服權威位次
    else {
      const { data: myRankEntry, error: rankErr } = await supabase
        .schema('trpg')
        .from('v_skill_leaderboard')
        .select('global_rank, score, rating')
        .eq('module_id', mod.id)
        .eq('discord_id', String(viewerId))
        .maybeSingle()

      if (rankErr) {
        console.error('[-] 個人戰術檔案反查異常:', rankErr.message)
      } else if (myRankEntry) {
        myRank = myRankEntry.global_rank
        myScore = myRankEntry.score
        myRating = myRankEntry.rating || 'COMBAT READY'
      }
    }

    // 格式化輸出個人檔案
    if (myScore !== null && myRank !== null) {
      personalBlock = [
        '',
        '--- **你的戰術檔案 // PERSONAL RECORD** ---',
        `個人最佳: \`${myScore.toLocaleString()} PTS\` · 全服位次: **#${myRank}** \`[${myRating}]\``
      ].join('\n')
    } else {
      personalBlock = [
        '',
        '--- **你的戰術檔案 // PERSONAL RECORD** ---',
        `尚未完成該科目評定 · 點擊下方按鈕啟動 Activity 開始測試！`
      ].join('\n')
    }
  }

  return {
    embeds: [{
      title: `${mod.emoji} ${mod.title} // ${mod.category}`,
      description: rankContent + (personalBlock ? '\n' + personalBlock : ''),
      color: mod.color,
      fields: [
        {
          name: '科目代號',
          value: `\`${mod.code}\``,
          inline: true
        },
        {
          name: '狀態標籤',
          value: '`DEPLOYABLE`',
          inline: true
        }
      ],
      footer: {
        text: 'ForestWork // Skill Sandbox · 點擊下方按鈕直接啟動 Activity'
      },
      timestamp: new Date().toISOString()
    }],
    components: buildSkillLeaderboardComponents(mod.id)
  }
}