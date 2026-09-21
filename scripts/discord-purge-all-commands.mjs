// scripts/discord-purge-ghost.mjs
const APP_ID = process.env.DISCORD_APPLICATION_ID
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN
const GUILD_ID = process.env.DISCORD_GUILD_ID // 如果当年是注册在某个特定测试服务器，填上它

if (!APP_ID || !BOT_TOKEN) {
  console.error('[-] 缺少 DISCORD_APPLICATION_ID 或 DISCORD_BOT_TOKEN')
  process.exit(1)
}

const headers = {
  'Authorization': `Bot ${BOT_TOKEN}`,
  'Content-Type': 'application/json'
}

async function inspectAndPurge(scopeName, url, deleteBaseUrl) {
  console.log(`\n🔍 正在扫描 [${scopeName}] 指令列表...`)
  const res = await fetch(url, { headers })
  if (!res.ok) {
    console.error(`[-] 获取 ${scopeName} 失败 [${res.status}]:`, await res.text())
    return
  }

  const commands = await res.json()
  if (commands.length === 0) {
    console.log(`[i] [${scopeName}] 没有注册任何指令。`)
    return
  }

  console.log(`[i] 发现 ${commands.length} 个指令:`)
  for (const cmd of commands) {
    console.log(`    - /${cmd.name} (ID: ${cmd.id}) -> "${cmd.description}"`)
    
    // 命中目标：精准斩杀 sync_users
    if (cmd.name === 'sync_users' || cmd.name === 'sync_user') {
      console.log(`    ⚠️ 发现目标幽灵指令 [/${cmd.name}]，正在执行 DELETE...`)
      const delRes = await fetch(`${deleteBaseUrl}/${cmd.id}`, {
        method: 'DELETE',
        headers
      })
      if (delRes.status === 204 || delRes.ok) {
        console.log(`    ✔ 成功物理销毁 /${cmd.name} (ID: ${cmd.id})！`)
      } else {
        console.error(`    ❌ 删除失败 [${delRes.status}]:`, await delRes.text())
      }
    }
  }
}

// 1. 扫描与清理 Global 指令
await inspectAndPurge(
  'GLOBAL',
  `https://discord.com/api/v10/applications/${APP_ID}/commands`,
  `https://discord.com/api/v10/applications/${APP_ID}/commands`
)

// 2. 如果配置了 GUILD_ID，扫描与清理该 Guild 内的指令
if (GUILD_ID) {
  await inspectAndPurge(
    `GUILD: ${GUILD_ID}`,
    `https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands`,
    `https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands`
  )
}

console.log('\n[✔] 扫描与清理流程结束。')