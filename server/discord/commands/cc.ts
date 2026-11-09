// server/discord/commands/cc.ts
import type { H3Event } from 'h3'
import { getInteractionOption } from '../utils'
import { rollCoC } from '../utils/cocDice'
import { getSupabase } from '~~/server/utils/supabase'


export async function handleCc(interaction: any, event: H3Event) {
  const target = getInteractionOption<number>(interaction, 'value')
  const skill = getInteractionOption<string>(interaction, 'skill')?.trim() || '常規檢定'
  const bonus = getInteractionOption<number>(interaction, 'bonus') || 0
  const isSecret = Boolean(getInteractionOption<boolean>(interaction, 'secret'))

  if (!target || target < 1 || target > 100) {
    return {
      type: 4,
      data: {
        content: '⚠️ 請輸入合法的檢定目標數值 (1 ~ 100)！',
        flags: 64 // 錯誤提示僅本人可見
      }
    }
  }

  // 1. 執行核心判定
  const result = rollCoC(target, bonus)

  // 2. 構造擲骰過程文字
  let processText = ''
  if (bonus !== 0) {
    const bpLabel = bonus > 0 ? `獎勵骰 B${bonus}` : `懲罰骰 P${Math.abs(bonus)}`
    processText = ` (${bpLabel}: \`[${result.rolls.join(', ')}]\` ➔ **${result.dice}**)`
  }

  // 3. 顏色標籤 (大成功金黃、成功墨綠、失敗酒紅、大失敗純黑)
  let color = 0x8B3A3A // 失敗 (酒紅)
  if (result.level === '★大成功') color = 0xF1C40F
  else if (result.isSuccess) color = 0x4C7766 // 成功 (林間墨綠)
  else if (result.level === '●大失敗') color = 0x1A1A1A

  const callerId = interaction.member?.user?.id || interaction.user?.id
  const titlePrefix = isSecret ? '🤫 【暗骰結果】' : '🎲 【技能檢定】'

  const embed = {
    title: `${titlePrefix}${skill}`,
    description: `<@${callerId}> 進行了 **${skill}** 判定：\n` +
      `🎲 1D100 = **${result.dice}**${processText} ⎯ **[${result.level}]**\n` +
      `🎯 目標值：\`${target}\` (困難: \`${Math.floor(target / 2)}\` / 極限: \`${Math.floor(target / 5)}\`)`,
    color,
    footer: {
      text: isSecret ? '林間小鎮 TRPG · 秘密檢定 (僅自己可見)' : '林間小鎮 TRPG · CoC 7th 檢定系統',
      icon_url: 'https://i.imgur.com/cu2YAkn.png'
    },
    timestamp: new Date().toISOString()
  }

  // 如果當前是在某個跑團主線子區內擲骰，將擲骰者自動納入參團名單！
    const channelType = interaction.channel?.type
    if (channelType === 11) {
      const currentChannelId = String(interaction.channel_id)
      const callerId = String(interaction.member?.user?.id || interaction.user?.id)
  
      // 異步打點，不阻塞投骰的主線回應
      const supabase = getSupabase()
      await supabase.rpc('record_room_player', {
        p_main_thread_id: currentChannelId,
        p_player_id: callerId
      })
    }

  return {
    type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
    data: {
      embeds: [embed],
      // ★ 核心品味：若是暗骰，打上 flags: 64，只有擲骰者自己看得到！
      flags: isSecret ? 64 : undefined
    }
  }
}