// scripts/recalculate-mr.ts
import { createClient } from '@supabase/supabase-js'

// ★ 核心修復：使用 Node.js 原生內建方法加載 .env，徹底揚掉 dotenv！
try {
  process.loadEnvFile()
} catch {
  // 若已通過命令行注入或不存在 .env 則靜默放行
}

const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('缺少 SUPABASE 環境變數！')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ==========================================
// 1. 三麻天鳳桌均 Elo 核心算子
// ==========================================
const BASE_POINTS = { 1: 15, 2: 0, 3: -15 } // 順位基準點

function calculateEloDelta(
  playerMr: number,
  tableAvgMr: number,
  rank: number,
  matchesPlayed: number
): number {
  const diff = tableAvgMr - playerMr
  const basePt = BASE_POINTS[rank as 1 | 2 | 3] || 0
  
  // 場次阻尼 (新手期加速收斂，老手期穩定防噪)
  let k = 1.0
  if (matchesPlayed < 30) k = 1.5
  else if (matchesPlayed >= 100) k = 0.8

  const delta = (basePt + (diff * 0.04)) * k
  return Number(delta.toFixed(1))
}

async function run() {
  // ★ 好品味核心：從命令列讀取目標年份，若未提供則預設只重算當前 2026 活躍賽季！
  const args = process.argv.slice(2)
  const argYear = args[0] ? Number(args[0]) : null

  // 如果敲 `npx tsx scripts/... --all` 則全量重放，否則只跑 2026
  const TARGET_YEARS = argYear 
    ? [argYear] 
    : (args.includes('--all') ? [2024, 2025, 2026] : [2026])

  console.log('🚀 開始執行 MR 歷史重放計算 (2024 ~ 2026)...')

  // 1. 抓取賽事字典，用於排除非常規賽事
  const { data: tourneys } = await supabase
    .schema('mahjong')
    .from('tournaments')
    .select('id, format, title')

  const tourneyMap = new Map((tourneys || []).map(t => [String(t.id).toLowerCase(), t]))

  // 2. 抓取所有合法的非空參賽者 ID
  const { data: participants } = await supabase
    .schema('mahjong')
    .from('participants')
    .select('account_id')
    .gt('account_id', 1)

  const allAccountIds = (participants || []).map(p => p.account_id)

  for (const year of TARGET_YEARS) {
    console.log(`\n================= 正在回放 ${year} 年度對局 =================`)

    // 每年 1 月 1 日全員重置回 1000 分
    const playerMrMap = new Map<number, number>()
    const playerMatchesCount = new Map<number, number>()
    allAccountIds.forEach(id => {
      playerMrMap.set(id, 1000)
      playerMatchesCount.set(id, 0)
    })

    // 抓取該年度的所有三麻對局，按時間正序 (ASC) 排列！
    const { data: matches, error } = await supabase
      .schema('mahjong')
      .from('matches')
      .select('id, uuid, start_time, east_id, east_score, south_id, south_score, west_id, west_score, tournament_bind_id, group_tag')
      .is('north_id', null) // 嚴格三麻
      .gte('start_time', `${year}-01-01T00:00:00Z`)
      .lte('start_time', `${year}-12-31T23:59:59Z`)
      .order('start_time', { ascending: true })

    if (error) {
      console.error(`拉取 ${year} 對局失敗:`, error.message)
      continue
    }

    // ★★★ 核心過濾：只保留常規三麻對局 ★★★
    const regularMatches = (matches || []).filter(m => {
      // 1. 排除接力賽與分組賽
      const tourney = tourneyMap.get(String(m.tournament_bind_id || '').toLowerCase())
      if (tourney?.format === 'relay' || (m.group_tag && String(m.group_tag).trim() !== '')) {
        return false
      }
      // 2. 排除特殊娛樂盃賽 (如數番盃、役滿盃)
      if (tourney?.title && (tourney.title.includes('數番') || tourney.title.includes('役滿盃'))) {
        return false
      }
      // 3. 排除含有電腦人機 (account_id <= 1) 的對局
      if (!m.east_id || m.east_id <= 1 || !m.south_id || m.south_id <= 1 || !m.west_id || m.west_id <= 1) {
        return false
      }
      return true
    })

    console.log(`${year} 年共有 ${matches?.length || 0} 場對局，其中正規對局: ${regularMatches.length} 場`)

    // 時序重放演算法
    regularMatches.forEach(m => {
      const seats = [
        { id: m.east_id, score: m.east_score },
        { id: m.south_id, score: m.south_score },
        { id: m.west_id, score: m.west_score }
      ].sort((a, b) => b.score - a.score)

      // 桌均 MR
      const mr1 = playerMrMap.get(seats[0].id) || 1000
      const mr2 = playerMrMap.get(seats[1].id) || 1000
      const mr3 = playerMrMap.get(seats[2].id) || 1000
      const tableAvg = (mr1 + mr2 + mr3) / 3

      // 更新每位選手
      seats.forEach((p, idx) => {
        const currentMr = playerMrMap.get(p.id) || 1000
        const played = playerMatchesCount.get(p.id) || 0
        const delta = calculateEloDelta(currentMr, tableAvg, idx + 1, played)

        playerMrMap.set(p.id, Math.round(currentMr + delta))
        playerMatchesCount.set(p.id, played + 1)
      })
    })

    // 歸檔該年度有參賽記錄的選手 (played > 0)
    const activePlayerUpdates: any[] = []
    playerMatchesCount.forEach((played, accountId) => {
      if (played > 0) {
        activePlayerUpdates.push({
          account_id: accountId,
          year,
          mr_points: playerMrMap.get(accountId) || 1000,
          matches_played: played
        })
      }
    })

    if (activePlayerUpdates.length > 0) {
      const { error: upsertErr } = await supabase
        .schema('mahjong')
        .from('player_yearly_mr')
        .upsert(activePlayerUpdates, { onConflict: 'account_id, year' })

      if (upsertErr) console.error(`寫入 ${year} 年度歸檔失敗:`, upsertErr.message)
      else console.log(`✅ 成功歸檔 ${year} 年度 ${activePlayerUpdates.length} 位選手的結算 MR！`)
    }
  }

  console.log('\n🎉 全量 MR 計算與歸檔全部完成！')
}

run()