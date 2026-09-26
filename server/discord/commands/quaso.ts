// server/discord/commands/quaso.ts
import type { H3Event } from 'h3'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

/**
 * 處理 Discord 右鍵上下文選單: [🥐 送 1 個 Quaso]
 */
export async function handleGiveQuasoContextMenu(interaction: any, event: H3Event) {
  const callerId = String(interaction.member?.user?.id || interaction.user?.id || '')
  const callerName = interaction.member?.nick || interaction.member?.user?.global_name || interaction.user?.username || '熱心群友'
  const targetId = String(interaction.data?.target_id || '')

  // 從 resolved 記憶體直接取得目標真實名稱
  const resolvedMember = interaction.data?.resolved?.members?.[targetId]
  const resolvedUser = interaction.data?.resolved?.users?.[targetId]
  const targetName = resolvedMember?.nick || resolvedUser?.global_name || resolvedUser?.username || '神秘群友'

  if (!callerId || !targetId) {
    return { type: 4, data: { content: '❌ 無法解析贈送者或目標身分。', flags: 64 } }
  }

  const supabase = getSupabase()
  const { data: result, error } = await supabase.rpc('give_quaso', {
    p_giver_id: callerId,
    p_giver_name: callerName,
    p_receiver_id: targetId,
    p_receiver_name: targetName,
    p_amount: 1
  })

  if (error) {
    return { type: 4, data: { content: `❌ 投遞失敗，資料庫異常：${error.message}`, flags: 64 } }
  }

  if (!result?.success) {
    return { type: 4, data: { content: result?.message || '🛑 投遞失敗！', flags: 64 } }
  }

  return {
    type: 4,
    data: {
      embeds: [{
        title: '🥐 Quaso 能量投遞成功！',
        description: [
          `<@${callerId}> 投遞了 **1** 枚香脆的 🥐 給 <@${targetId}>！`,
          '',
          `*「Quaso 代表著林間小鎮最純粹的敬意與羈絆。」*`,
          '',
          `📊 <@${callerId}> 今日剩餘可用額度：\`${result.remaining}/3\` 枚`
        ].join('\n'),
        color: 0xE67E22, // 烘焙金黃色
        footer: { text: '每日午夜 00:00 自動刷新額度 · 輸入 /leaderboard quaso 查看榜單' },
        timestamp: new Date().toISOString()
      }]
    }
  }
}