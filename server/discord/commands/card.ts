// server/discord/commands/card.ts
import type { H3Event } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { put } from '@vercel/blob'
import { getInteractionOption } from '../utils'
import { COC_SKILL_CATEGORIES, BASE_ATTR_KEYS } from '../assets/coc-skills'
import { parseCharacterCard } from '../utils/cocParser'

// 1. 获取 Supabase 管理端客户端
function getSupabase() {
  const url = process.env.SUPABASE_URL || ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || ''
  return createClient(url, serviceKey)
}

// 2. 格式化单张角色卡为精美的 Discord Embed (完整防弹版，消灭 ReferenceError)
function buildCharacterEmbed(char: any, fallbackAvatar?: string) {
  const attrs = char.attributes || {}
  const skills = char.skills || {}
  const displayAvatar = char.avatar_url || fallbackAvatar

  // 八围排版
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

  // 11 大技能分类排版
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
    thumbnail: displayAvatar ? { url: displayAvatar } : undefined,
    fields,
    footer: {
      text: `林間小鎮 TRPG · 共載入 ${validSkillCount} 項有效技能`,
      icon_url: fallbackAvatar
    },
    timestamp: new Date().toISOString()
  }
}

// 3. 統一解析相對變動 (+3, -5) 與絕對賦值 (12)
function applyDeltaOrValue(current: number, input?: string): number {
    if (!input) return current
    const trimmed = input.trim()
    if (trimmed.startsWith('+') || trimmed.startsWith('-')) {
      const delta = parseInt(trimmed, 10)
      return isNaN(delta) ? current : Math.max(0, current + delta)
    }
    const val = parseInt(trimmed, 10)
    return isNaN(val) ? current : Math.max(0, val)
  }

function buildCharacterBioEmbed(char: any) {
  return {
    title: `📖 調查員生平檔案：${char.name}`,
    // ★ 核心：直接把用戶寫的原始文本塞進 description，原生解析 Markdown 與換行！
    description: char.story || '*（該調查員目前尚未記錄任何生平背景故事。使用 `/card bio action: edit` 開始撰寫。）*',
    color: 0x9B59B6, // 優雅的神秘紫
    thumbnail: char.avatar_url ? { url: char.avatar_url } : undefined,
    fields: [
      {
        name: '📌 基礎身份',
        value: `❤️ **HP**: \`${char.hp}\` ｜ 🧠 **SAN**: \`${char.san}\` ｜ 狀態: \`${char.is_active ? '當前出戰' : '待命'}\``,
        inline: false
      }
    ],
    footer: {
      text: '林間小鎮 TRPG · 調查員傳記紀錄室',
      icon_url: '[https://i.imgur.com/cu2YAkn.png](https://i.imgur.com/cu2YAkn.png)'
    },
    timestamp: new Date().toISOString()
  }
}

