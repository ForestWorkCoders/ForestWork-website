// scripts/discord-register-commands.mjs
const APP_ID = process.env.DISCORD_APPLICATION_ID
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN
const GUILD_ID = process.env.DISCORD_GUILD_ID

// 严格断言：三者缺一不可，绝不允许隐式降级到 Global
if (!APP_ID || !BOT_TOKEN || !GUILD_ID) {
  console.error('[-] 致命错误: 必须在 .env 中配置 DISCORD_APPLICATION_ID、DISCORD_BOT_TOKEN 与 DISCORD_GUILD_ID！')
  console.error('[-] 系统已全面弃用 Global 指令，禁止未指定 GUILD_ID 运行。')
  process.exit(1)
}

// 你的专属服务器指令清单
// scripts/discord-register-commands.mjs
const commands = [
  {
    name: 'ping',
    description: '檢查網站與交互機器人運行狀態'
  },
  {
    name: 'site',
    description: '取得林間小鎮官方網站與重要入口連結'
  },
  {
    name: 'roll',
    description: 'TRPG 骰子投擲 (支援最佳/最差篩選)',
    options: [
      {
        name: 'count',
        description: '骰子數量 (預設 1, 上限 100)',
        type: 4, // INTEGER
        required: true,
        min_value: 1,
        max_value: 100
      },
      {
        name: 'faces',
        description: '骰子面數 (如 6, 20, 100)',
        type: 4, // INTEGER
        required: true,
        min_value: 1,
        max_value: 10000
      },
      {
        name: 'desc',
        description: '投擲備註原因 (可選)',
        type: 3, // STRING
        required: false
      },
      {
        name: 'keep',
        description: '篩選保留模式 (可選)',
        type: 3, // STRING
        required: false,
        choices: [
          { name: '保留最好 (Best)', value: 'best' },
          { name: '保留最差 (Worst)', value: 'worst' }
        ]
      },
      {
        name: 'keep_count',
        description: '保留的骰子數量 (配合 keep 模式)',
        type: 4, // INTEGER
        required: false,
        min_value: 1
      }
    ]
  },
  {
    name: 'cc',
    description: 'COC 1D100 技能檢定 (自動判定成功等級與大成功/大失敗)',
    options: [
      {
        name: 'target',
        description: '技能或屬性目標值 (1-100)',
        type: 4, // INTEGER
        required: true,
        min_value: 1,
        max_value: 100
      },
      {
        name: 'desc',
        description: '檢定項目名稱 (如 偵查、力量、聆聽)',
        type: 3, // STRING
        required: false
      }
    ]
  }
]

const url = `https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands`

console.log(`[+] 正在向 Guild [${GUILD_ID}] 同步指令...`)

const res = await fetch(url, {
  method: 'PUT',
  headers: {
    'Authorization': `Bot ${BOT_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(commands)
})

if (res.ok) {
  const data = await res.json()
  console.log(`[✔] 同步完成，当前 Guild 生效指令 (${data.length}):`, data.map(c => `/${c.name}`).join(', '))
} else {
  const err = await res.text()
  console.error(`[-] 注册失败 [${res.status}]:`, err)
  process.exit(1)
}