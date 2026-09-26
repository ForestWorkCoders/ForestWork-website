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
  const targetId = String(interaction.data?.target_id || '')

  if (!callerId || !targetId) {
    return {
      type: 4,
      data: { content: '❌ 無法解析贈送者或目標使用者身分。', flags: 64 }
    }
  }

  const supabase = getSupabase()

  // 1. 呼叫在 Supabase 定義的原子儲存程序
  const { data: result, error } = await supabase.rpc('give_quaso', {
    p_giver_id: callerId,
    p_receiver_id: targetId,
    p_amount: 1
  })

  if (error) {
    console.error('[Quaso RPC Error]:', error)
    return {
      type: 4,
      data: { content: `❌ 贈送失敗，資料庫異常：${error.message}`, flags: 64 }
    }
  }

  // 2. 業務失敗 (例如：送給自己、今日額度已用光) ➔ 僅自己可見 (flags: 64)，不刷屏公屏
  if (!result?.success) {
    return {
      type: 4,
      data: {
        content: result?.message || '🛑 贈送失敗！',
        flags: 64 // 僅點擊者本人看得到錯誤原因
      }
    }
  }

  // 3. 業務成功 ➔ 在公屏發布精美戰報，全伺服器見證！
  return {
    type: 4,
    data: {
      embeds: [{
        title: '🥐 每日 Quaso 能量投遞！',
        description: [
          `<@${callerId}> 贈送了 **1** 枚 🥐 給 <@${targetId}>！`,
          '',
          `*「美味的 Quaso 代表著社群的肯定與羈絆。」*`,
          '',
          `📊 <@${callerId}> 今日剩餘額度：\`${result.remaining}/3\` 枚`
        ].join('\n'),
        color: 0xF39C12, // 溫暖的 Quaso 金黃色
        footer: {
          text: '林間小鎮 社交激勵系統 · 每日午夜自動刷新額度',
          icon_url: 'https://i.imgur.com/cu2YAkn.png'
        },
        timestamp: new Date().toISOString()
      }]
    }
  }
}