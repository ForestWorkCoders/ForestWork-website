// server/discord/commands/card.ts
import type { H3Event } from 'h3'
import { put } from '@vercel/blob'
import { COC_SKILL_CATEGORIES, BASE_ATTR_KEYS } from '../assets/coc-skills'
import { parseCharacterCard } from '../utils/cocParser'
import { getSupabase } from '../../utils/supabase'

// Discord embed limits: 25 fields, 1024 per field value, 4096 description, 6000 in total.
const EMBED_MAX_FIELDS = 25
const FIELD_VALUE_MAX = 1024
const DESCRIPTION_MAX = 4096
const EMBED_TOTAL_MAX = 6000
const BIO_PREVIEW_CHARS = 300

const ATTR_NAMES: Record<string, string> = {
  STR: '力量', CON: '體質', DEX: '敏捷', APP: '外貌', POW: '意志',
  INT: '智力', SIZ: '體型', EDU: '教育', LUK: '幸運'
}

// Cut to `max` UTF-16 units (the stricter count) without splitting an emoji in half.
function clip(text: string, max: number, tail = '…'): string {
  if (text.length <= max) return text
  let out = ''
  for (const ch of text) {
    if (out.length + ch.length > max - tail.length) break
    out += ch
  }
  return out + tail
}

// Split a line longer than one field value at its ' ｜ ' separators.
function splitLine(line: string, sep = ' ｜ '): string[] {
  if (line.length <= FIELD_VALUE_MAX) return [line]
  const parts: string[] = []
  let cur = ''
  for (const item of line.split(sep)) {
    if (cur && cur.length + sep.length + item.length > FIELD_VALUE_MAX) {
      parts.push(cur)
      cur = item
    } else {
      cur = cur ? cur + sep + item : item
    }
  }
  return cur ? [...parts, cur] : parts
}

// Pack lines into as few field values as fit: at most `maxFields` values and `maxChars` in all.
// Lines that don't fit are dropped and the last value ends with 「…」.
function packLines(lines: string[], maxFields: number, maxChars: number): string[] {
  const out: string[] = []
  let used = 0
  for (const raw of lines.flatMap(l => splitLine(l))) {
    const line = clip(raw, Math.min(FIELD_VALUE_MAX, maxChars - used))
    const last = out.length - 1
    const joins = last >= 0 && out[last]!.length + 1 + line.length <= FIELD_VALUE_MAX
    const cost = line.length + (joins ? 1 : 0)
    if (line.length === 0 || used + cost > maxChars || (!joins && out.length >= maxFields)) {
      if (last >= 0 && !out[last]!.endsWith('…')) out[last] = out[last]!.slice(0, FIELD_VALUE_MAX - 1) + '…'
      break
    }
    if (joins) out[last] += '\n' + line
    else out.push(line)
    used += cost
  }
  return out
}

function embedLength(e: any): number {
  return (e.title?.length || 0) + (e.description?.length || 0) + (e.author?.name?.length || 0)
    + (e.footer?.text?.length || 0)
    + e.fields.reduce((n: number, f: any) => n + f.name.length + f.value.length, 0)
}

