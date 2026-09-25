// server/discord/commands/card.ts
import type { H3Event } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { COC_SKILL_CATEGORIES, BASE_ATTR_KEYS } from '../assets/coc-skills'
import { parseCharacterCard } from '../utils/cocParser'

// 建立後端專用 Supabase 管理端客戶端（繞過無狀態 Webhook 缺少 Session 的限制）
function getSupabase() {
  const url = process.env.SUPABASE_URL || ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || ''
  return createClient(url, serviceKey)
}

/**
 * 格式化單張角色卡為精緻的 Discord Embed[cite: 6, 9]
 */
function buildCharacterEmbed(char: any, userAvatar?: string) {
  const attrs = char.attributes || {}
  const skills = char.skills || {}

  // 1. 八圍排版
  const attrText = BASE_ATTR_KEYS.map(k => `**${k}**: \`${attrs[k] || 0}\``).join(' | ')

  const fields: any[] = [
    {
      name: '📌 當前生存狀態',
      value: `❤️ **HP**: \`${char.hp}\` ｜ 🔮 **MP**: \`${char.mp}\` ｜ 🧠 **SAN**: \`${char.san}\``,
      inline: false
    },
    {
      name: '📊 基礎屬性 (八圍 + 幸運)',
      value: attrText || '無數據',
      inline: false
    }
  ]

  // 2. 11 大技能類別動態排版 (自動隱藏 0 點技能)[cite: 6, 9]
  let validSkillCount = 0
  for (const [catName, catSkills] of Object.entries(COC_SKILL_CATEGORIES)) {
    const matched: string[] = []
    for (const sk of catSkills) {
      if (skills[sk] && skills[sk] > 0) {
        matched.push(`${sk} \`${skills[sk]}\``)
        validSkillCount++
      }
    }
    if (matched.length > 0) {
      fields.push({
        name: catName,
        value: matched.join(' ｜ '),
        inline: false
      })
    }
  }

  return {
    title: `📜 調查員檔案：${char.name}${char.is_active ? ' ⭐ [當前出戰]' : ''}`,
    color: char.is_active ? 0x2ECC71 : 0x3498DB,
    thumbnail: userAvatar ? { url: userAvatar } : undefined,
    fields,
    footer: {
      text: `林間小鎮 TRPG · 共載入 ${validSkillCount} 項有效技能`,
      icon_url: 'https://i.imgur.com/cu2YAkn.png'
    },
    timestamp: new Date().toISOString()
  }
}

/**
 * 處理 /card 斜槓指令分流
 */
