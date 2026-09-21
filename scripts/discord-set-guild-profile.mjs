// scripts/discord-set-guild-profile.mjs
import fs from 'node:fs'

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN
const GUILD_ID = process.argv[2] || process.env.DISCORD_GUILD_ID
const NEW_NICKNAME = process.argv[3] // 传入新昵称
const AVATAR_IMAGE_PATH = process.argv[4] // 可选：本地图片路径，如 ./avatar.png

if (!BOT_TOKEN || !GUILD_ID || !NEW_NICKNAME) {
  console.log('使用方式: node --env-file=.env scripts/discord-set-guild-profile.mjs <GUILD_ID> <NICKNAME> [AVATAR_PATH]')
  process.exit(1)
}

const payload = {
  nick: NEW_NICKNAME
}

// 如果提供了本地头像文件，转换为 Discord 要求的 Data URI 格式
if (AVATAR_IMAGE_PATH && fs.existsSync(AVATAR_IMAGE_PATH)) {
  const imageBuffer = fs.readFileSync(AVATAR_IMAGE_PATH)
  const base64 = imageBuffer.toString('base64')
  payload.avatar = `data:image/png;base64,${base64}`
}

const res = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/@me`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bot ${BOT_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
})

if (res.ok) {
  const member = await res.json()
  console.log(`[✔] 成功更新 Guild [${GUILD_ID}] 中的身份:`)
  console.log(`    - 昵称: ${member.nick}`)
  console.log(`    - 专属头像 Hash: ${member.avatar || '(使用全局默认头像)'}`)
} else {
  console.error(`[-] 修改失败 [${res.status}]:`, await res.text())
}