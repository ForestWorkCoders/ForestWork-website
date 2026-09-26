// server/discord/commands/linerbattle.ts
import crypto from 'node:crypto'
import type { H3Event } from 'h3'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

const MAX_HP = 100

// -------------------------------------------------------------
// 1. 純函數：生成 10 位數列與視覺血條
// -------------------------------------------------------------

export function generate10DigitSeq(): string {
  return Array.from({ length: 10 }, () => crypto.randomInt(0, 10)).join('')
}

/**
 * 繪製 ASCII 緊湊型血條 (例如: [██████░░░░] 60/100)
 */
export function renderHealthBar(hp: number, max: number = MAX_HP): string {
  const clampedHp = Math.max(0, Math.min(max, hp))
  const totalBars = 10
  const filledBars = Math.round((clampedHp / max) * totalBars)
  const emptyBars = totalBars - filledBars
  const bar = '█'.repeat(filledBars) + '░'.repeat(emptyBars)
  return `\`[${bar}]\` **${hp}**/${max}`
}

// -------------------------------------------------------------
// 2. 核心演算法：Geoguessr 差額結算 + 精準命中回血 + 超載判定
// -------------------------------------------------------------

export interface RoundResolution {
  p1Damage: number
  p2Damage: number
  p1Heal: number
  p2Heal: number
  p1ExactHits: number
  p2ExactHits: number
  damageMultiplier: number // 暴露實時倍率供卡片展示
}

export function calculateGeoguessrDamage(
  p1Seq: string,
  p2Seq: string,
  sysSeq: string,
  round: number
): RoundResolution {
  let p1Damage = 0
  let p2Damage = 0
  let p1Heal = 0
  let p2Heal = 0
  let p1ExactHits = 0
  let p2ExactHits = 0

  // ★ 好品味核心公式：前 2 回合 1.0x，自第 3 回合起每回合遞增 0.5x
  const damageMultiplier = round <= 2 ? 1.0 : 1.0 + (round - 2) * 0.5

  for (let i = 0; i < 10; i++) {
    const sysDigit = parseInt(sysSeq[i]!, 10)
    const p1Digit = parseInt(p1Seq[i]!, 10)
    const p2Digit = parseInt(p2Seq[i]!, 10)

    const err1 = Math.abs(p1Digit - sysDigit)
    const err2 = Math.abs(p2Digit - sysDigit)

    // 差額乘以動態狂暴倍率 (四捨五入取整)
    if (err1 > err2) {
      p1Damage += Math.round((err1 - err2) * damageMultiplier)
    } else if (err2 > err1) {
      p2Damage += Math.round((err2 - err1) * damageMultiplier)
    }

    // 精準命中回血 (回血保持原值，不乘倍率，避免數值膨脹)
    if (err1 === 0) {
      p1Heal += sysDigit
      p1ExactHits++
    }
    if (err2 === 0) {
      p2Heal += sysDigit
      p2ExactHits++
    }
  }

  return { p1Damage, p2Damage, p1Heal, p2Heal, p1ExactHits, p2ExactHits, damageMultiplier }
}

// -------------------------------------------------------------
// 3. 卡片視圖組裝器
// -------------------------------------------------------------

