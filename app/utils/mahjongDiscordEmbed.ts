// app/utils/mahjongDiscordEmbed.ts
interface TournamentEmbedInput {
  title: string
  description: string
  matchUrl: string
  imageUrl?: string
}

export function buildTournamentDiscordEmbed(input: TournamentEmbedInput) {
  return {
    component: {
      type: 17, // 主容器 Container
      accent_color: 5011302, // #4C7766 (林间墨绿)
      spoiler: false,
      components: [
        {
          type: 9, // ★ 核心：Section 块必须作为容器的合法子级
          components: [
            {
              type: 10, // Text 必须在 Section 内部
              content: `# ${input.title}\n${input.description}`
            }
          ],
          // 缩略图必须作为 Section 的 accessory 存在
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
          type: 14, // Divider
          spacing: 1,
          divider: true
        },
        {
          type: 1, // Action Row
          components: [
            {
              type: 2,
              style: 5, // Link Button
              label: '查看賽事排行榜',
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