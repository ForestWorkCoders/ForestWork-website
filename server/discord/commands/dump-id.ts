// server/discord/commands/dump-ids.ts
import type { H3Event } from 'h3'
import { waitUntil } from '@vercel/functions'

const OWNER_ID = '129569761309753344'

/**
 * 分頁拉取伺服器全量成員（自動跨越 1000 人限制，杜絕漏人）
 */
async function fetchAllGuildMembers(guildId: string, botToken: string): Promise<any[]> {
  const members: any[] = []
  let lastId = '0'
  let hasMore = true

  while (hasMore) {
    const url = new URL(`https://discord.com/api/v10/guilds/${guildId}/members`)
    url.searchParams.set('limit', '1000')
    if (lastId !== '0') {
      url.searchParams.set('after', lastId)
    }

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bot ${botToken}` }
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Discord REST API 異常 (HTTP ${res.status}): ${errText}`)
    }

    const chunk = await res.json()
    if (!Array.isArray(chunk) || chunk.length === 0) {
      break
    }

    members.push(...chunk)

    if (chunk.length < 1000) {
      hasMore = false
    } else {
      const lastMember = chunk[chunk.length - 1]
      lastId = String(lastMember.user.id)
    }
  }

  return members
}

export async function handleDumpIds(interaction: any, event: H3Event) {
  const callerId = String(interaction.member?.user?.id || interaction.user?.id || '')
  
  // 1. 斯巴達防線：只認本人 Snowflake ID
  if (callerId !== OWNER_ID) {
    return {
      type: 4,
      data: { content: '❌ **權限不足**：此核心管理指令僅限擁有者本人執行。', flags: 64 }
    }
  }

  const guildId = interaction.guild_id
  if (!guildId) {
    return {
      type: 4,
      data: { content: '❌ 此指令僅限在伺服器內部執行！', flags: 64 }
    }
  }

  const roleOption = interaction.data?.options?.find((o: any) => o.name === 'role')
  const roleId = String(roleOption?.value || '')

  const botToken = process.env.DISCORD_BOT_TOKEN
  const appId = process.env.DISCORD_APPLICATION_ID || interaction.application_id
  const token = interaction.token

  if (!botToken || !appId) {
    return {
      type: 4,
      data: { content: '❌ 伺服器端環境變數配置缺失 (DISCORD_BOT_TOKEN / DISCORD_APPLICATION_ID)。', flags: 64 }
    }
  }

  // 2. 定義後台持久任務（由 waitUntil 保活，無畏 Vercel 提早凍結）
  const backgroundTask = async () => {
    const webhookUrl = `https://discord.com/api/v10/webhooks/${appId}/${token}/messages/@original`
    const fileName = `role_${roleId}_mentions.txt`

    try {
      // 分頁抓取全體成員（耗時 2~4 秒）
      const allMembers = await fetchAllGuildMembers(guildId, botToken)

      // 過濾身分組成員
      const targetMembers = allMembers.filter((m: any) => 
        Array.isArray(m.roles) && m.roles.includes(roleId)
      )

      if (targetMembers.length === 0) {
        await fetch(webhookUrl, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `⚠️ 身分組 <@&${roleId}> 目前沒有任何成員。`
          })
        })
        return
      }

      // 生成格式化清單
      const tagContent = targetMembers.map((m: any) => `<@${m.user.id}>`).join('\n')

      // 構建合規的 Discord API v10 Multipart 表單
      const formData = new FormData()
      formData.append('payload_json', JSON.stringify({
        content: `✅ 成功導出身分組 <@&${roleId}> 共 **${targetMembers.length}** 名成員標籤名單：`,
        // ★★★ 關鍵修復：Discord v10 PATCH 要求必須聲明 attachments 陣列對應檔案索引 ★★★
        attachments: [
          {
            id: 0,
            filename: fileName,
            description: `Members with role ${roleId}`
          }
        ]
      }))

      const fileBlob = new Blob([tagContent], { type: 'text/plain;charset=utf-8' })
      formData.append('files[0]', fileBlob, fileName)

      const patchRes = await fetch(webhookUrl, {
        method: 'PATCH',
        body: formData
      })

      if (!patchRes.ok) {
        const patchErr = await patchRes.text()
        console.error('[DumpIDs PATCH Error]:', patchRes.status, patchErr)
      }
    } catch (err: any) {
      console.error('[DumpIDs Fatal Error]:', err)
      await fetch(webhookUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `💥 導出失敗：${err?.message || '未知異常'}`
        })
      }).catch(() => {})
    }
  }

  // 3. 透過 Vercel 專用原語延長執行緒壽命，徹底粉碎容器凍結
  waitUntil(backgroundTask())

  // 4. 50ms 內極速交出延遲確認，0 毫秒粉碎 3 秒逾時熔斷！
  return {
    type: 5, // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
    data: { flags: 64 } // 極致私密
  }
}