export function buildLinerBattleEmbed(battle: any) {
  const isFinished = battle.status === 'FINISHED'
  const isWaitingInput = battle.status === 'WAITING_INPUT'

  const p1SeqDisplay = isFinished ? `\`${battle.p1_seq}\`` : (battle.p1_seq ? '✅ 已提交 (保密中)' : '⏳ 等待輸入...')
  const p2SeqDisplay = isFinished ? `\`${battle.p2_seq}\`` : (battle.p2_seq ? '✅ 已提交 (保密中)' : '⏳ 等待輸入...')
  const sysSeqDisplay = isFinished ? `\`${battle.system_seq}\`` : '❓ (雙方提交後揭曉)'

  let outcomeText = ''
  if (isFinished) {
    if (battle.p1_hp <= 0 && battle.p2_hp <= 0) {
      outcomeText = '\n\n⚖️ **雙方同歸於盡！平局！**'
    } else if (battle.p1_hp <= 0) {
      outcomeText = `\n\n🏆 **${battle.p2_name} 獲勝！**\n💀 ${battle.p1_name} 生命耗盡陣亡。`
    } else {
      outcomeText = `\n\n🏆 **${battle.p1_name} 獲勝！**\n💀 ${battle.p2_name} 生命耗盡陣亡。`
    }
  }

  const currentMult = battle.round <= 2 ? 1.0 : 1.0 + (battle.round - 2) * 0.5
  const multBadge = currentMult > 1.0 
    ? `🔥 **[狂暴倍率生效中 · 傷害 ${currentMult}x！]**\n` 
    : '🛡️ **[基礎對決階段 · 傷害 1.0x]**\n'

  const description = [
    multBadge,
    `⚔️ **${battle.p1_name}** vs **${battle.p2_name || '等待挑戰者...'}**`,
    '',
    `**系統數列**\n${sysSeqDisplay}`,
    '',
    `**P1 (${battle.p1_name})**`,
    `生命值: ${renderHealthBar(battle.p1_hp)}`,
    `數列狀態: ${p1SeqDisplay}`,
    '',
    `**P2 (${battle.p2_name || '待定'})**`,
    `生命值: ${renderHealthBar(battle.p2_hp)}`,
    `數列狀態: ${p2SeqDisplay}`,
    outcomeText,
    `\n\`LB=${battle.id}\` · 第 ${battle.round} 回合`
  ].join('\n')

  return {
    title: '🎮 LinerBattle 數列對決 (Geoguessr 規則版)',
    description,
    color: isFinished ? 0xE74C3C : (isWaitingInput ? 0x3498DB : 0xF1C40F),
    footer: {
      text: '位差差額承受傷害 · 精準命中獲取等額回血 · 上限 100 HP',
      icon_url: 'https://i.imgur.com/cu2YAkn.png'
    },
    timestamp: new Date().toISOString()
  }
}

export function buildLinerBattleComponents(battle: any) {
  if (battle.status === 'WAITING_ACCEPT') {
    return [
      {
        type: 1,
        components: [
          { type: 2, custom_id: `lb_accept:${battle.id}`, label: '⚔️ 接受對決挑戰', style: 3 },
          { type: 2, custom_id: `lb_cancel:${battle.id}`, label: '❌ 撤銷挑戰', style: 2 }
        ]
      }
    ]
  }

  if (battle.status === 'WAITING_INPUT') {
    return [
      {
        type: 1,
        components: [
          { type: 2, custom_id: `lb_input:${battle.id}`, label: '🔢 秘密輸入我的 10 位數列', style: 1 },
          { type: 2, custom_id: `lb_cancel:${battle.id}`, label: '🏳️ 投降 / 放棄對決', style: 4 }
        ]
      }
    ]
  }

  return []
}

// -------------------------------------------------------------
// 4. 指令入口: /lb challenge & /lb help
// -------------------------------------------------------------

