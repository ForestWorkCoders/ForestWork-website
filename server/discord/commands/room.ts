// server/discord/commands/room.ts
import { waitUntil } from '@vercel/functions'
import { getSupabase } from '../../utils/supabase'

// ★★★ 核心門禁：跑團房間管理專屬身分組 ID ★★★
const REQUIRED_ROOM_ROLE_ID = '919954440709087252'
const REQUIRED_PARENT_CHANNEL_ID = '1556515164252278904'

/**
 * 斯巴達式 Discord REST API 內部調用器
 */
async function discordApi(path: string, method: string = 'GET', body?: any) {
  const token = process.env.DISCORD_BOT_TOKEN
  if (!token) throw new Error('[Fatal] 缺少 DISCORD_BOT_TOKEN 環境變數！')

  const res = await fetch(`https://discord.com/api/v10${path}`, {
    method,
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Discord API ${method}${path} 失敗 (${res.status}):${errText}`)
  }

  return method === 'GET' || res.status !== 204 ? await res.json().catch(() => ({})) : null
}

/**
 * 輔助函數：從 options 陣列中快速提取純淨值
 */
function getOptionValue<T = any>(options: any[] | undefined, name: string): T | undefined {
  return options?.find((o: any) => o.name === name)?.value
}

// ============================================================================
// Discord wants the first reply within 3 s, and creating threads + saving can take longer
// (cold start). Reply "thinking…" at once, finish in the background, then replace that reply
// with the result. Quick checks run before this, so their errors stay instant and private.
// ============================================================================
function deferReply(interaction: any, work: () => Promise<string>) {
  const appId = process.env.DISCORD_APPLICATION_ID || interaction.application_id
  const url = `https://discord.com/api/v10/webhooks/${appId}/${interaction.token}/messages/@original`

  const task = work()
    .catch((err: any) => `❌ ${err.message}`)
    .then(content => fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    }))
    .then(async (res) => {
      if (!res.ok) console.error('[Room Reply Edit Failed]:', res.status, await res.text().catch(() => ''))
    })
    .catch((err: any) => console.error('[Room Reply Edit Failed]:', err))

  waitUntil(task)
  return { type: 5 } // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
}

/**
 * Find the room a thread belongs to (main thread or GM thread).
 * Returns the row, null when there is none, or throws when the database can't be read.
 */
async function findRoom(channelId: string) {
  const { data, error } = await getSupabase()
    .schema('trpg')
    .from('room_sessions')
    .select('*')
    .or(`main_thread_id.eq.${channelId},gm_thread_id.eq.${channelId}`)
    .maybeSingle()

  if (error) throw new Error(`讀取房間資料失敗：${error.message}`)
  return data
}

const NOT_A_ROOM = { type: 4, data: { content: '❌ 當前頻道不是一個進行中的跑團房間子區！', flags: 64 } }
const dbReadFailed = (err: any) => ({ type: 4, data: { content: `❌ ${err.message}`, flags: 64 } })

