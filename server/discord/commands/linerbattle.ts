// server/discord/commands/linerbattle.ts
import crypto from 'node:crypto'
import type { H3Event } from 'h3'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// -------------------------------------------------------------
// 1. 核心演算法純函數 (位差傷害計算，零副作用)
// -------------------------------------------------------------

/**
 * 產生 10 位純數字隨機字串 (例如 "4811023985")
 */
export function generate10DigitSeq(): string {
  return Array.from({ length: 10 }, () => crypto.randomInt(0, 10)).join('')
}

/**
 * 計算位差傷害與回合扣血 (純數學運算)
 */
export function calculateLinerDamage(p1Seq: string, p2Seq: string, sysSeq: string) {
  let p1Damage = 0
  let p2Damage = 0

  for (let i = 0; i < 10; i++) {
    const sysDigit = parseInt(sysSeq[i]!, 10)
    const p1Digit = parseInt(p1Seq[i]!, 10)
    const p2Digit = parseInt(p2Seq[i]!, 10)

    p1Damage += Math.abs(p1Digit - sysDigit)
    p2Damage += Math.abs(p2Digit - sysDigit)
  }

  return { p1Damage, p2Damage }
}

// -------------------------------------------------------------
// 2. 卡片視圖組裝器 (完美復刻懷舊戰報排版)
// -------------------------------------------------------------

export function buildLinerBattleEmbed(battle: any) {
  const isFinished = battle.status === 'FINISHED'
  const isWaitingInput = battle.status === 'WAITING_INPUT'

  // 回合進行中時，未結算前隱藏雙方具體數列
  const p1SeqDisplay = isFinished ? battle.p1_seq : (battle.p1_seq ? '✅ 已提交 (保密中)' : '⏳ 等待輸入...')
  const p2SeqDisplay = isFinished ? battle.p2_seq : (battle.p2_seq ? '✅ 已提交 (保密中)' : '⏳ 等待輸入...')
  const sysSeqDisplay = isFinished ? `\`${battle.system_seq}\`` : '❓ (雙方提交後揭曉)'

  let outcomeText = ''
  if (isFinished) {
    if (battle.p1_hp <= 0 && battle.p2_hp <= 0) {
      outcomeText = '\n\n⚖️ **雙方同歸於盡！平局！**'
    } else if (battle.p1_hp <= 0) {
      outcomeText = `\n\n🏆 **${battle.p2_name} 獲勝！**\n💀 ${battle.p1_name} 已陣亡。`
    } else {
      outcomeText = `\n\n🏆 **${battle.p1_name} 獲勝！**\n💀 ${battle.p2_name} 已陣亡。`
    }
  }

  const description = [
    `⚔️ **${battle.p1_name}** vs **${battle.p2_name || '等待挑戰者...'}**`,
    '',
    `**系統數列**\n${sysSeqDisplay}`,
    '',
    `**P1 數列 (${battle.p1_name})** ｜ **目前血量**: \`${battle.p1_hp}\``,
    `${p1SeqDisplay}`,
    '',
    `**P2 數列 (${battle.p2_name || '待定'})** ｜ **目前血量**: \`${battle.p2_hp}\``,
    `${p2SeqDisplay}`,
    outcomeText,
    `\n\`LB=${battle.id}\` · 第 ${battle.round} 回合`
  ].join('\n')

  return {
    title: '🎮 LinerBattle 數列對決',
    description,
    color: isFinished ? 0xE74C3C : (isWaitingInput ? 0x3498DB : 0xF1C40F),
    footer: {
      text: '林間小鎮 經典對決重製版 · 依據位差絕對值結算傷害',
      icon_url: 'https://i.imgur.com/cu2YAkn.png'
    },
    timestamp: new Date().toISOString()
  }
}

/**
 * 根據對戰狀態動態構建按鈕組件
 */
