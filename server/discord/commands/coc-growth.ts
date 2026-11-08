// server/discord/commands/en.ts
import crypto from 'node:crypto'
import type { H3Event } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { getInteractionOption } from '../utils'

function getSupabase() {
  const url = process.env.SUPABASE_URL || ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || ''
  return createClient(url, serviceKey)
}

const d100 = () => crypto.randomInt(1, 101)
const d10 = () => crypto.randomInt(1, 11)


export async function handleCocGrowth(interaction: any, event: H3Event) {
  const callerId = interaction.member?.user?.id || interaction.user?.id
  const skillParam = getInteractionOption<string>(interaction, 'skill')?.trim()
  const targetParam = getInteractionOption<number>(interaction, 'target')

  // 参数前置校验：两个参数必须至少给一个
  if (!skillParam && targetParam === undefined) {
    return {
      type: 4,
      data: {
        content: '⚠️ 請至少提供 `skill` (指定技能名自動同步角色卡) 或 `target` (純手動檢定數值)！',
        flags: 64
      }
    }
  }

  const supabase = getSupabase()
  let currentVal = targetParam ?? 0
  let activeChar: any = null

  // -------------------------------------------------------------
  // 模式 A：傳入了 skill 名稱 ➔ 自動從當前出戰角色卡尋址
  // -------------------------------------------------------------
  if (skillParam) {
    const { data: char, error } = await supabase
      .schema('trpg')
      .from('characters')
      .select('*')
      .eq('discord_id', callerId)
      .eq('is_active', true)
      .maybeSingle()

    if (error || !char) {
      return {
        type: 4,
        data: {
          content: '❌ 未檢測到當前出戰的角色卡！若要自動更新卡片，請先使用 `/card switch` 指定出戰角色；或改用 `target` 參數進行純數值檢定。',
          flags: 64
        }
      }
    }

    activeChar = char
    const charSkills = char.skills || {}
    const charAttrs = char.attributes || {}

    // 優先從技能字典抓，抓不到從八圍屬性抓
    if (charSkills[skillParam] !== undefined) {
      currentVal = charSkills[skillParam]
    } else if (charAttrs[skillParam.toUpperCase()] !== undefined) {
      currentVal = charAttrs[skillParam.toUpperCase()]
    } else if (targetParam !== undefined) {
      currentVal = targetParam
    } else {
      return {
        type: 4,
        data: {
          content: `⚠️ 出戰調查員 **${char.name}** 的檔案中未包含【${skillParam}】技能！請在命令中補充 \`target\` 初始數值，或先透過 \`/card edit\` 建立該技能。`,
          flags: 64
        }
      }
    }

    // 99 點封頂邊界防守
    if (currentVal >= 99) {
      return {
        type: 4,
        data: {
          content: `🛑 調查員 **${char.name}** 的【${skillParam}】已達人類極限極限值 \`99\`，無法再進行成長檢定！`,
          flags: 64
        }
      }
    }
  }

  // -------------------------------------------------------------
  // 核心 CoC 7th 成長檢定演算
  // 規則：擲 1D100，若 > 當前值 或 落在 96~100 (大成功)，則判定成長成功
  // -------------------------------------------------------------
  const roll = d100()
  const isSuccess = roll > currentVal || roll >= 96
  let delta = 0
  let newVal = currentVal
  let synced = false

  if (isSuccess) {
    delta = d10()
    newVal = Math.min(99, currentVal + delta)

    // ★★★ 核心好品味：只要綁定了活躍角色卡，成功後立刻原子級寫庫！★★★
    if (activeChar && skillParam) {
      const skills = { ...(activeChar.skills || {}) }
      skills[skillParam] = newVal

      const { error: updateErr } = await supabase
        .schema('trpg')
        .from('characters')
        .update({ skills })
        .eq('id', activeChar.id)

      if (!updateErr) {
        synced = true
      } else {
        console.error('[EN Skill Auto-sync Failed]:', updateErr)
      }
    }
  }

  // 構造展示卡片
  const embed = {
    title: `📈 CoC 7th 技能成長檢定：${skillParam || '純數值檢定'}`,
    color: isSuccess ? 0x2ECC71 : 0xE74C3C, // 成功綠，失敗紅
    description: activeChar ? `出戰調查員：**${activeChar.name}**` : undefined,
    fields: [
      {
        name: '🎲 成長判定 (1D100 > 當前值 或 96+)',
        value: `擲骰結果：**\`${roll}\`** / 目標數值：\`${currentVal}\` ➔ **${isSuccess ? '✅ 檢定通過 (成功成長)' : '❌ 檢定失敗 (無提升)'}**`,
        inline: false
      }
    ],
    footer: {
      text: synced ? '林間小鎮 TRPG · 數值已自動同步寫入出戰角色卡' : '林間小鎮 TRPG · 數值檢定引擎',
      icon_url: 'https://i.imgur.com/cu2YAkn.png'
    },
    timestamp: new Date().toISOString()
  }

  if (isSuccess) {
    embed.fields.push({
      name: '✨ 技能提升結算 (+1D10)',
      value: `獲得成長：\`+${delta}\` 點\n數值變更：\`${currentVal}\` ➔ **\`${newVal}\`**${synced ? ' ⭐ *(角色卡已自動更新)*' : ''}`,
      inline: false
    })
  }

  return {
    type: 4,
    data: { embeds: [embed] }
  }
}