// ============================================================================
// 子指令 1: 開啟跑團房間 (/room open)
// ============================================================================
async function handleOpen(interaction: any, subOptions: any[]) {
  const channelId = String(interaction.channel_id)
  const callerId = String(interaction.member?.user?.id || interaction.user?.id)
  const title = getOptionValue<string>(subOptions, 'title') || '未命名模組'
  const coGmId = getOptionValue<string>(subOptions, 'co_gm')

  if (channelId !== REQUIRED_PARENT_CHANNEL_ID) {
    return {
      type: 4,
      data: {
        content: `🛑 **位置錯誤**：開房指令 \`/room open\` 僅限於在專屬跑團大廳 <#${REQUIRED_PARENT_CHANNEL_ID}> 執行！`,
        flags: 64 // 僅自己可見
      }
    }
  }

  return deferReply(interaction, async () => {
    // 1. 建立兩個私密子區
    const [mainThread, gmThread] = await Promise.all([
      discordApi(`/channels/${channelId}/threads`, 'POST', {
        name: `🎲-${title}`,
        auto_archive_duration: 1440,
        type: 12,
        invitable: false
      }),
      discordApi(`/channels/${channelId}/threads`, 'POST', {
        name: `🔒-${title}-GM暗骰箱`,
        auto_archive_duration: 1440,
        type: 12,
        invitable: false
      })
    ])

    const allGms = [callerId]
    if (coGmId && coGmId !== callerId) allGms.push(coGmId)

    // 2. 存檔。失敗就刪掉剛建的子區，GM 可直接重開，不留半成品
    const { error } = await getSupabase().schema('trpg').from('room_sessions').insert({
      main_thread_id: mainThread.id,
      gm_thread_id: gmThread.id,
      room_name: title,
      gm_ids: allGms,
      status: 'ACTIVE'
    })

    if (error) {
      console.error('[Room Open Save Failed]:', error)
      const removed = await Promise.allSettled([
        discordApi(`/channels/${mainThread.id}`, 'DELETE'),
        discordApi(`/channels/${gmThread.id}`, 'DELETE')
      ])
      const cleanup = removed.every(r => r.status === 'fulfilled')
        ? '剛建立的子區已刪除，請重新執行 `/room open`。'
        : `子區刪除失敗，請手動刪除 <#${mainThread.id}> 與 <#${gmThread.id}> 後再重開。`
      return `❌ **開房失敗**：無法儲存房間（${error.message}）。${cleanup}`
    }

    // 3. 在兩個子區 @GM，Discord 會把 GM 拉進私密子區
    const gmTagText = allGms.map(id => `<@${id}>`).join(' ')
    try {
      await Promise.all([
        discordApi(`/channels/${mainThread.id}/messages`, 'POST', {
          content: `📢 ${gmTagText} **跑團專屬包廂已就緒！**\n> 💡 *本子區已完全私密隔離。請在此處 **@提及（tag）** 參團調查員，系統將自動授權並拉他們進群。*`
        }),
        discordApi(`/channels/${gmThread.id}/messages`, 'POST', {
          content: `🔒 ${gmTagText} **GM 私密暗骰箱已就緒！**\n> 💡 *所有暗骰點數將自動同步至此處，本子區僅 GM 陣營可見。*`
        })
      ])
    } catch (err: any) {
      return `⚠️ **房間【${title}】已建立並存檔**，但無法在子區 @GM（${err.message}）。\n> 請 GM 手動前往 <#${mainThread.id}> 與 <#${gmThread.id}>。`
    }

    const coGmText = coGmId ? ` ｜ 協作副 GM: <@${coGmId}>` : ''
    return [
      `🎉 **跑團專屬包廂【${title}】建立成功！**`,
      `> 📖 **主線私密包廂**: <#${mainThread.id}> *(非參團成員不可見)*`,
      `> 🔒 **GM 私密暗骰箱**: <#${gmThread.id}> *(僅 GM 陣營可見)*`,
      `> 🎭 主持人: <@${callerId}>${coGmText}`,
      `*(GM 陣營已自動授權加入兩大子區，請進主線 @玩家 邀請入群)*`
    ].join('\n')
  })
}

// ============================================================================
// 子指令 2: 追加 GM (/room add_gm)
// ============================================================================
async function handleAddGm(interaction: any, subOptions: any[]) {
  const currentChannelId = String(interaction.channel_id)
  const callerId = String(interaction.member?.user?.id || interaction.user?.id)
  const targetUserId = getOptionValue<string>(subOptions, 'user')

  if (!targetUserId) {
    return { type: 4, data: { content: '⚠️ 請指定一位要晉升為協作 GM 的成員！', flags: 64 } }
  }

  let room: any
  try {
    room = await findRoom(currentChannelId)
  } catch (err: any) {
    return dbReadFailed(err)
  }

  if (!room || room.status !== 'ACTIVE') return NOT_A_ROOM

  if (!room.gm_ids.includes(callerId)) {
    return { type: 4, data: { content: '🛑 閣下不是當前房間的 GM，無權授權新 GM！', flags: 64 } }
  }

  return deferReply(interaction, async () => {
    // 先存檔，再 @新 GM：通知發出去時，權限一定已經生效
    const updatedGmIds = Array.from(new Set([...room.gm_ids, targetUserId]))
    const { error } = await getSupabase()
      .schema('trpg')
      .from('room_sessions')
      .update({ gm_ids: updatedGmIds })
      .eq('id', room.id)

    if (error) return `❌ **追加 GM 失敗**：無法儲存（${error.message}）。`

    try {
      await Promise.all([
        discordApi(`/channels/${room.main_thread_id}/messages`, 'POST', {
          content: `🛡️ 歡迎新 GM <@${targetUserId}> 加入主持團隊！`
        }),
        discordApi(`/channels/${room.gm_thread_id}/messages`, 'POST', {
          content: `🛡️ <@${targetUserId}> 已獲取暗骰箱監聽權限。`
        })
      ])
    } catch (err: any) {
      return `⚠️ <@${targetUserId}> 已登記為 **【${room.room_name}】** 的 GM，但無法在子區 @提及（${err.message}）。\n> 請手動邀請進入 <#${room.main_thread_id}> 與 <#${room.gm_thread_id}>。`
    }

    return `🛡️ <@${targetUserId}> 已成功加入 **【${room.room_name}】** GM 陣營！\n> 私密暗骰與後台: <#${room.gm_thread_id}>`
  })
}

