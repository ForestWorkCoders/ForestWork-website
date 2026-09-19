import crypto from 'node:crypto'

export default defineEventHandler(async (event) => {
  const signature = getHeader(event, 'x-signature-ed25519')
  const timestamp = getHeader(event, 'x-signature-timestamp')
  const rawBody = await readRawBody(event)
  const publicKeyHex = process.env.DISCORD_PUBLIC_KEY

  if (!signature || !timestamp || !rawBody || !publicKeyHex) {
    throw createError({ statusCode: 401, statusMessage: 'Bad request signature' })
  }

  const publicKey = crypto.createPublicKey({
    key: Buffer.concat([
      Buffer.from('302a300506032b6570032100', 'hex'),
      Buffer.from(publicKeyHex, 'hex')
    ]),
    format: 'der',
    type: 'spki'
  })

  const isValid = crypto.verify(
    null,
    Buffer.from(timestamp + rawBody, 'utf-8'),
    publicKey,
    Buffer.from(signature, 'hex')
  )

  if (!isValid) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid request signature' })
  }

  const message = JSON.parse(rawBody)

  // 1. PING 握手响应
  if (message.type === 1) {
    setHeader(event, 'content-type', 'application/json')
    return { type: 1 }
  }

  // 2. 核心：返回与 dec.al 100% 同构的全新组件树结构
  setHeader(event, 'content-type', 'application/json')
  return {
    type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
    data: {
      embeds: [
        {
          type: 'components',
          url: 'https://forestwork.vercel.app/',
          id: '311484597248720907',
          components: [
            {
              type: 17, // 主容器 (Container)
              id: 1,
              accent_color: 5011302, // #4C7766 (林间墨绿)
              spoiler: false,
              components: [
                {
                  type: 9, // Section 块 (带右侧 accessory 附件)
                  components: [
                    {
                      type: 10, // Text 富文本
                      id: 3,
                      content: '# 林間小鎮 · ForestWork\n林間小鎮賽事歷史與社群活動中心。\n即時牌譜查閱、賽事積分追蹤與趣味同樂。'
                    }
                  ],
                  accessory: {
                    type: 11, // Thumbnail 媒体缩略图
                    id: 4,
                    description: 'ForestWork Mascot',
                    spoiler: false,
                    media: {
                      url: 'https://i.imgur.com/cu2YAkn.png',
                      content_type: 'image/png'
                    }
                  }
                },
                {
                  type: 14, // 分割线 (Divider)
                  id: 5,
                  spacing: 1,
                  divider: true
                },
                {
                  type: 1, // Action Row (按钮组外框)
                  id: 6,
                  components: [
                    {
                      type: 2,
                      id: 7,
                      style: 5,
                      label: '進入首頁',
                      emoji: { name: '🌲' },
                      url: 'https://forestwork.vercel.app/'
                    },
                    {
                      type: 2,
                      id: 8,
                      style: 5,
                      label: '日麻賽事',
                      emoji: { name: '🀄' },
                      url: 'https://forestwork.vercel.app/games/mahjongsoul'
                    },
                    {
                      type: 2,
                      id: 9,
                      style: 5,
                      label: '加入 Discord',
                      emoji: { name: '📌' },
                      url: 'https://discord.gg/lin-jian-xiao-zhen-510192195509157909'
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  }
})