export async function handleLinerBattleCommand(interaction: any, event: H3Event) {
  const callerId = String(interaction.member?.user?.id || interaction.user?.id || '')
  const callerName = interaction.member?.nick || interaction.member?.user?.global_name || interaction.user?.username || '調查員'
  const subCommand = interaction.data?.options?.[0]?.name
  const subOptions = interaction.data?.options?.[0]?.options || []

  // ★ 新增：規則說明指令 (/lb help)
  if (subCommand === 'help') {
    return {
      type: 4,
      data: {
        embeds: [{
          title: '📖 LinerBattle (數列對決) 遊戲規則說明',
          description: [
            '**【遊戲目標】**',
            '雙方初始擁有 `100` 點生命值，透過猜測 10 位隨機數列進行位差博弈，先將對手生命削減至 0 者獲勝！',
            '',
            '**【核心結算機制】**',
            '• **Geoguessr 差額傷害**：針對數列每一位（0~9），系統比對雙方與系統數字的誤差。只有**誤差較大的一方**會承受**雙方誤差之差值**的傷害！若誤差相同，則雙方均不受傷。',
            '• **精準命中回血**：若在某一特定位置完全猜中系統數字（誤差為 0），閣下將**立即回復該數字等量之生命值**（例如猜中 9 回復 9 HP，生命上限 100）！',
            '• **超載死鬥**：若大戰至第 4 回合仍未分勝負，將開啟超載狀態，所有位差傷害 **1.5 倍暴擊**！',
            '• **動態狂暴倍率**：戰局拖延越久越危險！前 2 回合為 `1.0x` 基礎傷害；自第 3 回合起每回合提升 `+0.5x`（第 3 回合 `1.5x`、第 4 回合 `2.0x`、第 5 回合 `2.5x`...），差額傷害將呈指數級暴增！',
            '',
            '**【隱私與操作】**',
            '點擊 `[🔢 秘密輸入我的 10 位數列]` 將彈出專屬輸入對話方塊，輸入完全保密，對手無法窺視。對局超過 10 分鐘無操作將自動作廢。'
          ].join('\n'),
          color: 0x9B59B6,
          footer: { text: '林間小鎮 經典重製 · 純粹的博弈與數理交鋒' }
        }]
      }
    }
  }

  if (subCommand === 'challenge') {
    const targetUserId = subOptions.find((o: any) => o.name === 'target')?.value
    if (!targetUserId) {
      return { type: 4, data: { content: '⚠️ 請指定一位對決目標！', flags: 64 } }
    }
    if (targetUserId === callerId) {
      return { type: 4, data: { content: '❌ 你不能挑戰你自己！', flags: 64 } }
    }

    const supabase = getSupabase()
    const { data: battle, error } = await supabase
      .schema('trpg')
      .from('liner_battles')
      .insert({
        channel_id: String(interaction.channel_id || ''),
        p1_id: callerId,
        p1_name: callerName,
        p2_id: targetUserId,
        p2_name: '挑戰目標',
        p1_hp: 100,
        p2_hp: 100,
        status: 'WAITING_ACCEPT'
      })
      .select()
      .single()

    if (error || !battle) {
      return { type: 4, data: { content: `❌ 發起對戰失敗：${error?.message}`, flags: 64 } }
    }

    return {
      type: 4,
      data: {
        content: `⚔️ <@${callerId}> 向 <@${targetUserId}> 發起了一場 **LinerBattle** 數列生死對決！`,
        embeds: [buildLinerBattleEmbed(battle)],
        components: buildLinerBattleComponents(battle)
      }
    }
  }

  return { type: 4, data: { content: `⚠️ 未知指令：${subCommand}`, flags: 64 } }
}