// ============================================================================
// 子指令 3: 結案存檔 (/room close)
// ============================================================================
async function handleClose(interaction: any, subOptions: any[]) {
  const currentChannelId = String(interaction.channel_id)
  const callerId = String(interaction.member?.user?.id || interaction.user?.id)
  const summary = getOptionValue<string>(subOptions, 'summary') || '模組圓滿完結'

  // 1. 取得當前房間 (支援在 main_thread 或 gm_thread 敲指令結案)
  let room: any
  try {
    room = await findRoom(currentChannelId)
  } catch (err: any) {
    return dbReadFailed(err)
  }

  if (!room) return NOT_A_ROOM

  if (room.status === 'ARCHIVED') {
    const closedDate = room.ended_at ? room.ended_at.split('T')[0] : '先前'
    return {
      type: 4,
      data: {
        content: `⚠️ **請勿重複結案**：本模組【${room.room_name}】已於 \`${closedDate}\` 結案歸檔！\n> 當前為歷史只讀存檔，無需再次執行關閉。`,
        flags: 64
      }
    }
  }

  // 2. 權限檢查：必須由本房間已登記的 GM 執行結團
  if (!room.gm_ids.includes(callerId)) {
    return {
      type: 4,
      data: { content: '🛑 閣下不是本房間的 GM，無權執行結團存檔！', flags: 64 }
    }
  }

  return deferReply(interaction, async () => {
    // 3. 先存檔：存不進去就不上鎖，房間保持可用，GM 可再試
    const { error } = await getSupabase()
      .schema('trpg')
      .from('room_sessions')
      .update({
        status: 'ARCHIVED',
        summary: summary,
        ended_at: new Date().toISOString()
      })
      .eq('id', room.id)

    if (error) return `❌ **結案失敗**：無法儲存（${error.message}）。子區未上鎖，請稍後再執行 \`/room close\`。`

    // 4. 鎖死並歸檔兩個子區，記下鎖不上的
    const lock = (threadId: string) =>
      discordApi(`/channels/${threadId}`, 'PATCH', { archived: true, locked: true })
        .then(() => true)
        .catch((e: any) => {
          console.error(`[Thread Lock Failed for ${threadId}]:`, e.message)
          return false
        })

    const threads = [room.main_thread_id, room.gm_thread_id]
    const locked = await Promise.all(threads.map(lock))
    const unlocked = threads.filter((_, i) => !locked[i])

    const gms = (room.gm_ids || []).map((id: string) => `<@${id}>`).join(' ')
    const playersText = room.player_ids && room.player_ids.length > 0
      ? room.player_ids.map((id: string) => `<@${id}>`).join(' ')
      : '無其他參團玩家 *(僅 GM 測試或全員無擲骰)*'
    const lockText = unlocked.length === 0
      ? `*(主線與暗骰子區已物理上鎖封存，輸入 \`/room archive\` 可隨時檢索調閱)*`
      : `⚠️ 以下子區未能上鎖，請手動鎖定：${unlocked.map(id => `<#${id}>`).join(' ')}\n*(已存檔，輸入 \`/room archive\` 可隨時檢索調閱)*`

    return [
      `🏁 **【跑團正式完結存檔】**`,
      `> 模組: **${room.room_name}**`,
      `> 結案簡報: *${summary}*`,
      `> 主持團隊: ${gms}`,
      `> 參團成員: ${playersText}`,
      lockText
    ].join('\n')
  })
}

