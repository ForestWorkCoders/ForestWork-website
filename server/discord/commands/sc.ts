// server/discord/commands/sc.ts
import crypto from 'node:crypto'
import type { H3Event } from 'h3'
import { getInteractionOption } from '../utils'
import { recordRoomPlayer } from '../room-player'
import { evaluateDiceExpression, isDiceExpression } from '../dice'
import { getSupabase } from '../../utils/supabase'

const d100 = () => crypto.randomInt(1, 101)

export async function handleSc(interaction: any, event: H3Event) {
  const callerId = interaction.member?.user?.id || interaction.user?.id
  const expParam = getInteractionOption<string>(interaction, 'exp')?.trim()
  const manualSan = getInteractionOption<number>(interaction, 'current')

  // Exactly two readable sides (pass/fail). Anything else is refused: an unreadable loss must not count as 0.
  const sides = (expParam || '').split('/').map(s => s.trim())
  if (sides.length !== 2 || !sides.every(isDiceExpression)) {
    return {
      type: 4,
      data: { content: '⚠️ 請提供標準的理智損失表達式！格式如：`0/1d6`、`1/1d4` 或 `1/1d10+1`。', flags: 64 }
    }
  }

  const [passExp, failExp] = sides
  const supabase = getSupabase()
  let currentSan: number
  let activeChar: any = null

  // 1. 若未手動傳入 SAN，自動從當前出戰卡獲取
  if (manualSan !== undefined) {
    currentSan = manualSan
  } 
  // -------------------------------------------------------------
  // 分支 2：未指定數值，自動從當前出戰卡獲取 (角色連動模式)
  // -------------------------------------------------------------
  else {
    const { data: char, error } = await supabase
      .schema('trpg')
      .from('characters')
      .select('*')
      .eq('discord_id', callerId)
      .eq('is_active', true)
      .maybeSingle()

    // 嚴格衛語句：只要查不到卡、或角色卡缺乏 san 屬性，立刻中斷並回顯錯誤
    if (error || !char || char.san === undefined || char.san === null) {
      return {
        type: 4,
        data: {
          content: '❌ 未檢測到出戰角色卡或角色卡缺乏理智數值！請先使用 `/card switch` 指定出戰角色，或使用 `current` 參數手動指定當前理智值。',
          flags: 64
        }
      }
    }

    activeChar = char
    // ★ 雙重防禦：強制轉換為 Number，徹底消除 any 帶來的隱患
    currentSan = Number(char.san)
  }

  // 2. 核心 1D100 檢定
  const roll = d100()
  const isPass = roll <= currentSan
  const isFumble = roll >= 96 && (currentSan < 50 || roll === 100)

  // 3. 結算損失數值
  const selectedExp = isPass ? passExp! : failExp!
  const { total: rolled, breakdown: lossDetail } = evaluateDiceExpression(selectedExp)
  const loss = Math.max(0, rolled) // a SAN check never heals (e.g. 1d4-2 rolling 1)
  const newSan = Math.max(0, currentSan - loss)

  // 4. 原子寫回資料庫（若綁定了角色卡）
  let dbSynced = false
  if (activeChar) {
    const { error: updateErr } = await supabase
      .schema('trpg')
      .from('characters')
      .update({ san: newSan })
      .eq('id', activeChar.id)

    if (!updateErr) dbSynced = true
  }

  // 5. 警報感知：單次損失 >= 5 點觸發臨時瘋狂
  const hitInsanityThreshold = loss >= 5

  const embed = {
    title: `🧠 CoC 7th 理智檢定 (San Check)：${expParam}`,
    color: isPass ? 0x2ECC71 : (hitInsanityThreshold ? 0x9B59B6 : 0xE74C3C),
    description: activeChar ? `受檢調查員：**${activeChar.name}**` : undefined,
    fields: [
      {
        name: '🎲 檢定判定 (1D100 <= 當前理智)',
        value: `擲骰結果：**\`${roll}\`** / 當前理智：\`${currentSan}\` ➔ **${isPass ? '✅ 檢定通過 (Pass)' : '❌ 檢定失敗 (Fail)'}**${isFumble ? ' 💀 **[大失敗]**' : ''}`,
        inline: false
      },
      {
        name: `💥 理智損失結算 (執行: ${selectedExp})`,
        value: `損失點數：**\`${loss}\`** 點 ${lossDetail !== String(loss) ? `← ${lossDetail}` : ''}\n理智變更：\`${currentSan}\` ➔ **\`${newSan}\`**${dbSynced ? ' ⭐ *(角色卡已自動同步)*' : ''}`,
        inline: false
      }
    ],
    footer: {
      text: '林間小鎮 TRPG · 理智吞噬引擎',
      icon_url: 'https://i.imgur.com/cu2YAkn.png'
    },
    timestamp: new Date().toISOString()
  }

  // 觸發臨時瘋狂時追加醒目警報 Field
  if (hitInsanityThreshold) {
    embed.fields.push({
      name: '🐙 警告：瀕臨精神失常！',
      value: `⚠️ 單次理智損失達 **\`${loss}\`** 點 (≥5)！請守秘人立刻要求進行 **智力 (INT) 檢定** 以判定是否陷入【臨時性瘋狂】！`,
      inline: false
    })
  }

  if (newSan === 0) {
    embed.fields.push({
      name: '💀 絕望：調查員徹底崩潰！',
      value: `調查員的理智已歸零，陷入【永久性瘋狂】。卡片已作廢，請移交守秘人接管！`,
      inline: false
    })
  }

  // Inside a TRPG room's thread, whoever rolls joins the room's player list
  await recordRoomPlayer(interaction)

  return {
    type: 4,
    data: { embeds: [embed] }
  }
}