export async function handleCardCommand(interaction: any, event: H3Event) {
  const subCommand = interaction.data?.options?.[0]?.name
  const subOptions = interaction.data?.options?.[0]?.options || []

  const getSubOption = (name: string) => subOptions.find((o: any) => o.name === name)?.value
  const callerId = interaction.member?.user?.id || interaction.user?.id
  const avatar = interaction.member?.user?.avatar 
    ? `https://cdn.discordapp.com/avatars/${callerId}/${interaction.member.user.avatar}.png`
    : undefined

  // -------------------------------------------------------------
  // 子指令 1: /card create (彈出原生表單視窗)[cite: 7]
  // -------------------------------------------------------------
  // server/discord/commands/card.ts 中的 create 分支：

  if (subCommand === 'create') {
    return {
      type: 9, // APPLICATION_MODAL
      data: {
        custom_id: 'trpg_card_create_modal',
        title: '建立 CoC 7版調查員角色卡',
        components: [
          // 問題 1: 調查員姓名 (必填)
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: 'char_name',
                label: '1. 調查員姓名 (必填)',
                style: 1, // Short
                min_length: 1,
                max_length: 50,
                required: true,
                placeholder: '例如：艾莉絲'
              }
            ]
          },
          // 問題 2: 基礎八圍與幸運 (必填)
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: 'base_attrs',
                label: '2. 基礎屬性八圍 + 幸運 (必填)',
                style: 2, // Paragraph
                required: true,
                placeholder: '力量:60 體質:50 敏捷:70 外貌:50 意志:60 智力:70 體型:65 教育:80 幸運:50'
              }
            ]
          },
          // 問題 3: 調查與探索技能 (選填)
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: 'skills_investigation',
                label: '3. 調查與感知類技能 (選填)',
                style: 2, // Paragraph
                required: false,
                placeholder: '偵察:70 聆聽:60 心理學:50 圖書館:40 追蹤:20'
              }
            ]
          },
          // 問題 4: 戰鬥與生存行動 (選填)
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: 'skills_combat',
                label: '4. 戰鬥、生存與行動類技能 (選填)',
                style: 2, // Paragraph
                required: false,
                placeholder: '閃避:35 鬥毆:60 手槍:50 急救:40 隱密行動:40'
              }
            ]
          },
          // 問題 5: 社交、學識與其他技能 (選填)
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: 'skills_other',
                label: '5. 社交、知識與自訂技能 (選填)',
                style: 2, // Paragraph
                required: false,
                placeholder: '說服:50 話術:40 魅惑:30 母語:80 汽車駕駛:40'
              }
            ]
          }
        ]
      }
    }
  }

  const supabase = getSupabase()

  // -------------------------------------------------------------
  // 子指令 2: /card view (查看當前活躍卡或指定卡片)[cite: 6, 9]
  // -------------------------------------------------------------
  if (subCommand === 'view') {
    const targetName = getSubOption('name')?.trim()
    const targetUserId = getSubOption('user') || callerId

    let query = supabase.schema('trpg').from('characters').select('*').eq('discord_id', targetUserId)
    if (targetName) {
      query = query.ilike('name', `%${targetName}%`)
    } else {
      query = query.eq('is_active', true)
    }

    const { data: char, error } = await query.maybeSingle()

    if (error || !char) {
      return {
        type: 4,
        data: {
          content: `❌ 查無相關角色卡！請確認姓名或使用 \`/card create\` 建立角色。`,
          flags: 64
        }
      }
    }

    return {
      type: 4,
      data: { embeds: [buildCharacterEmbed(char, avatar)] }
    }
  }

  // -------------------------------------------------------------
  // 子指令 3: /card list (列出用戶所有角色卡)
  // -------------------------------------------------------------
  if (subCommand === 'list') {
    const { data: list } = await supabase
      .schema('trpg')
      .from('characters')
      .select('name, is_active, hp, san, created_at')
      .eq('discord_id', callerId)
      .order('created_at', { ascending: true })

    if (!list || list.length === 0) {
      return {
        type: 4,
        data: {
          content: '📜 閣下目前尚未建立任何角色卡！請使用 `/card create` 開始創建。',
          flags: 64
        }
      }
    }

    const desc = list.map((c, i) => {
      const activeMark = c.is_active ? '⭐ **[出戰中]**' : ''
      return `\`${i + 1}.\` **${c.name}**${activeMark} ⎯ ❤️ HP: \`${c.hp}\` ｜ 🧠 SAN: \`${c.san}\``
    }).join('\n')

    return {
      type: 4,
      data: {
        embeds: [
          {
            title: '📋 閣下的調查員列表',
            description: `${desc}\n\n*提示：使用 \`/card switch name: 角色名\` 切換出戰角色。*`,
            color: 0x3498DB
          }
        ]
      }
    }
  }

  // -------------------------------------------------------------
  // 子指令 4: /card switch (原子級切換當前出戰卡)
  // -------------------------------------------------------------
  if (subCommand === 'switch') {
    const name = getSubOption('name')?.trim()
    if (!name) {
      return { type: 4, data: { content: '⚠️ 請指定要切換的角色名稱！', flags: 64 } }
    }

    // 調用在 Supabase 中預編譯的原子函數
    const { error } = await supabase.rpc('activate_character', {
      p_discord_id: callerId,
      p_character_name: name
    })

    if (error) {
      return { type: 4, data: { content: `❌ 切換失敗：${error.message}`, flags: 64 } }
    }

    return {
      type: 4,
      data: {
        content: `✅ 已將出戰角色成功切換為：**${name}**！後續 \`/cc\` 檢定將自動套用此卡數值。`
      }
    }
  }

  // -------------------------------------------------------------
  // 子指令 5: /card delete (刪除角色卡)[cite: 7]
  // -------------------------------------------------------------
  if (subCommand === 'delete') {
    const name = getSubOption('name')?.trim()
    if (!name) {
      return { type: 4, data: { content: '⚠️ 請指定要刪除的角色名稱！', flags: 64 } }
    }

    const { error } = await supabase
      .schema('trpg')
      .from('characters')
      .delete()
      .eq('discord_id', callerId)
      .eq('name', name)

    if (error) {
      return { type: 4, data: { content: `❌ 刪除失敗：${error.message}`, flags: 64 } }
    }

    return {
      type: 4,
      data: { content: `🗑️ 調查員 **${name}** 已被徹底清除。` }
    }
  }

  return { type: 4, data: { content: '未知子指令', flags: 64 } }
}