// 4. 处理 /card 所有子命令分发
export async function handleCardCommand(interaction: any, event: H3Event) {
  const subCommand = interaction.data?.options?.[0]?.name
  const subOptions = interaction.data?.options?.[0]?.options || []

  const getSubOption = (name: string) => subOptions.find((o: any) => o.name === name)?.value
  const callerId = interaction.member?.user?.id || interaction.user?.id
  const userDiscordAvatar = interaction.member?.user?.avatar
    ? `https://cdn.discordapp.com/avatars/${callerId}/${interaction.member.user.avatar}.png`
    : undefined

  // -------------------------------------------------------------
  // 子指令 1: /card create (原生弹窗，零 I/O 极速直出)
  // -------------------------------------------------------------
  if (subCommand === 'create') {
    return {
      type: 9, // APPLICATION_MODAL
      data: {
        custom_id: 'trpg_card_create_modal',
        title: '建立 CoC 7版調查員角色卡',
        components: [
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: 'char_name',
                label: '1. 調查員姓名 (必填)',
                style: 1,
                min_length: 1,
                max_length: 50,
                required: true,
                placeholder: '例如：莉莉絲'
              }
            ]
          },
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: 'base_attrs',
                label: '2. 基礎屬性八圍 + 幸運 (必填)',
                style: 2,
                required: true,
                placeholder: '力量:60 體質:50 敏捷:70 外貌:50 意志:60 智力:70 體型:65 教育:80 幸運:50'
              }
            ]
          },
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: 'skills_investigation',
                label: '3. 調查與感知類技能 (選填)',
                style: 2,
                required: false,
                placeholder: '偵察:70 聆聽:60 心理學:50 圖書館:40 追蹤:20'
              }
            ]
          },
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: 'skills_combat',
                label: '4. 戰鬥、生存與行動類技能 (選填)',
                style: 2,
                required: false,
                placeholder: '閃避:35 鬥毆:60 手槍:50 急救:40 隱密行動:40'
              }
            ]
          },
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: 'skills_other',
                label: '5. 社交、知識與自訂技能 (選填)',
                style: 2,
                required: false,
                placeholder: '說服:50 話術:40 魅惑:30 母語:80 自動車駕駛:40'
              }
            ]
          }
        ]
      }
    }
  }

  // 后续指令按需调用 Supabase，杜绝提前初始化
  const supabase = getSupabase()

  // -------------------------------------------------------------
  // 子指令 2: /card avatar (专属立绘绑定：Vercel Blob 永久托管)
  // -------------------------------------------------------------
  if (subCommand === 'avatar') {
    const attachmentId = getSubOption('image')
    let imageUrl = getSubOption('url')?.trim()
    const targetName = getSubOption('name')?.trim()

    // 情况 A：用户只传了 URL，耗时极短（<100ms），走同步极速通道
    if (!attachmentId && imageUrl) {
      let query = supabase.schema('trpg').from('characters').update({ avatar_url: imageUrl }).eq('discord_id', callerId)
      if (targetName) query = query.eq('name', targetName)
      else query = query.eq('is_active', true)

      const { data: updated, error: dbError } = await query.select().maybeSingle()
      if (dbError || !updated) {
        return { type: 4, data: { content: `❌ 更新角色卡失敗：${dbError?.message || '查無相關角色卡'}`, flags: 64 } }
      }

      return {
        type: 4,
        data: {
          content: `🎨 已成功為調查員 **${updated.name}** 綁定立繪！`,
          embeds: [buildCharacterEmbed(updated, imageUrl)]
        }
      }
    }

    // 情况 B：用户上传了图片附件，耗时长，启动 Discord 原生 Deferred 异步通道！
    if (attachmentId) {
      const attachment = interaction.data?.resolved?.attachments?.[attachmentId]
      if (!attachment?.url) {
        return { type: 4, data: { content: '❌ 無法獲取上傳的圖片檔案！', flags: 64 } }
      }

      // 边界面向防守：限制 4.5MB
      if (attachment.size && attachment.size > 4.5 * 1024 * 1024) {
        return { type: 4, data: { content: '⚠️ 圖片大小超過 4.5MB，請壓縮後重試！', flags: 64 } }
      }

      const applicationId = interaction.application_id
      const interactionToken = interaction.token

      // ★★★ 核心好品味：将耗时的网络流转挂入后台，Serverless 不提前冻结！★★★
      event.waitUntil((async () => {
        try {
          // 1. 抓取图片并转存到 Vercel Blob
          const blobToken = process.env.BLOB_READ_WRITE_TOKEN
          const res = await fetch(attachment.url)
          if (!res.ok) throw new Error('無法從 Discord 下載圖片檔案')
          const arrayBuffer = await res.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)

          const ext = attachment.filename?.split('.').pop() || 'png'
          const pathname = `trpg-avatars/${callerId}/${Date.now()}.${ext}`

          const blob = await put(pathname, buffer, {
            access: 'public',
            contentType: attachment.content_type || 'image/png',
            token: blobToken
          })

          const uploadedUrl = blob.url

          // 2. 写入 Supabase
          let query = supabase.schema('trpg').from('characters').update({ avatar_url: uploadedUrl }).eq('discord_id', callerId)
          if (targetName) query = query.eq('name', targetName)
          else query = query.eq('is_active', true)

          const { data: updated, error: dbError } = await query.select().maybeSingle()
          if (dbError || !updated) throw new Error(dbError?.message || '查無匹配的出戰角色卡')

          // 3. 通过 Discord 原生 Followup Webhook 回写终态卡片（无须 Bot Token！）
          const followupUrl = `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`
          await fetch(followupUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `🎨 已成功為調查員 **${updated.name}** 綁定永久立繪！`,
              embeds: [buildCharacterEmbed(updated, uploadedUrl)]
            })
          })
        } catch (err: any) {
          console.error('[Async Avatar Pipeline Error]:', err)
          // 报错时向用户回显失败信息
          const followupUrl = `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`
          await fetch(followupUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `❌ 上傳立繪失敗：${err?.message || '處理逾時或網路錯誤'}`
            })
          }).catch(() => { })
        }
      })())

      // ★★★ 核心好品味：0.05 秒秒回 Type 5，瞬间击碎 3 秒熔断！★★★
      return {
        type: 5 // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE (通知 Discord 客户端进入思考中)
      }
    }

    return {
      type: 4,
      data: { content: '⚠️ 請至少拖入一張圖片檔案，或在 url 參數填寫圖片網址！', flags: 64 }
    }
  }

  // -------------------------------------------------------------
  // 子指令 3: /card view
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
      data: { embeds: [buildCharacterEmbed(char, userDiscordAvatar)] }
    }
  }

  // -------------------------------------------------------------
  // 子指令 4: /card list
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
  // 子指令 5: /card switch
  // -------------------------------------------------------------
  if (subCommand === 'switch') {
    const name = getSubOption('name')?.trim()
    if (!name) {
      return { type: 4, data: { content: '⚠️ 請指定要切換的角色名稱！', flags: 64 } }
    }

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
        content: `✅ 已將出戰角色成功切換為：**${name}**！後續檢定將自動套用此卡數值。`
      }
    }
  }

  // -------------------------------------------------------------
  // 子指令 6: /card delete
  // -------------------------------------------------------------
  if (subCommand === 'delete') {
    const name = getSubOption('name')?.trim()
    if (!name) {
      return { type: 4, data: { content: '⚠️ 請指定要刪除的角色名稱！', flags: 64 } }
    }

    const { data:deletedRows, error } = await supabase
      .schema('trpg')
      .from('characters')
      .delete()
      .eq('discord_id', callerId)
      .eq('name', name)
      .select()

    if (error) {
      return { type: 4, data: { content: `❌ 刪除失敗：${error.message}`, flags: 64 } }
    }

    if (!deletedRows || deletedRows.length === 0) {
      return {
        type: 4,
        data: {
          content: `⚠️ 刪除無效：閣下名下查無名為 **${name}** 的調查員！（你無法刪除其他玩家的角色卡）`,
          flags: 64
        }
      }
    }

    return {
      type: 4,
      data: { content: `🗑️ 調查員 **${name}** 已被徹底清除。` }
    }
  }

  // -------------------------------------------------------------
  // 子指令 7: /card edit (局部狀態微調與數值增減)
  // -------------------------------------------------------------
  if (subCommand === 'edit') {
    const targetName = getSubOption('name')?.trim()
    const inputHp = getSubOption('hp')
    const inputSan = getSubOption('san')
    const inputMp = getSubOption('mp')
    const inputSkill = getSubOption('skill')?.trim()
    const inputAttr = getSubOption('attr')?.trim()
    const inputValue = getSubOption('value')

    // 1. 查出目標角色卡
    let query = supabase.schema('trpg').from('characters').select('*').eq('discord_id', callerId)
    if (targetName) query = query.eq('name', targetName)
    else query = query.eq('is_active', true)

    const { data: char, error: fetchErr } = await query.maybeSingle()
    if (fetchErr || !char) {
      return {
        type: 4,
        data: { content: '❌ 找不到匹配的角色卡！請確認姓名或先使用 `/card create` 建立角色。', flags: 64 }
      }
    }

    const changes: string[] = []
    const updatePayload: Record<string, any> = {}

    // 2. 處理核心狀態標量增減 (HP, SAN, MP)
    if (inputHp !== undefined) {
      const newHp = applyDeltaOrValue(char.hp, String(inputHp))
      if (newHp !== char.hp) {
        updatePayload.hp = newHp
        changes.push(`❤️ **HP**: \`${char.hp}\` ➔ \`${newHp}\``)
      }
    }

    if (inputSan !== undefined) {
      const newSan = applyDeltaOrValue(char.san, String(inputSan))
      if (newSan !== char.san) {
        updatePayload.san = newSan
        changes.push(`🧠 **SAN**: \`${char.san}\` ➔ \`${newSan}\``)
      }
    }

    if (inputMp !== undefined) {
      const newMp = applyDeltaOrValue(char.mp, String(inputMp))
      if (newMp !== char.mp) {
        updatePayload.mp = newMp
        changes.push(`🔮 **MP**: \`${char.mp}\` ➔ \`${newMp}\``)
      }
    }

    // 3. 處理特定技能修改
    if (inputSkill && inputValue !== undefined) {
      const skills = { ...(char.skills || {}) }
      const oldVal = skills[inputSkill] || 0
      skills[inputSkill] = Math.max(0, Number(inputValue))
      updatePayload.skills = skills
      changes.push(`🛠️ **技能【${inputSkill}】**: \`${oldVal}\` ➔ \`${inputValue}\``)
    }

    // 4. 處理八圍屬性修改
    if (inputAttr && inputValue !== undefined) {
      // 自動轉換別名 (例如 "力量" -> "STR")
      const canonical = inputAttr.toUpperCase() === 'STR' || inputAttr === '力量' ? 'STR'
        : inputAttr.toUpperCase() === 'CON' || inputAttr === '體質' ? 'CON'
        : inputAttr.toUpperCase() === 'DEX' || inputAttr === '敏捷' ? 'DEX'
        : inputAttr.toUpperCase() === 'APP' || inputAttr === '外貌' ? 'APP'
        : inputAttr.toUpperCase() === 'POW' || inputAttr === '意志' ? 'POW'
        : inputAttr.toUpperCase() === 'INT' || inputAttr === '智力' ? 'INT'
        : inputAttr.toUpperCase() === 'SIZ' || inputAttr === '體型' ? 'SIZ'
        : inputAttr.toUpperCase() === 'EDU' || inputAttr === '教育' ? 'EDU'
        : inputAttr.toUpperCase() === 'LUK' || inputAttr === '幸運' ? 'LUK'
        : inputAttr.toUpperCase()

      const attrs = { ...(char.attributes || {}) }
      const oldVal = attrs[canonical] || 0
      attrs[canonical] = Math.max(0, Number(inputValue))
      updatePayload.attributes = attrs
      changes.push(`📊 **屬性【${canonical}】**: \`${oldVal}\` ➔ \`${inputValue}\``)
    }

    if (changes.length === 0) {
      return {
        type: 4,
        data: {
          content: '⚠️ 未檢測到任何有效的變更參數！請至少提供 `hp`、`san`、`mp` 或 `skill + value` 進行修改。',
          flags: 64
        }
      }
    }

    // 5. 寫入 Supabase
    const { data: updated, error: updateErr } = await supabase
      .schema('trpg')
      .from('characters')
      .update(updatePayload)
      .eq('id', char.id)
      .select()
      .single()

    if (updateErr || !updated) {
      return {
        type: 4,
        data: { content: `❌ 更新角色失敗：${updateErr?.message || '內部錯誤'}`, flags: 64 }
      }
    }

    // 6. 回顯變動明細與更新後的完整 Embed
    return {
      type: 4,
      data: {
        content: `✏️ 調查員 **${updated.name}** 檔案變更已同步：\n${changes.join('\n')}`,
        embeds: [buildCharacterEmbed(updated)]
      }
    }
  }

  // -------------------------------------------------------------
  // 子指令 8: /card bio (檢視或開啟彈窗編寫背景故事)
  // -------------------------------------------------------------
  if (subCommand === 'bio') {
    const action = getSubOption('action')
    const targetName = getSubOption('name')?.trim()

    // 1. 若是 view 操作：直接查庫並回顯 Bio Embed
    if (action === 'view') {
      let query = supabase.schema('trpg').from('characters').select('*').eq('discord_id', callerId)
      if (targetName) query = query.ilike('name', `%${targetName}%`)
      else query = query.eq('is_active', true)

      const { data: char, error } = await query.maybeSingle()
      if (error || !char) {
        return {
          type: 4,
          data: { content: '❌ 查無相關角色卡！請確認姓名或使用 `/card create` 建立角色。', flags: 64 }
        }
      }

      return {
        type: 4,
        data: { embeds: [buildCharacterBioEmbed(char)] }
      }
    }

    // 2. 若是 edit 操作：直接彈出一個 4000 字符的專用大文字框！
    if (action === 'edit') {
      // 先查出當前角色卡既有故事（若有），預填回輸入框
      let query = supabase.schema('trpg').from('characters').select('name, story').eq('discord_id', callerId)
      if (targetName) query = query.ilike('name', `%${targetName}%`)
      else query = query.eq('is_active', true)

      const { data: char } = await query.maybeSingle()
      if (!char) {
        return {
          type: 4,
          data: { content: '❌ 找不到要編輯故事的角色卡！請先使用 `/card create` 建立角色。', flags: 64 }
        }
      }

      return {
        type: 9, // APPLICATION_MODAL
        data: {
          // custom_id 把角色名字帶上，保持無狀態路由
          custom_id: `trpg_bio_modal:${encodeURIComponent(char.name)}`,
          title: `撰寫【${char.name}】的背景故事`,
          components: [
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'story_content',
                  label: '角色生平背景 (支援 Discord Markdown 語法)',
                  style: 2, // Paragraph
                  min_length: 0,
                  max_length: 4000, // ★ 頂格用滿 Discord 物理配額
                  required: false,
                  value: char.story || '', // 回填既有文本
                  placeholder: '# 早期經歷\n出生於波士頓，熱愛研究古代文獻。\n\n> 「有些真相，永遠埋在泥土下會更好。」\n\n- 核心信念：追求知識\n- 重大創傷：曾目睹家族古宅的大火'
                }
              ]
            }
          ]
        }
      }
    }
  }

  return { type: 4, data: { content: '⚠️ 未知子指令', flags: 64 } }
}