// -------------------------------------------------------------
// 5. 按鈕交互入口
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

  // 惰性超時守衛 (10 分鐘)
  const TIMEOUT_MS = 10 * 60 * 1000
  const lastActiveTime = new Date(battle.updated_at || battle.created_at).getTime()
  if ((Date.now() - lastActiveTime) > TIMEOUT_MS && battle.status !== 'FINISHED' && battle.status !== 'CANCELLED') {
    await supabase.schema('trpg').from('liner_battles').update({ status: 'CANCELLED' }).eq('id', battleId)
    return {
      type: 7,
      data: {
        content: `⌛ 對決已超時！因超過 10 分鐘無操作，本場 LinerBattle (\`LB=${battle.id}\`) 已自動失效關閉。`,
        embeds: [{ title: '🛑 LinerBattle 對決已超時', description: '閒置過久已被系統終止回收。', color: 0x95A5A6 }],
        components: []
      }
    }
  }

  if (action === 'lb_cancel') {
    if (callerId !== battle.p1_id && callerId !== battle.p2_id) {
      return { type: 4, data: { content: '🛑 閣下並非本場對決成員！', flags: 64 } }
    }
    if (battle.status === 'FINISHED' || battle.status === 'CANCELLED') {
      return { type: 4, data: { content: '⚠️ 該對決早已結束。', flags: 64 } }
    }

    await supabase.schema('trpg').from('liner_battles').update({ status: 'CANCELLED' }).eq('id', battleId)
    const isWaitingAccept = battle.status === 'WAITING_ACCEPT'
    const cancelMsg = isWaitingAccept
      ? `🚫 <@${callerId}> 已撤銷本場挑戰。`
      : `🏳️ <@${callerId}> 選擇了投降！本場對決終止。`

    return {
      type: 7,
      data: {
        content: cancelMsg,
        embeds: [{ title: '🛑 LinerBattle 對決已取消', description: `由 **${callerName}** 終止。\n代碼：\`LB=${battle.id}\``, color: 0x7F8C8D }],
        components: []
      }
    }
  }

  if (action === 'lb_accept') {
    if (callerId !== battle.p2_id) {
      return { type: 4, data: { content: '🛑 此挑戰並非發送給閣下！', flags: 64 } }
    }
    if (battle.status !== 'WAITING_ACCEPT') {
      return { type: 4, data: { content: '⚠️ 該對決已被接受或進行中。', flags: 64 } }
    }

    const { data: updated, error: updateErr } = await supabase
      .schema('trpg')
      .from('liner_battles')
      .update({
        p2_name: callerName,
        status: 'WAITING_INPUT',
        system_seq: generate10DigitSeq()
      })
      .eq('id', battleId)
      .select()
      .single()

    if (updateErr || !updated) {
      return { type: 4, data: { content: `❌ 接受挑戰失敗：${updateErr?.message}`, flags: 64 } }
    }

    return {
      type: 7,
      data: {
        content: `⚔️ **${battle.p1_name}** vs **${callerName}** 的對決正式開始！請雙方秘密輸入數列！`,
        embeds: [buildLinerBattleEmbed(updated)],
        components: buildLinerBattleComponents(updated)
      }
    }
  }

  if (action === 'lb_input') {
    if (callerId !== battle.p1_id && callerId !== battle.p2_id) {
      return { type: 4, data: { content: '🛑 閣下並非本場對局參賽者！', flags: 64 } }
    }
    if (battle.status !== 'WAITING_INPUT') {
      return { type: 4, data: { content: '⚠️ 當前對決不在數列輸入階段。', flags: 64 } }
    }

    const hasSubmitted = (callerId === battle.p1_id && battle.p1_seq) || (callerId === battle.p2_id && battle.p2_seq)
    if (hasSubmitted) {
      return { type: 4, data: { content: '✅ 閣下已提交本輪數列！請靜候對手提交。', flags: 64 } }
    }

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
                type: 4,
                custom_id: 'seq_input',
                label: '請輸入 10 位純數字 (例如: 1248961281)',
                style: 1,
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
// 6. Modal 提交與 Geoguessr 差額傷害結算
// -------------------------------------------------------------

export async function handleLinerBattleModal(interaction: any, event: H3Event) {
  const callerId = String(interaction.member?.user?.id || interaction.user?.id || '')
  const customId = interaction.data?.custom_id || ''
  const battleId = parseInt(customId.replace('lb_modal:', ''), 10)
  const inputSeq = interaction.data?.components?.[0]?.components?.[0]?.value?.trim() || ''

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
    return { type: 4, data: { content: '🛑 閣下非本場參賽者！', flags: 64 } }
  }

  const p1Seq = isP1 ? inputSeq : battle.p1_seq
  const p2Seq = isP2 ? inputSeq : battle.p2_seq

  // 情況 1: 僅一人提交
  if (!p1Seq || !p2Seq) {
    await supabase.schema('trpg').from('liner_battles').update({ p1_seq: p1Seq, p2_seq: p2Seq }).eq('id', battleId)
    return {
      type: 4,
      data: {
        content: `🔒 數列已安全接收！已成功提交數列 \`${inputSeq}\`，等待對手輸入完成後結算...`,
        flags: 64
      }
    }
  }

  // 情況 2: ★★★ 雙方數列就緒，執行 Geoguessr 差額運算 ★★★
  const res = calculateGeoguessrDamage(p1Seq, p2Seq, battle.system_seq, battle.round)

  // 結算生命值：減去受到的差額傷害，加上精準命中回血，上限鎖定 MAX_HP (100)
  const newP1Hp = Math.min(MAX_HP, battle.p1_hp - res.p1Damage + res.p1Heal)
  const newP2Hp = Math.min(MAX_HP, battle.p2_hp - res.p2Damage + res.p2Heal)
  const isGameOver = newP1Hp <= 0 || newP2Hp <= 0

  const multTitle = res.damageMultiplier > 1.0 
    ? `⚡ **[第 ${battle.round} 回合 · 狂暴倍率 ${res.damageMultiplier}x 生效！]**\n` 
    : `🛡️ **[第 ${battle.round} 回合 · 基礎 1.0x 傷害]**\n`

  const updatePayload: any = {
    p1_seq: p1Seq,
    p2_seq: p2Seq,
    p1_hp: newP1Hp,
    p2_hp: newP2Hp,
    status: isGameOver ? 'FINISHED' : 'WAITING_INPUT'
  }

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

  // 構造回合戰報詳情
  const p1StatusNote = [
    res.p1Damage > 0 ? `承受差額傷害 \`-${res.p1Damage}\`` : '✨ 完勝對手 (未受傷)',
    res.p1Heal > 0 ? `🎯 精準命中 ${res.p1ExactHits} 位 (\`+${res.p1Heal} HP\`)` : ''
  ].filter(Boolean).join(' ｜ ')

  const p2StatusNote = [
    res.p2Damage > 0 ? `承受差額傷害 \`-${res.p2Damage}\`` : '✨ 完勝對手 (未受傷)',
    res.p2Heal > 0 ? `🎯 精準命中 ${res.p2ExactHits} 位 (\`+${res.p2Heal} HP\`)` : ''
  ].filter(Boolean).join(' ｜ ')

  const reportEmbed = {
    title: '💥 LinerBattle 回合結算戰報',
    description: [
      multTitle,
      `**本輪系統數列**: \`${battle.system_seq}\``,
      '',
      `**P1 (${battle.p1_name})**: \`${p1Seq}\``,
      `結算: ${p1StatusNote}`,
      `生命: ${renderHealthBar(newP1Hp)}`,
      '',
      `**P2 (${battle.p2_name})**: \`${p2Seq}\``,
      `結算: ${p2StatusNote}`,
      `生命: ${renderHealthBar(newP2Hp)}`,
      '',
      isGameOver
        ? (newP1Hp <= 0 && newP2Hp <= 0
            ? '⚖️ **雙方同歸於盡！這是一場壯烈的平局！**'
            : (newP1Hp <= 0 ? `🏆 **${battle.p2_name} 獲勝！**\n💀 ${battle.p1_name} 已死亡。` : `🏆 **${battle.p1_name} 獲勝！**\n💀 ${battle.p2_name} 已死亡。`))
        : `🔄 **雙方存活！已進入第 ${finalBattle.round} 回合，請繼續點擊按鈕輸入數列！**`
    ].join('\n'),
    color: isGameOver ? 0xE74C3C : 0x2ECC71,
    footer: { text: `LB=${battle.id} · Geoguessr 差額結算完畢` }
  }

  return {
    type: 4,
    data: {
      content: `💥 雙方數列提交完畢，已在頻道公屏完成結算！`,
      embeds: [reportEmbed],
      components: buildLinerBattleComponents(finalBattle)
    }
  }
}