export function buildLinerBattleComponents(battle: any) {
  if (battle.status === 'WAITING_ACCEPT') {
    return [
      {
        type: 1, // ACTION_ROW
        components: [
          {
            type: 2, // BUTTON
            custom_id: `lb_accept:${battle.id}`,
            label: '⚔️ 接受對決挑戰',
            style: 3 // SUCCESS (Green)
          }
        ]
      }
    ]
  }

  if (battle.status === 'WAITING_INPUT') {
    return [
      {
        type: 1,
        components: [
          {
            type: 2,
            custom_id: `lb_input:${battle.id}`,
            label: '🔢 秘密輸入我的 10 位數列',
            style: 1 // PRIMARY (Blurple)
          }
        ]
      }
    ]
  }

  // FINISHED 狀態不掛載按鈕
  return []
}

// -------------------------------------------------------------
// 3. 指令入口: /lb challenge @user
// -------------------------------------------------------------

export async function handleLinerBattleCommand(interaction: any, event: H3Event) {
  const callerId = String(interaction.member?.user?.id || interaction.user?.id || '')
  const callerName = interaction.member?.nick || interaction.member?.user?.global_name || interaction.user?.username || '調查員'
  const subCommand = interaction.data?.options?.[0]?.name
  const subOptions = interaction.data?.options?.[0]?.options || []

  if (subCommand === 'challenge') {
    const targetUserId = subOptions.find((o: any) => o.name === 'target')?.value
    if (!targetUserId) {
      return { type: 4, data: { content: '⚠️ 請指定一位對決目標！', flags: 64 } }
    }

    if (targetUserId === callerId) {
      return { type: 4, data: { content: '❌ 你不能挑戰你自己！請挑選另一位群友進行數列對決。', flags: 64 } }
    }

    const supabase = getSupabase()

    // 建立新對戰記錄
    const { data: battle, error } = await supabase
      .schema('trpg')
      .from('liner_battles')
      .insert({
        channel_id: String(interaction.channel_id || ''),
        p1_id: callerId,
        p1_name: callerName,
        p2_id: targetUserId,
        p2_name: '挑戰目標', // 接受時會刷新為真實暱稱
        p1_hp: 100,
        p2_hp: 100,
        status: 'WAITING_ACCEPT'
      })
      .select()
      .single()

    if (error || !battle) {
      console.error('[LB Create Error]:', error)
      return { type: 4, data: { content: `❌ 發起對戰失敗：${error?.message || '內部錯誤'}`, flags: 64 } }
    }

    return {
      type: 4,
      data: {
        content: `⚔️ <@${callerId}> 向 <@${targetUserId}> 發起了一場 **LinerBattle** 數列生死決鬥！`,
        embeds: [buildLinerBattleEmbed(battle)],
        components: buildLinerBattleComponents(battle)
      }
    }
  }

  return { type: 4, data: { content: `⚠️ 未知的指令：${subCommand}`, flags: 64 } }
}

// -------------------------------------------------------------
// 4. 按鈕交互入口 (接受挑戰 / 打開輸入彈窗)
// -------------------------------------------------------------

