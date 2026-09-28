// server/discord/commands/dump-ids.ts
import type { H3Event } from 'h3'

const OWNER_ID = '129569761309753344'

export async function handleDumpIds(interaction: any, event: H3Event) {
  const callerId = String(interaction.member?.user?.id || interaction.user?.id || '')
  
  // 1. 斯巴達防線：只認你本人 Snowflake ID
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
  if (!botToken) {
    return {
      type: 4,
      data: { content: '❌ 伺服器端缺少 DISCORD_BOT_TOKEN 環境變數。', flags: 64 }
    }
  }

  try {
    // 2. 唯一的一跳外部網路呼叫：拉取成員（耗時約 400ms~700ms）
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members?limit=1000`, {
      headers: { Authorization: `Bot ${botToken}` }
    })

    if (!res.ok) {
      const errJson = await res.text()
      return {
        type: 4,
        data: {
          content: `💥 拉取成員失敗 (HTTP ${res.status}): \`${errJson}\`\n*(提示：請確認已在 Discord Developer Portal 的 Bot 標籤頁勾選 Server Members Intent)*`,
          flags: 64
        }
      }
    }

    const members: any[] = await res.json()

    // 3. 純記憶體運算：過濾持有目標身分組的成員
    const targetMembers = members.filter((m: any) => 
      Array.isArray(m.roles) && m.roles.includes(roleId)
    )

    if (targetMembers.length === 0) {
      return {
        type: 4,
        data: { content: `⚠️ 身分組 <@&${roleId}> 目前沒有任何成員。`, flags: 64 }
      }
    }

    // 4. 生成 <@user_id> 清單
    const tagContent = targetMembers.map((m: any) => `<@${m.user.id}>`).join('\n')

    // 5. 核心好品味：直接在單一 HTTP 響應中組裝 Multipart
    // 不發起第二次遠端請求，直接把檔案綁定在 HTTP 200 返回給 Discord 網關
    const formData = new FormData()
    formData.append('payload_json', JSON.stringify({
      type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
      data: {
        content: `✅ 成功導出身分組 <@&${roleId}> 共 **${targetMembers.length}** 名成員標籤名單：`,
        flags: 64 // 依然保持極致私密
      }
    }))

    const fileBlob = new Blob([tagContent], { type: 'text/plain;charset=utf-8' })
    formData.append('files[0]', fileBlob, `role_${roleId}_mentions.txt`)

    // 直接返回 Web 標準 Response 物件，Nitro 會原汁原味以 multipart/form-data 交付
    return new Response(formData)

  } catch (err: any) {
    return {
      type: 4,
      data: { content: `💥 執行異常: ${err?.message || '未知錯誤'}`, flags: 64 }
    }
  }
}