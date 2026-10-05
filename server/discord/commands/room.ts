// server/discord/commands/room.ts
import { getSupabase } from '../../utils/supabase'

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
// 子指令 1: 開啟跑團房間 (/room open)
// ============================================================================
async function handleOpen(interaction: any, subOptions: any[]) {
  const channelId = String(interaction.channel_id)
  const callerId = String(interaction.member?.user?.id || interaction.user?.id)
  const title = getOptionValue<string>(subOptions, 'title') || '未命名模組'
  const coGmId = getOptionValue<string>(subOptions, 'co_gm')

  try {
    // 1. 建立公開主線子區 (type: 11) - 24 小時無發言自動歸檔
    const mainThread = await discordApi(`/channels/${channelId}/threads`, 'POST', {
      name: `🎲-${title}`,
      auto_archive_duration: 1440,
      type: 11
    })

    // 2. 建立私密暗骰子區 (type: 12) - 僅 GM 與 Bot 可見
    const gmThread = await discordApi(`/channels/${channelId}/threads`, 'POST', {
      name: `🔒-${title}-GM暗骰箱`,
      auto_archive_duration: 1440,
      type: 12,
      invitable: false
    })

    // 3. 把主 GM (發起人) 拉進私密暗骰子區
    await discordApi(`/channels/${gmThread.id}/thread-members/${callerId}`, 'PUT')

    // 4. 若指定了副 GM，同步拉入
    const initialGms = [callerId]
    if (coGmId && coGmId !== callerId) {
      await discordApi(`/channels/${gmThread.id}/thread-members/${coGmId}`, 'PUT')
      initialGms.push(coGmId)
    }

    // 5. 狀態落庫 (Supabase)
    const supabase = getSupabase()
    const { error: dbError } = await supabase.schema('trpg').from('room_sessions').insert({
      main_thread_id: mainThread.id,
      gm_thread_id: gmThread.id,
      room_name: title,
      gm_ids: initialGms,
      status: 'ACTIVE'
    })

    if (dbError) {
      console.error('[Room Open DB Error]:', dbError)
      return { type: 4, data: { content: `⚠️ 子區已建立，但資料庫登記失敗：${dbError.message}`, flags: 64 } }
    }

    const coGmText = coGmId ? ` ｜ 協作副 GM: <@${coGmId}>` : ''
    return {
      type: 4,
      data: {
        content: [
          `🎉 **跑團房間【${title}】建立成功！**`,
          `> 📖 **主線劇情與公骰子區**: <#${mainThread.id}>`,
          `> 🔒 **GM 私密暗骰與後台**: <#${gmThread.id}> *(僅 GM 陣營可見)*`,
          `> 🎭 主持人: <@${callerId}>${coGmText}`,
          `*(本房間基於 Thread 架構，零消耗伺服器 500 頻道配額；跑團結束請在主線輸入 \`/room close\` 存檔)*`
        ].join('\n')
      }
    }
  } catch (err: any) {
    console.error('[Room Open Error]:', err)
    return { type: 4, data: { content: `❌ 開房失敗：${err.message}`, flags: 64 } }
  }
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

  const supabase = getSupabase()

  // 1. 查詢當前子區是否為合法活躍房間 (支援在 main_thread 或 gm_thread 敲指令)
  const { data: room, error } = await supabase
    .schema('trpg')
    .from('room_sessions')
    .select('*')
    .or(`main_thread_id.eq.${currentChannelId},gm_thread_id.eq.${currentChannelId}`)
    .eq('status', 'ACTIVE')
    .maybeSingle()

  if (error || !room) {
    return { type: 4, data: { content: '❌ 當前頻道不是一個進行中的跑團房間子區！', flags: 64 } }
  }

  // 2. 權限檢查：只有現任 GM 有權晉升他人
  if (!room.gm_ids.includes(callerId)) {
    return { type: 4, data: { content: '🛑 閣下不是當前房間的 GM，無權授權新 GM！', flags: 64 } }
  }

  try {
    // 3. 調用 Discord API 把新 GM 拉入私密暗骰箱
    await discordApi(`/channels/${room.gm_thread_id}/thread-members/${targetUserId}`, 'PUT')

    // 4. 更新資料庫陣列
    const updatedGmIds = Array.from(new Set([...room.gm_ids, targetUserId]))
    await supabase.schema('trpg').from('room_sessions').update({ gm_ids: updatedGmIds }).eq('id', room.id)

    return {
      type: 4,
      data: {
        content: `🛡️ <@${targetUserId}> 已成功加入 **【${room.room_name}】** GM 陣營！\n> 私密暗骰與後台: <#${room.gm_thread_id}>`
      }
    }
  } catch (err: any) {
    return { type: 4, data: { content: `❌ 追加 GM 失敗：${err.message}`, flags: 64 } }
  }
}