/**
 * 處理 Modal 提交後的持久化閉環 (Interaction Type 5)[cite: 7]
 */
export async function handleCardCreateModal(interaction: any, event: H3Event) {
  const callerId = interaction.member?.user?.id || interaction.user?.id
  const avatar = interaction.member?.user?.avatar 
    ? `https://cdn.discordapp.com/avatars/${callerId}/${interaction.member.user.avatar}.png`
    : undefined

  // ★ 好品味提取：將 ActionRows 拍平成強類型的 custom_id 鍵值字典，消除下標硬編碼
  const fieldMap: Record<string, string> = {}
  for (const row of interaction.data?.components || []) {
    const comp = row.components?.[0]
    if (comp?.custom_id) {
      fieldMap[comp.custom_id] = comp.value?.trim() || ''
    }
  }

  const charName = fieldMap.char_name
  if (!charName) {
    return { type: 4, data: { content: '⚠️ 角色名稱不得為空！', flags: 64 } }
  }

  // ★ 核心合流：將 4 個屬性與技能文字框優雅合併為一個標準文字區塊，直接送入解析器！
  const combinedRawStats = [
    fieldMap.base_attrs,
    fieldMap.skills_investigation,
    fieldMap.skills_combat,
    fieldMap.skills_other
  ].filter(Boolean).join('\n')

  // 1. 純函數解析（原有的解析引擎完全不需要動）
  const parsed = parseCharacterCard(combinedRawStats)
  const supabase = getSupabase()

  // 2. 存入 Supabase (同名覆蓋，並設為活躍卡)
  const payload = {
    discord_id: callerId,
    name: charName,
    is_active: true,
    hp: parsed.hp,
    mp: parsed.mp,
    san: parsed.san,
    attributes: parsed.attributes,
    skills: parsed.skills
  }

  // 重置同用戶的其他卡片活躍狀態
  await supabase.schema('trpg').from('characters').update({ is_active: false }).eq('discord_id', callerId)

  // 寫入當前卡片
  const { data: saved, error } = await supabase
    .schema('trpg')
    .from('characters')
    .upsert(payload, { onConflict: 'discord_id, name' })
    .select()
    .single()

  if (error || !saved) {
    return {
      type: 4,
      data: { content: `❌ 儲存至資料庫時發生異常：${error?.message}`, flags: 64 }
    }
  }

  return {
    type: 4,
    data: {
      content: `🎉 成功建立並啟用調查員 **${charName}**！`,
      embeds: [buildCharacterEmbed(saved, avatar)]
    }
  }
}