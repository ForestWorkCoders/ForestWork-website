// server/discord/commands/leaderboard.ts
import type { H3Event } from 'h3'
import { getSupabase } from '../../utils/supabase'

// -------------------------------------------------------------
// 共用排行榜 Embed：每個榜只提供資料，版面由這裡統一
// -------------------------------------------------------------
const BOARD_COLOR = 0x4C7766 // Forest Emerald
const BOARD_ICON = 'https://forestwork.vercel.app/android-chrome-192x192.png'
const RANK_EMOJI = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']

interface Leaderboard {
  title: string // 例：口吐芬芳 · 次數榜 · 2026
  scoreLabel: string // 每列分數前的標籤，例：次數
  rows: { name: string, score: string }[] // 前 10 名，分數已格式化
  empty: string // 沒有任何資料時的說明
  me: { rank: number | null, stats: [string, string][], unranked: string } | null // null = 不顯示個人區塊
  note: string // 頁尾：「<名稱> · <提示>」
}

// 名字放在欄位標題裡，跳脫 Markdown 符號免得變成粗體或刪除線
const escapeName = (name: string) => name.replace(/([\\*_~`|>])/g, '\\$1')

const displayName =(username: string | null | undefined, userId: unknown) =>
  username || `用戶_${String(userId).slice(-4)}`

export function buildLeaderboardEmbed(board: Leaderboard) {
  const fields = board.rows.map((row, i) => ({
    name: `${RANK_EMOJI[i] ?? `#${i + 1}`} ${escapeName(row.name)}`,
    value: `${board.scoreLabel}: ${row.score}`
  }))

  if (board.me) {
    fields.push({
      name: '--- 你的排名 ---',
      value: board.me.rank ? `第 ${board.me.rank} 名` : board.me.unranked
    })
    for (const [name, value] of board.me.stats) fields.push({ name, value })
  }

  return {
    title: `🏅【${board.title}】`,
    description: board.rows.length ? `以下是【${board.title}】的排名` : board.empty,
    color: BOARD_COLOR,
    fields,
    footer: { text: board.note, icon_url: BOARD_ICON },
    timestamp: new Date().toISOString()
  }
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
 * 口吐芬芳榜：次數榜，或百分比榜 (只算發言至少 5 則的人，免得 1 則就 100%)
 */
export async function renderCurseLeaderboardPayload(
  queryYear: number,
  mode: 'count' | 'ratio',
  viewerId: string
) {
  type Row = { user_id: string, username: string | null, count: number, total_messages: number }
  const isRatio = mode === 'ratio'
  const ratio = (r: Row) => (r.total_messages > 0 ? r.count / r.total_messages : 0)
  const pct = (r: Row) => `${(ratio(r) * 100).toFixed(2)}%`
  const value = isRatio ? ratio : (r: Row) => r.count

  // 一年約一百多人，整年一次拉完，排名、前 10 與個人都從同一份資料算
  const { data } = await getSupabase()
    .schema('trpg')
    .from('curse_stats')
    .select('user_id, username, count, total_messages')
    .eq('year', queryYear)
  const all: Row[] = data || []
  const pool = isRatio ? all.filter(r => r.total_messages >= 5) : all
  const ranked = [...pool].sort((a, b) => value(b) - value(a))

  const me = all.find(r => String(r.user_id) === String(viewerId) && r.count > 0)

  const board: Leaderboard = {
    title: `口吐芬芳 · ${isRatio ? '百分比榜' : '次數榜'} · ${queryYear}`,
    scoreLabel: isRatio ? '百分比' : '次數',
    rows: ranked.slice(0, 10).map(r => ({
      name: displayName(r.username, r.user_id),
      score: isRatio ? `\`${pct(r)}\` (${r.count}/${r.total_messages})` : `\`${r.count}\` 次`
    })),
    empty: `${queryYear} 年尚無統計數據！`,
    me: {
      // 只有在榜上的人才有名次：百分比榜不收發言未滿 5 則的人
      rank: me && pool.includes(me) ? pool.filter(r => value(r) > value(me)).length + 1 : null,
      stats: !me
        ? []
        : isRatio
          ? [['百分比', `\`${pct(me)}\``], ['次數', `\`${me.count}/${me.total_messages}\``]]
          : [['次數', `\`${me.count}\``], ['總訊息', `\`${me.total_messages}\``]],
      unranked: me
        ? '未入榜 (百分比榜只計算發言至少 5 則的成員)'
        : `未入榜 (閣下在 ${queryYear} 年尚未在監控頻道發表帶有口吐芬芳的訊息)`
    },
    note: '口吐芬芳統計 · 每年 1 月 1 日重置'
  }

  return {
    embeds: [buildLeaderboardEmbed(board)],
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
 * Quaso 榜：收到最多 (團寵) 或送出最多 (大善人)
 */
export async function renderQuasoLeaderboardPayload(mode: 'received' | 'sent', viewerId: string) {
  const supabase = getSupabase()
  const isReceived = mode === 'received'

  // 送過或收過 Quaso 的人只有幾十個：拉完整份，前 10、個人累計與排名都從這份算
  const { data } = await supabase.schema('trpg').rpc('get_quaso_leaderboard', {
    p_mode: mode,
    p_limit: 1000
  })
  const all: { user_id: string, username: string | null, total: number }[] = data || []
  const myTotal = Number(all.find(r => String(r.user_id) === String(viewerId))?.total ?? 0)

  // 今日剩餘額度
  const todayStr = new Date().toISOString().split('T')[0]
  const { data: todayRecords } = await supabase
    .schema('trpg')
    .from('quaso_transactions')
    .select('amount')
    .eq('giver_id', viewerId)
    .eq('give_date', todayStr)
  const todayUsed = todayRecords?.reduce((acc, cur) => acc + cur.amount, 0) || 0
  const remainingToday = Math.max(0, 3 - todayUsed)

  const board: Leaderboard = {
    title: `Quaso · ${isReceived ? '團寵人氣榜' : '大善人奉獻榜'}`,
    scoreLabel: isReceived ? '累計收穫' : '慷慨送出',
    rows: all.slice(0, 10).map(r => ({
      name: displayName(r.username, r.user_id),
      score: `\`${r.total}\` 個 🥐`
    })),
    empty: '尚無統計數據！快使用右鍵選單投遞第一個 Quaso 吧！',
    me: {
      rank: myTotal > 0 ? all.filter(r => Number(r.total) > myTotal).length + 1 : null,
      stats: [
        [isReceived ? '個人累計獲得' : '個人累計送出', `\`${myTotal}\` 個 🥐`],
        ['今日可用額度', `\`${remainingToday}/3\` 枚 (午夜 00:00 刷新)`]
      ],
      unranked: isReceived ? '未入榜 (尚未收到 Quaso)' : '未入榜 (尚未送出 Quaso)'
    },
    note: 'Quaso 社交激勵 · 對成員右鍵點選「Apps ➔ 🥐 送 1 個 Quaso」即可投遞'
  }

  return {
    embeds: [buildLeaderboardEmbed(board)],
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
 * 技能評定榜：該科目全服前 10 與查詢者的個人最佳 (PB)
 */
export async function renderSkillLeaderboardPayload(moduleId: number, viewerId: string) {
  const mod = SKILL_MODULES[moduleId] || SKILL_MODULES[1]!
  const title = `技能評定 · ${mod.emoji} ${mod.title} // ${mod.category}`
  const note = 'ForestWork 技能評定 · 點擊下方按鈕直接啟動 Activity'
  const components = buildSkillLeaderboardComponents(mod.id)

  // 鎖定模組：沒有排名，只有告知
  if (mod.status === 'locked') {
    const board: Leaderboard = {
      title,
      scoreLabel: '分數',
      rows: [],
      empty: '🔒 **【SYS_LOCK // 機密限制】**\n\n該科目核心物理矩陣正在整備調試中，尚未向外場操作員開放。\n請切換至其他就緒模組進行評定。',
      me: null,
      note
    }
    return { embeds: [buildLeaderboardEmbed(board)], components }
  }

  const supabase = getSupabase()
  const { data: topList } = await supabase
    .schema('trpg')
    .from('v_skill_leaderboard')
    .select('global_rank, discord_id, operator_name, score, rating, created_at')
    .eq('module_id', mod.id)
    .order('global_rank', { ascending: true })
    .limit(10)
  const top = topList || []

  // 個人 PB：在前 10 名裡就直接用，不在才單獨反查
  let mine: { global_rank: number, score: number, rating: string | null } | null = null
  if (viewerId) {
    mine = top.find(item => String(item.discord_id) === String(viewerId)) || null
    if (!mine) {
      const { data, error } = await supabase
        .schema('trpg')
        .from('v_skill_leaderboard')
        .select('global_rank, score, rating')
        .eq('module_id', mod.id)
        .eq('discord_id', String(viewerId))
        .maybeSingle()
      if (error) console.error('[-] 個人戰術檔案反查異常:', error.message)
      mine = data
    }
  }

  const board: Leaderboard = {
    title,
    scoreLabel: '分數',
    rows: top.map(item => ({
      name: displayName(item.operator_name, item.discord_id),
      score: `\`${item.score.toLocaleString()}\` PTS \`[${item.rating}]\``
    })),
    empty: '該科目暫無評定記錄 · 等待首位特工登頂',
    me: viewerId
      ? {
          rank: mine ? mine.global_rank : null,
          stats: mine
            ? [['個人最佳', `\`${mine.score.toLocaleString()} PTS\``], ['評級', `\`[${mine.rating || 'COMBAT READY'}]\``]]
            : [],
          unranked: '尚未完成該科目評定 · 點擊下方按鈕啟動 Activity 開始測試！'
        }
      : null,
    note
  }

  return { embeds: [buildLeaderboardEmbed(board)], components }
}