// 4. 处理 Modal 提交 (MODAL_SUBMIT)
export async function handleCardCreateModal(interaction: any, event: H3Event) {
  const callerId = interaction.member?.user?.id || interaction.user?.id
  const userDiscordAvatar = interaction.member?.user?.avatar
    ? `https://cdn.discordapp.com/avatars/${callerId}/${interaction.member.user.avatar}.png`
    : undefined

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

  const combinedRawStats = [
    fieldMap.base_attrs,
    fieldMap.skills_investigation,
    fieldMap.skills_combat,
    fieldMap.skills_other
  ].filter(Boolean).join('\n')

  const parsed = parseCharacterCard(combinedRawStats)
  const supabase = getSupabase()

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

  await supabase.schema('trpg').from('characters').update({ is_active: false }).eq('discord_id', callerId)

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
      embeds: [buildCharacterEmbed(saved, userDiscordAvatar)]
    }
  }
}

/**
 * 處理 Bio 表單提交持久化
 */
export async function handleCardBioModal(interaction: any, event: H3Event) {
  const callerId = interaction.member?.user?.id || interaction.user?.id
  const customId = interaction.data?.custom_id || ''
  const charName = decodeURIComponent(customId.replace('trpg_bio_modal:', ''))

  const storyContent = interaction.data?.components?.[0]?.components?.[0]?.value?.trim() || ''

  const supabase = getSupabase()

  // 更新該調查員的 story 欄位
  const { data: updated, error } = await supabase
    .schema('trpg')
    .from('characters')
    .update({ story: storyContent })
    .eq('discord_id', callerId)
    .eq('name', charName)
    .select()
    .single()

  if (error || !updated) {
    return {
      type: 4,
      data: { content: `❌ 儲存背景故事失敗：${error?.message || '內部錯誤'}`, flags: 64 }
    }
  }

  return {
    type: 4,
    data: {
      content: `🖋️ 已成功更新調查員 **${charName}** 的生平背景檔案！`,
      embeds: [buildCharacterBioEmbed(updated)]
    }
  }
}