export async function handleLinerBattleButton(interaction: any, event: H3Event) {
  const callerId = String(interaction.member?.user?.id || interaction.user?.id || '')
  const callerName = interaction.member?.nick || interaction.member?.user?.global_name || interaction.user?.username || '調查員'
  const customId = interaction.data?.custom_id || ''
  const [action, battleIdStr] = customId.split(':')
  const battleId = parseInt(battleIdStr, 10)

  const supabase = getSupabase()
  const { data: battle, error } = await supabase
    .schema('trpg')
    .from('liner_battles')
    .select('*')
    .eq('id', battleId)
    .maybeSingle()

  if (error || !battle) {
    return { type: 4, data: { content: '❌ 查無此對戰房間或對局已失效！', flags: 64 } }
  }

  // -----------------------------------------------------------
  // 分支 A: 接受挑戰 (lb_accept)
  // -----------------------------------------------------------
  if (action === 'lb_accept') {
    if (callerId !== battle.p2_id) {
      return { type: 4, data: { content: '🛑 此挑戰並非發送給閣下，請勿代領對決！', flags: 64 } }
    }

    if (battle.status !== 'WAITING_ACCEPT') {
      return { type: 4, data: { content: '⚠️ 該對決已被接受或已處於進行狀態。', flags: 64 } }
    }

    // 就地生成第一輪的系統數列
    const initialSystemSeq = generate10DigitSeq()

    const { data: updated, error: updateErr } = await supabase
      .schema('trpg')
      .from('liner_battles')
      .update({
        p2_name: callerName,
        status: 'WAITING_INPUT',
        system_seq: initialSystemSeq
      })
      .eq('id', battleId)
      .select()
      .single()

    if (updateErr || !updated) {
      return { type: 4, data: { content: `❌ 接受挑戰失敗：${updateErr?.message}`, flags: 64 } }
    }

    // ★ 就地更新公屏卡片
    return {
      type: 7, // UPDATE_MESSAGE
      data: {
        content: `⚔️ **${battle.p1_name}** vs **${callerName}** 的對決正式拉開帷幕！請雙方點擊按鈕秘密輸入數列！`,
        embeds: [buildLinerBattleEmbed(updated)],
        components: buildLinerBattleComponents(updated)
      }
    }
  }

  // -----------------------------------------------------------
  // 分支 B: 點擊輸入按鈕 ➔ 彈出 Modal (lb_input)
  // -----------------------------------------------------------
  if (action === 'lb_input') {
    if (callerId !== battle.p1_id && callerId !== battle.p2_id) {
      return { type: 4, data: { content: '🛑 閣下並非本場對局的參賽選手！', flags: 64 } }
    }

    if (battle.status !== 'WAITING_INPUT') {
      return { type: 4, data: { content: '⚠️ 當前對決不在數列輸入階段。', flags: 64 } }
    }

    // 檢查是否已提交過
    const hasSubmitted = (callerId === battle.p1_id && battle.p1_seq) || (callerId === battle.p2_id && battle.p2_seq)
    if (hasSubmitted) {
      return { type: 4, data: { content: '✅ 閣下已經提交了本回合數列！請靜候對手提交完成。', flags: 64 } }
    }

    // ★ 彈出 Modal (僅自己可見)
    return {
      type: 9, // APPLICATION_MODAL
      data: {
        custom_id: `lb_modal:${battle.id}`,
        title: `輸入 10 位數列 (LB=${battle.id})`,
        components: [
          {
            type: 1,
            components: [
              {
                type: 4, // TEXT_INPUT
                custom_id: 'seq_input',
                label: '請輸入 10 位純數字 (例如: 1248961281)',
                style: 1, // Short
                min_length: 10,
                max_length: 10,
                required: true,
                placeholder: '1248961281'
              }
            ]
          }
        ]
      }
    }
  }

  return { type: 4, data: { content: '⚠️ 未知動作', flags: 64 } }
}

// -------------------------------------------------------------
// 5. Modal 提交處理 (寫入數列並在湊齊時原子結算)
// -------------------------------------------------------------