// ============================================================================
// 子指令 3: 結案存檔 (/room close)
// ============================================================================
async function handleClose(interaction: any, subOptions: any[]) {
  const currentChannelId = String(interaction.channel_id)
  const callerId = String(interaction.member?.user?.id || interaction.user?.id)
  const summary = getOptionValue<string>(subOptions, 'summary') || '模組圓滿完結'

  const supabase = getSupabase()

  // 1. 取得當前房間
  const { data: room, error } = await supabase
    .schema('trpg')
    .from('room_sessions')
    .select('*')
    .or(`main_thread_id.eq.${currentChannelId},gm_thread_id.eq.${currentChannelId}`)
    .eq('status', 'ACTIVE')
    .maybeSingle()

  if (error || !room) {
    return { type: 4, data: { content: '❌ 當前頻道不是一個進行中的跑團房間子區！', flags: 64 } }
  }

  // 2. 權限檢查：必須由 GM 結團
  if (!room.gm_ids.includes(callerId)) {
    return { type: 4, data: { content: '🛑 閣下不是本房間的 GM，無權執行結團存檔！', flags: 64 } }
  }

  // 3. 狀態凍結落庫
  await supabase
    .schema('trpg')
    .from('room_sessions')
    .update({
      status: 'ARCHIVED',
      summary: summary,
      ended_at: new Date().toISOString()
    })
    .eq('id', room.id)

  // 4. 異步將兩個 Thread 標記為只讀鎖定並歸檔隱藏
  const lockThread = (threadId: string) => discordApi(`/channels/${threadId}`, 'PATCH', { archived: true, locked: true }).catch(() => {})
  Promise.all([lockThread(room.main_thread_id), lockThread(room.gm_thread_id)])

  return {
    type: 4,
    data: {
      content: [
        `🏁 **【跑團正式完結存檔】**`,
        `> 模組: **${room.room_name}**`,
        `> 結案簡報: *${summary}*`,
        `> 主持團隊: ${room.gm_ids.map((id: string) => `<@${id}>`).join(' ')}`,
        `> 參團成員: ${room.player_ids.length > 0 ? room.player_ids.map((id: string) => `<@${id}>`).join(' ') : '無擲骰記錄'}`,
        `*(主線與暗骰子區已自動鎖定歸檔，輸入 \`/room archive\` 可隨時檢索調閱)*`
      ].join('\n')
    }
  }
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

  // 構造查詢 (僅讀取 ARCHIVED 記錄)
  let query = supabase
    .schema('trpg')
    .from('room_sessions')
    .select('id, room_name, main_thread_id, gm_ids, player_ids, summary, created_at, ended_at', { count: 'exact' })
    .eq('status', 'ARCHIVED')
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  // ★ 好品味條件過濾：
  if (filterGmId) {
    query = query.contains('gm_ids', [filterGmId])
  } else if (filterPlayerId) {
    query = query.contains('player_ids', [filterPlayerId])
  } else {
    // 預設行為：檢索「自己主持過」或「自己參團過」的所有歷史跑團！
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

  // 組裝緊湊 Markdown 列表卡
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
// ★ 全域統一導出入口：handleRoomCommand
// ============================================================================
export async function handleRoomCommand(interaction: any) {
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