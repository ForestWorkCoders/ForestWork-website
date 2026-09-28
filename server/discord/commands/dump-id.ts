// server/discord/commands/dump-ids.ts
import type { H3Event } from 'h3'

const OWNER_ID = '129569761309753344'

export async function handleDumpIds(interaction: any, event: H3Event) {
  const callerId = String(interaction.member?.user?.id || interaction.user?.id || '')
  
  // 1. 斯巴達防線：只認本人
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
    // 2. 同步直接拉取伺服器前 1000 名成員（600ms 內完成，不需要搞脆弱的後台異步）
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

    // 3. 過濾出持有該身分組的成員
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

    // 5. 透過 Webhook 交付 Multipart 檔案
    // 在 HTTP Interactions 直接回傳檔案較易遇到邊界相容性問題，
    // 最穩健的好品味：同步完成計算後，直接向 Webhook 發送 POST，保證 100% 成功送達！
    const appId = interaction.application_id
    const token = interaction.token
    const followUrl = `https://discord.com/api/v10/webhooks/${appId}/${token}`

    const formData = new FormData()
    formData.append('payload_json', JSON.stringify({
      content: `✅ 成功導出身分組 <@&${roleId}> 共 **${targetMembers.length}** 名成員標籤名單：`,
      flags: 64
    }))
    const fileBlob = new Blob([tagContent], { type: 'text/plain;charset=utf-8' })
    formData.append('files[0]', fileBlob, `role_${roleId}_mentions.txt`)

    // 在主線程中直接 await 完成傳輸，絕不留給 Vercel 凍結容器的機會！
    const postRes = await fetch(followUrl, {
      method: 'POST',
      body: formData
    })

    if (!postRes.ok) {
      const postErr = await postRes.text()
      return {
        type: 4,
        data: { content: `❌ 上傳附件失敗: ${postErr}`, flags: 64 }
      }
    }

    // 6. 檔案已送達，主端點直接關閉響應
    return {
      type: 4,
      data: { content: `📦 名單已生成並以私密附件送達。`, flags: 64 }
    }

  } catch (err: any) {
    return {
      type: 4,
      data: { content: `💥 執行異常: ${err?.message || '未知錯誤'}`, flags: 64 }
    }
  }
}