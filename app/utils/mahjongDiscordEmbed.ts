// app/utils/mahjongDiscordEmbed.ts

export interface LeaderboardEntry {
  rank: number | string
  player?: string
  name?: string
  team_name?: string
  total_pts?: number
  total?: number
}

interface TournamentEmbedInput {
  title: string
  format: string
  matchUrl: string
  imageUrl?: string
  // 传入的原始排行榜数据
  leaderboard?: LeaderboardEntry[]
}

export function buildTournamentDiscordEmbed(input: TournamentEmbedInput) {
  const medals = ['🥇', '🥈', '🥉', '4位']

  // 1. 过滤：只提取具有合法数字名次（排除 DNF / 未完赛）的前 4 位实体
  const validLeaders = (input.leaderboard || [])
    .filter((entry) => typeof entry.rank === 'number')
    .slice(0, 4)

  // 2. 根据数据状态决定正文文本（数据驱动，零特殊条件分支）
  let bodyMarkdown: string

  if (validLeaders.length > 0) {
    const leaderLines = validLeaders.map((entry, idx) => {
      const medal = medals[idx] || `#${entry.rank}`       
      const name = entry.player || entry.name || entry.team_name || '未知選手'       
      const rawScore = entry.total_pts ?? entry.total ?? 0       
      const scoreStr = rawScore > 0 ? `+${rawScore.toFixed(1)}` : rawScore.toFixed(1)
      return `${medal} **${name}** ⎯ \`${scoreStr} pt\``
    }).join('\n')

    bodyMarkdown = `賽事模式：**${input.format}**\n\n**【當前領跑榜】**\n${leaderLines}`
  } else {
    // 优雅降级：比赛未开始或全员处于 DNF 门槛期
    bodyMarkdown = `賽事模式：**${input.format}**\n點擊下方按鈕直接查看即時排行榜、選手戰績與牌譜。`
  }

  return {
    component: {
      type: 17,
      accent_color: 5011302, // #4C7766 林间墨绿
      spoiler: false,
      components: [
        {
          type: 9, // Section 块
          components: [
            {
              type: 10,
              content: `# ${input.title}\n${bodyMarkdown}`
            }
          ],
          ...(input.imageUrl
            ? {
                accessory: {
                  type: 11,
                  media: {
                    url: input.imageUrl
                  }
                }
              }
            : {})
        },
        {
          type: 14,
          spacing: 1,
          divider: true
        },
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 5,
              label: '查看完整數據',
              emoji: { name: '🏆' },
              url: input.matchUrl
            },
            {
              type: 2,
              style: 5,
              label: '日麻主頁',
              emoji: { name: '🀄' },
              url: 'https://forestwork.vercel.app/games/mahjongsoul'
            },
            {
              type: 2,
              style: 5,
              label: '林間官網',
              emoji: { name: '🌲' },
              url: 'https://forestwork.vercel.app'
            }
          ]
        }
      ]
    }
  }
}