// 2. 單張角色卡：生平 + 狀態 + 八圍 + 技能 (WL16)
function buildCharacterEmbed(char: any, fallbackAvatar?: string, opts: { fullBio?: boolean } = {}) {
  const attrs = char.attributes || {}
  const skills = char.skills || {}
  const displayAvatar = char.avatar_url || fallbackAvatar
  const hasInsanity = Boolean(char.insanity && char.insanity.trim().length > 0)
  const mythosVal = Number(skills['克蘇魯神話'] || skills['克苏鲁神话'] || 0)
  const maxSan = Math.max(0, 99 - mythosVal)

  const fields: any[] = [
    { name: '📌 當前生存狀態', value: '-----------' },
    { name: '❤️ HP', value: String(char.hp ?? 0), inline: true },
    { name: '🔮 MP', value: String(char.mp ?? 0), inline: true },
    { name: '🧠 SAN', value: `${char.san ?? 0} /${maxSan} (神話: ${mythosVal}%)` },
    hasInsanity
      ? { name: '🔥 精神狀態', value: `【${char.insanity}】`, inline: true }
      : { name: '🟢 精神狀態', value: '正常', inline: true },
    { name: '📊 基礎屬性 (八圍 + 幸運)', value: '-----------' },
    ...BASE_ATTR_KEYS.map(k => ({ name: `${k}（${ATTR_NAMES[k]}）`, value: String(attrs[k] || 0), inline: true }))
  ]

  // 技能：每個類別一行，其餘歸入自訂；每項技能只出現一次
  const listed = new Set<string>()
  const lines: string[] = []
  for (const [catName, catSkills] of Object.entries(COC_SKILL_CATEGORIES)) {
    const matched = catSkills.filter(sk => Number(skills[sk]) > 0)
    matched.forEach(sk => listed.add(sk))
    if (matched.length > 0) lines.push(`**${catName}**: ${matched.map(sk => `${sk} \`${skills[sk]}\``).join(' ｜ ')}`)
  }
  const custom = Object.entries(skills).filter(([sk, v]) => !listed.has(sk) && typeof v === 'number' && v > 0)
  custom.forEach(([sk]) => listed.add(sk))
  if (custom.length > 0) lines.push(`**🌟 自訂與特殊技能**: ${custom.map(([sk, v]) => `${sk} \`${v}\``).join(' ｜ ')}`)

  const embed: any = {
    author: char.is_active ? { name: '⭐ [當前出戰]' } : undefined,
    title: `📜 調查員檔案：${char.name}`,
    color: hasInsanity ? 0x9B59B6 : (char.is_active ? 0x2ECC71 : 0x3498DB),
    thumbnail: displayAvatar ? { url: displayAvatar } : undefined,
    fields,
    footer: {
      text: `林間小鎮 TRPG · 共載入 ${listed.size} 項有效技能`,
      icon_url: fallbackAvatar
    },
    timestamp: new Date().toISOString()
  }

  // 技能欄位：填滿剩餘欄位數，並先為生平保留空間 (full 時保留整篇)
  const story = (char.story || '').trim()
  const head = '## 生平\n\n'
  const hint = '\n\n*（使用 `/card view full:True` 看全文）*'
  const bioReserve = 100 + (opts.fullBio
    ? Math.min(DESCRIPTION_MAX, head.length + story.length)
    : head.length + BIO_PREVIEW_CHARS + hint.length)
  packLines(lines, EMBED_MAX_FIELDS - fields.length, EMBED_TOTAL_MAX - embedLength(embed) - bioReserve)
    .forEach((value, i) => fields.push({ name: i === 0 ? '🎯 技能' : '🎯 技能（續）', value }))

  // 生平：預設只顯示開頭，full 時顯示到總長上限為止
  const room = Math.min(DESCRIPTION_MAX, EMBED_TOTAL_MAX - embedLength(embed)) - head.length
  if (!story) {
    embed.description = `${head}*（尚未記錄生平。使用 \`/card edit name:${char.name} bio:True\` 撰寫。）*`
  } else if (opts.fullBio || story.length <= BIO_PREVIEW_CHARS) {
    embed.description = head + clip(story, room)
  } else {
    embed.description = head + clip(story, Math.min(BIO_PREVIEW_CHARS, room - hint.length)) + hint
  }

  return embed
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

// 檔案彈窗 (WL17)：只放入要求的部分。custom_id 用角色 id，避免中文姓名編碼後超過 100 字元。
const PROFILE_MODAL_PREFIX = 'trpg_profile_modal:'
const AVATAR_MAX_BYTES = 4.5 * 1024 * 1024

function buildProfileModal(char: any, parts: { bio: boolean, avatar: boolean }) {
  const components: any[] = []
  if (parts.bio) {
    components.push({
      type: 18, // LABEL
      label: '角色生平背景',
      description: '支援 Discord Markdown 語法，最多 4000 字',
      component: {
        type: 4, // TEXT_INPUT
        custom_id: 'story',
        style: 2,
        max_length: 4000,
        required: false,
        value: char.story || undefined,
        placeholder: '# 早期經歷\n出生於波士頓，熱愛研究古代文獻。'
      }
    })
  }
  if (parts.avatar) {
    components.push({
      type: 18,
      label: '上傳立繪圖片',
      description: '選填；與下方網址同時填寫時以上傳圖片為準',
      component: {
        type: 19, // FILE_UPLOAD
        custom_id: 'avatar_file',
        max_values: 1,
        required: false,
        file_types: ['image']
      }
    }, {
      type: 18,
      label: '或填寫圖片網址',
      description: '選填；必須是 https:// 開頭的公開圖片連結',
      component: {
        type: 4,
        custom_id: 'avatar_url',
        style: 1,
        max_length: 500,
        required: false,
        placeholder: 'https://i.imgur.com/example.png'
      }
    })
  }
  return {
    type: 9, // APPLICATION_MODAL
    data: {
      custom_id: `${PROFILE_MODAL_PREFIX}${char.id}`,
      title: clip(`編輯【${char.name}】的檔案`, 45),
      components
    }
  }
}