export async function handleLinerBattleModal(interaction: any, event: H3Event) {
  const callerId = String(interaction.member?.user?.id || interaction.user?.id || '')
  const customId = interaction.data?.custom_id || ''
  const battleId = parseInt(customId.replace('lb_modal:', ''), 10)
  const inputSeq = interaction.data?.components?.[0]?.components?.[0]?.value?.trim() || ''

  // 格式校驗：必須是 10 位純數字
  if (!/^\d{10}$/.test(inputSeq)) {
    return { type: 4, data: { content: '❌ 輸入格式錯誤！必須是嚴格的 10 位純數字。', flags: 64 } }
  }

  const supabase = getSupabase()
  const { data: battle, error } = await supabase
    .schema('trpg')
    .from('liner_battles')
    .select('*')
    .eq('id', battleId)
    .maybeSingle()

  if (error || !battle) {
    return { type: 4, data: { content: '❌ 對局已失效或查無此房間。', flags: 64 } }
  }

  const isP1 = callerId === battle.p1_id
  const isP2 = callerId === battle.p2_id
  if (!isP1 && !isP2) {
    return { type: 4, data: { content: '🛑 閣下不是本場參賽者！', flags: 64 } }
  }

  // 記錄數列
  const p1Seq = isP1 ? inputSeq : battle.p1_seq
  const p2Seq = isP2 ? inputSeq : battle.p2_seq

  // -----------------------------------------------------------
  // 情況 1: 只有一人提交 ➔ 更新狀態，等待對手
  // -----------------------------------------------------------
  if (!p1Seq || !p2Seq) {
    await supabase
      .schema('trpg')
      .from('liner_battles')
      .update({
        p1_seq: p1Seq,
        p2_seq: p2Seq
      })
      .eq('id', battleId)

    return {
      type: 4,
      data: {
        content: `🔒 數列已安全接收！已成功提交數列 \`${inputSeq}\`，等待對手輸入完成後結算...`,
        flags: 64 // 僅自己可見
      }
    }
  }

  // -----------------------------------------------------------
  // 情況 2: 雙方皆已就位 ➔ 觸發原子傷害結算！
  // -----------------------------------------------------------
  const { p1Damage, p2Damage } = calculateLinerDamage(p1Seq, p2Seq, battle.system_seq)
  const newP1Hp = battle.p1_hp - p1Damage
  const newP2Hp = battle.p2_hp - p2Damage
  const isGameOver = newP1Hp <= 0 || newP2Hp <= 0

  const updatePayload: any = {
    p1_seq: p1Seq,
    p2_seq: p2Seq,
    p1_hp: newP1Hp,
    p2_hp: newP2Hp,
    status: isGameOver ? 'FINISHED' : 'WAITING_INPUT'
  }

  // 若未結束，進入下一回合，清空數列並重刷系統數列
  if (!isGameOver) {
    updatePayload.round = battle.round + 1
    updatePayload.p1_seq = null
    updatePayload.p2_seq = null
    updatePayload.system_seq = generate10DigitSeq()
  }

  const { data: finalBattle, error: updateErr } = await supabase
    .schema('trpg')
    .from('liner_battles')
    .update(updatePayload)
    .eq('id', battleId)
    .select()
    .single()

  if (updateErr || !finalBattle) {
    return { type: 4, data: { content: `❌ 結算失敗：${updateErr?.message}`, flags: 64 } }
  }

  // 構造結算戰報 Embed
  const reportEmbed = {
    title: '💥 LinerBattle 回合結算！',
    description: [
      `**系統數列**: \`${battle.system_seq}\``,
      '',
      `**P1 (${battle.p1_name})**: \`${p1Seq}\``,
      `造成傷害: \`${p1Damage}\` ｜ 剩餘血量: \`${newP1Hp}\``,
      '',
      `**P2 (${battle.p2_name})**: \`${p2Seq}\``,
      `造成傷害: \`${p2Damage}\` ｜ 剩餘血量: \`${newP2Hp}\``,
      '',
      isGameOver 
        ? (newP1Hp <= 0 && newP2Hp <= 0 
            ? '⚖️ **雙方同歸於盡！平手！**' 
            : (newP1Hp <= 0 ? `🏆 **${battle.p2_name} 獲勝！**\n💀 ${battle.p1_name} 已死亡。` : `🏆 **${battle.p1_name} 獲勝！**\n💀 ${battle.p2_name} 已死亡。`))
        : `🔄 **雙方存活！已進入第 ${finalBattle.round} 回合，請繼續點擊按鈕輸入數列！**`
    ].join('\n'),
    color: isGameOver ? 0xE74C3C : 0x2ECC71,
    footer: { text: `LB=${battle.id} · 回合結算完畢` }
  }

  // 告知提交者本人
  return {
    type: 4,
    data: {
      content: `💥 雙方數列提交完畢，已在頻道公屏完成結算！`,
      embeds: [reportEmbed],
      components: buildLinerBattleComponents(finalBattle)
    }
  }
}