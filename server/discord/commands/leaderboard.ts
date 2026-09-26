// server/discord/commands/leaderboard.ts
import type { H3Event } from 'h3'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function handleLeaderboardCommand(interaction: any, event: H3Event) {
  // ★ 嚴格獲取呼叫者字串 ID
  const callerId = String(interaction.member?.user?.id || interaction.user?.id || '')
  const subCommand = interaction.data?.options?.[0]?.name
  const subOptions = interaction.data?.options?.[0]?.options || []

  if (subCommand === 'curse') {
    const inputYear = subOptions.find((o: any) => o.name === 'year')?.value
    const mode = subOptions.find((o: any) => o.name === 'mode')?.value || 'count'
    const queryYear = inputYear || new Date().getFullYear()
    const supabase = getSupabase()
    const isRatio = mode === 'ratio'

    // -----------------------------------------------------------
    // 1. 精準拉取前 10 名 (資料庫層面只拿 10 條，零記憶體浪費)
    // -----------------------------------------------------------
    let topQuery = supabase
      .schema('trpg')
      .from('curse_stats')
      .select('user_id, username, count, total_messages')
      .eq('year', queryYear)

    let top10: any[] = []

    if (isRatio) {
      // 比率模式：設定至少發言 5 條的底線門檻
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

    if (top10.length === 0) {
      return {
        type: 4,
        data: { content: `📊 **${queryYear} 年度口吐芬芳排行榜** 尚無統計數據！` }
      }
    }

    // 格式化前 10 名輸出
    const rankLines = top10.map((item, idx) => {
      const name = item.username || `用戶_${String(item.user_id).slice(-4)}`
      if (isRatio) {
        const pct = item.total_messages > 0 ? ((item.count / item.total_messages) * 100).toFixed(2) : '0.00'
        return `#${idx + 1} **${name}**\n口吐芬芳百分比: \`${pct}%\` (${item.count}/${item.total_messages})`
      } else {
        return `#${idx + 1} **${name}**\n口吐芬芳次數: \`${item.count}\` 次`
      }
    })

    // -----------------------------------------------------------
    // 2. ★ 核心好品味：獨立精準查詢發起者個人數據 (消滅記憶體截斷與精度遺失)
    // -----------------------------------------------------------
    let personalRankBlock = ''
    
    const { data: myData } = await supabase
      .schema('trpg')
      .from('curse_stats')
      .select('user_id, username, count, total_messages')
      .eq('year', queryYear)
      .eq('user_id', callerId) // 純字串匹配，無懈可擊！
      .maybeSingle()

    if (myData && myData.count > 0) {
      let myRank = 1

      if (!isRatio) {
        // 次數模式：算有多少人 count 比我更高
        const { count: higherCount } = await supabase
          .schema('trpg')
          .from('curse_stats')
          .select('*', { count: 'exact', head: true })
          .eq('year', queryYear)
          .gt('count', myData.count)

        myRank = (higherCount || 0) + 1
        personalRankBlock = `\n\n--- **你的排名** ---\n第 **${myRank}** 名\n次數: \`${myData.count}\`  總訊息: \`${myData.total_messages}\``
      } else {
        // 百分比模式：算我的排位
        const myRate = myData.total_messages > 0 ? myData.count / myData.total_messages : 0
        const myPct = (myRate * 100).toFixed(2)

        // 檢查在所有合規者中有多少人比率比我高
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
      personalRankBlock = `\n\n--- **你的排名** ---\n未入榜 (你今年尚未在監控頻道發表帶有口吐芬芳的訊息)`
    }

    const title = isRatio
      ? `📊 口吐芬芳 百分比排行榜 (${queryYear})`
      : `📊 口吐芬芳 次數排行榜 (${queryYear})`

    return {
      type: 4,
      data: {
        embeds: [{
          title,
          description: rankLines.join('\n\n') + personalRankBlock,
          color: isRatio ? 0x3498DB : 0x2ECC71,
          footer: {
            text: `更新時間: ${new Date().toISOString().replace('T', ' ').slice(0, 19)} · 每年 1 月 1 日重置`
          }
        }]
      }
    }
  }

  return {
    type: 4,
    data: { content: `⚠️ 未知的排行榜類型：\`${subCommand}\``, flags: 64 }
  }
}