// ============================================================================
// 子指令 4: 檔案館檢索 (/room archive)
// ============================================================================
async function handleArchive(interaction: any, subOptions: any[]) {
  const guildId = String(interaction.guild_id || '')
  const callerId = String(interaction.member?.user?.id || interaction.user?.id)
  const filterGmId = getOptionValue<string>(subOptions, 'gm')
  const filterPlayerId = getOptionValue<string>(subOptions, 'player')
  const page = Math.max(1, Number(getOptionValue<number>(subOptions, 'page') || 1))
  const pageSize = 5

  const supabase = getSupabase()

  let query = supabase
    .schema('trpg')
    .from('room_sessions')
    .select('id, room_name, main_thread_id, gm_ids, player_ids, summary, created_at, ended_at', { count: 'exact' })
    .eq('status', 'ARCHIVED')
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (filterGmId) {
    query = query.contains('gm_ids', [filterGmId])
  } else if (filterPlayerId) {
    query = query.contains('player_ids', [filterPlayerId])
  } else {
    query = query.or(`gm_ids.cs.{"${callerId}"},player_ids.cs.{"${callerId}"}`)
  }

  const { data: runs, count, error } = await query

  if (error || !runs || runs.length === 0) {
    const hint = filterGmId ? ` (GM: <@${filterGmId}>)` : filterPlayerId ? ` (玩家: <@${filterPlayerId}>)` : ' (包含閣下)'
    return {
      type: 4,
      data: {
        content: `📂 **TRPG 檔案館**：未檢索到任何已歸檔的跑團記錄${hint}。`,
        flags: 64
      }
    }
  }

  const totalRuns = count || runs.length
  const totalPages = Math.ceil(totalRuns / pageSize)

  const recordsText = runs.map((run, idx) => {
    const seq = (page - 1) * pageSize + idx + 1
    const dateStr = run.created_at ? run.created_at.split('T')[0] : '未知'
    const deepLink = `https://discord.com/channels/${guildId}/${run.main_thread_id}`
    const gms = (run.gm_ids || []).map((id: string) => `<@${id}>`).join(' ')

    return [
      `\`#${seq}\` **[${run.room_name}](${deepLink})** · \`${dateStr}\``,
      `> 🎭 GM: ${gms} ｜ 👥 玩家數: \`${(run.player_ids || []).length}\` 人`,
      `> 📝 結局: *${run.summary || '無總結紀錄'}*`,
      `> 🔗 現場傳送門: [點擊跳轉對局現場](${deepLink})`
    ].join('\n')
  }).join('\n\n')

  return {
    type: 4,
    data: {
      embeds: [{
        title: '🏛️ TRPG 跑團中央檔案館',
        description: [
          `累計歸檔對局：\`${totalRuns}\` 場 ｜ 頁碼：\`${page}/${totalPages}\`\n`,
          recordsText
        ].join('\n'),
        color: 0x2C3E50,
        footer: { text: '使用 /room archive [gm: @用戶] [player: @用戶] [page: 數字] 進行篩選翻頁' }
      }]
    }
  }
}

// ============================================================================
// ★ 全域統一調度入口：handleRoomCommand (補齊身分組門禁與完整任務分發)
// ============================================================================
export async function handleRoomCommand(interaction: any) {
  // 1. 身分組門禁檢查
  const callerRoles: string[] = interaction.member?.roles || []
  if (!callerRoles.includes(REQUIRED_ROOM_ROLE_ID)) {
    return {
      type: 4,
      data: {
        content: `🛑 **權限不足**：此跑團房間指令僅限持有專屬身分組 (<@&${REQUIRED_ROOM_ROLE_ID}>) 的 GM 成員執行！`,
        flags: 64
      }
    }
  }

  // 2. 子命令解析與分發
  const subCommandObj = interaction.data?.options?.[0]
  const subCommand = subCommandObj?.name
  const subOptions = subCommandObj?.options || []

  switch (subCommand) {
    case 'open':
      return await handleOpen(interaction, subOptions)
    case 'add_gm':
      return await handleAddGm(interaction, subOptions)
    case 'close':
      return await handleClose(interaction, subOptions)
    case 'archive':
      return await handleArchive(interaction, subOptions)
    default:
      return {
        type: 4,
        data: { content: '❌ 未知的房間子指令！', flags: 64 }
      }
  }
}