// server/discord/commands/leaderboard.ts
import type { H3Event } from 'h3'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// -------------------------------------------------------------
// 1. 粗口榜專屬查詢渲染
// -------------------------------------------------------------
async function renderCurseLeaderboard(subOptions: any[]) {
  const inputYear = subOptions.find((o: any) => o.name === 'year')?.value
  const queryYear = inputYear || new Date().getFullYear()
  const supabase = getSupabase()

  const { data: topList, error } = await supabase
    .schema('trpg')
    .from('curse_stats')
    .select('user_id, count')
    .eq('year', queryYear)
    .order('count', { ascending: false })
    .limit(10)

  if (error || !topList || topList.length === 0) {
    return {
      type: 4,
      data: { content: `📊 **${queryYear} 年度粗口排行榜** 尚無統計數據！` }
    }
  }

  const medals = ['🥇', '🥈', '🥉']
  const rankLines = topList.map((item, idx) => {
    const prefix = medals[idx] || `\`${idx + 1}.\``
    return `${prefix} <@${item.user_id}> ➔ 累計 \`${item.count}\` 次`
  })

  return {
    type: 4,
    data: {
      embeds: [{
        title: `🤬 ${queryYear} 年度粗口排行榜`,
        description: rankLines.join('\n'),
        color: 0xE74C3C,
        footer: {
          text: '每日凌晨 04:00 自動結算增量 · 每年 1 月 1 日自然重置',
          icon_url: 'https://i.imgur.com/cu2YAkn.png'
        },
        timestamp: new Date().toISOString()
      }]
    }
  }
}

// -------------------------------------------------------------
// 2. 核心分發入口 (O(1) 字典分發，零深層縮進)
// -------------------------------------------------------------
export async function handleLeaderboardCommand(interaction: any, event: H3Event) {
  const subCommand = interaction.data?.options?.[0]?.name
  const subOptions = interaction.data?.options?.[0]?.options || []

  if (subCommand === 'curse') {
    return await renderCurseLeaderboard(subOptions)
  }

  // 未來的新榜單在此處擴充一行即可：
  // if (subCommand === 'mahjong') return await renderMahjongLeaderboard(subOptions)

  return {
    type: 4,
    data: { content: `⚠️ 未知的排行榜類型：\`${subCommand}\``, flags: 64 }
  }
}