// 把上傳的圖片轉存到 Vercel Blob，回傳永久網址
async function storeAvatar(attachment: any, callerId: string): Promise<string> {
  const isImage = attachment.content_type
    ? String(attachment.content_type).startsWith('image/')
    : /\.(png|jpe?g|gif|webp)$/i.test(attachment.filename || '')
  if (!isImage) throw new Error('只接受圖片檔案')
  if (attachment.size && attachment.size > AVATAR_MAX_BYTES) throw new Error('圖片大小超過 4.5MB 限制，請壓縮後重試')
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN
  if (!blobToken) throw new Error('服務端缺少 BLOB_READ_WRITE_TOKEN 配置')

  const res = await fetch(attachment.url, { signal: AbortSignal.timeout(10000) })
  if (!res.ok) throw new Error(`從 Discord 下載圖片失敗 (HTTP ${res.status})`)
  const buffer = Buffer.from(await res.arrayBuffer())
  const ext = attachment.filename?.split('.').pop() || 'png'
  const blob = await put(`trpg-avatars/${callerId}/${Date.now()}.${ext}`, buffer, {
    access: 'public',
    contentType: attachment.content_type || 'image/png',
    token: blobToken
  })
  return blob.url
}

function isHttpsUrl(text: string): boolean {
  try { return new URL(text).protocol === 'https:' } catch { return false }
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
  // 子指令 3: /card view
  // -------------------------------------------------------------
  if (subCommand === 'view') {
    const targetName = getSubOption('name')?.trim()
    const targetUserId = getSubOption('user') || callerId

    const fullBio = getSubOption('full') === true

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
      data: { embeds: [buildCharacterEmbed(char, userDiscordAvatar, { fullBio })] }
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

    const { error } = await supabase.schema('trpg').rpc('activate_character', {
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

    const { data: deletedRows, error } = await supabase
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
  // 子指令 7: /card edit (狀態、屬性、技能；bio / avatar 開啟檔案彈窗)
  // -------------------------------------------------------------
  if (subCommand === 'edit') {
    const targetName = getSubOption('name')?.trim()
    const inputHp = getSubOption('hp')
    const inputSan = getSubOption('san')
    const inputMp = getSubOption('mp')
    const inputSkill = getSubOption('skill')?.trim()
    const inputAttr = getSubOption('attr')?.trim()
    const inputValue = getSubOption('value')
    const inputInsanity = getSubOption('insanity')?.trim()
    const wantBio = getSubOption('bio') === true
    const wantAvatar = getSubOption('avatar') === true

    if (!targetName) {
      return { type: 4, data: { content: '⚠️ 請指定要編輯的角色姓名 (`name`)。', flags: 64 } }
    }

    // 1. 查出目標角色卡 (姓名完全相符；name 由自動完成提供)
    const { data: char, error: fetchErr } = await supabase
      .schema('trpg').from('characters').select('*')
      .eq('discord_id', callerId).eq('name', targetName)
      .maybeSingle()
    if (fetchErr || !char) {
      return {
        type: 4,
        data: { content: `❌ 閣下名下查無名為 **${targetName}** 的角色卡！請從自動完成清單選擇，或先使用 \`/card create\` 建立角色。`, flags: 64 }
      }
    }

    // 2. bio / avatar：開啟檔案彈窗 (彈窗無法同時回報其他變更，因此不可混用)
    if (wantBio || wantAvatar) {
      const scalarGiven = [inputHp, inputSan, inputMp, inputSkill, inputAttr, inputValue, inputInsanity].some(v => v !== undefined)
      if (scalarGiven) {
        return {
          type: 4,
          data: { content: '⚠️ `bio` / `avatar` 會開啟編輯視窗，不能與 hp、san、mp、skill、attr、value、insanity 同時使用。請分兩次執行。', flags: 64 }
        }
      }
      return buildProfileModal(char, { bio: wantBio, avatar: wantAvatar })
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

    // 處理精神狀態更新 (填寫 'none', 'clear', '正常' 均視為消除瘋狂)
    if (inputInsanity !== undefined) {
      const isClearing = ['none', 'clear', '正常', '無', '0', '无'].includes(inputInsanity.toLowerCase())
      const finalInsanity = isClearing ? null : inputInsanity
      updatePayload.insanity = finalInsanity
      
      if (finalInsanity) {
        changes.push(`🐙 **精神異常**: \`【${finalInsanity}】\``)
      } else {
        changes.push(`✨ **精神狀態恢復正常**`)
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
          content: '⚠️ 未檢測到任何有效的變更參數！請至少提供 `hp`、`san`、`mp`、`insanity`、`skill + value`、`attr + value`，或使用 `bio:True` / `avatar:True` 開啟編輯視窗。',
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


// 收集彈窗欄位：同時支援 Label (component) 與舊的 Action Row (components)
function collectModalValues(nodes: any[], out: Record<string, any> = {}): Record<string, any> {
  for (const node of nodes || []) {
    if (node.component) collectModalValues([node.component], out)
    if (node.components) collectModalValues(node.components, out)
    if (node.custom_id) out[node.custom_id] = node.values ?? node.value
  }
  return out
}

/**
 * 處理檔案彈窗提交 (WL17)：生平與立繪
 */
export async function handleCardProfileModal(interaction: any, event: H3Event) {
  const callerId = interaction.member?.user?.id || interaction.user?.id
  const charId = (interaction.data?.custom_id || '').slice(PROFILE_MODAL_PREFIX.length)
  const fields = collectModalValues(interaction.data?.components)
  const update: Record<string, any> = {}
  const changes: string[] = []

  // 生平：欄位存在才更新 (空白即清除)
  if (typeof fields.story === 'string') {
    update.story = fields.story.trim()
    changes.push(update.story ? '🖋️ 生平背景已更新' : '🖋️ 生平背景已清除')
  }

  // 立繪：上傳優先，其次網址
  const fileId = Array.isArray(fields.avatar_file) ? fields.avatar_file[0] : undefined
  const avatarUrl = typeof fields.avatar_url === 'string' ? fields.avatar_url.trim() : ''
  try {
    if (fileId) {
      const attachment = interaction.data?.resolved?.attachments?.[fileId]
      if (!attachment?.url) throw new Error('無法獲取上傳的圖片檔案')
      update.avatar_url = await storeAvatar(attachment, callerId)
      changes.push('🎨 立繪已更新 (上傳圖片)')
    } else if (avatarUrl) {
      if (!isHttpsUrl(avatarUrl)) throw new Error('圖片網址必須以 https:// 開頭')
      update.avatar_url = avatarUrl
      changes.push('🎨 立繪已更新 (圖片網址)')
    }
  } catch (err: any) {
    console.error('[Profile Avatar Failed]:', err)
    return { type: 4, data: { content: `❌ 立繪更新失敗：${err?.message || '內部錯誤'}`, flags: 64 } }
  }

  if (changes.length === 0) {
    return { type: 4, data: { content: 'ℹ️ 未填寫任何內容，角色卡沒有變更。', flags: 64 } }
  }

  const { data: updated, error } = await getSupabase()
    .schema('trpg').from('characters')
    .update(update)
    .eq('id', charId).eq('discord_id', callerId)
    .select().maybeSingle()

  if (error || !updated) {
    return { type: 4, data: { content: `❌ 儲存角色檔案失敗：${error?.message || '查無相關角色卡'}`, flags: 64 } }
  }

  return {
    type: 4,
    data: {
      content: `✏️ 調查員 **${updated.name}** 檔案變更已同步：\n${changes.join('\n')}`,
      embeds: [buildCharacterEmbed(updated, undefined, { fullBio: typeof fields.story === 'string' })]
    }
  }
}

/**
 * 角色姓名自動完成 (/card edit name)：列出呼叫者自己的角色，出戰角色優先
 */
export async function handleCardAutocomplete(interaction: any) {
  const callerId = interaction.member?.user?.id || interaction.user?.id
  const options = interaction.data?.options?.[0]?.options || []
  const typed = String(options.find((o: any) => o.focused)?.value || '').trim().toLowerCase()

  const { data } = await getSupabase()
    .schema('trpg').from('characters')
    .select('name, is_active')
    .eq('discord_id', callerId)
    .order('is_active', { ascending: false })
    .order('created_at', { ascending: true })

  const choices = (data || [])
    .filter(c => c.name.toLowerCase().includes(typed))
    .slice(0, 25)
    .map(c => ({ name: clip(c.is_active ? `⭐ ${c.name}` : c.name, 100), value: c.name }))

  return { type: 8, data: { choices } } // APPLICATION_COMMAND_AUTOCOMPLETE_RESULT
}
