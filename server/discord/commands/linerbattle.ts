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
  damageMultiplier: number
  matrixText: string // ★ 核心升級：產出緊湊對戰矩陣
}

const ANSI = {
  RESET: '\u001b[0m',
  RED: '\u001b[31m',          // 劣勢失誤 / 扣血 (紅色)
  GREEN: '\u001b[32m',        // 優勢領先 / 贏下該位 (綠色)
  GOLD: '\u001b[1;33m',       // ★ 核心升級：精準命中系統數字！耀眼亮金色 (Bold Gold/Yellow)
  WHITE: '\u001b[37m',        // 平局 / 系統數列基準 (中性白)
  GRAY: '\u001b[30m'          // 邊框次要文字
}

export function calculateGeoguessrDamage(
  p1Seq: string,
  p2Seq: string,
  sysSeq: string,
  round: number
): RoundResolution {
  let p1RawDamage = 0
  let p2RawDamage = 0
  let p1Heal = 0
  let p2Heal = 0
  let p1ExactHits = 0
  let p2ExactHits = 0

  const damageMultiplier = round <= 2 ? 1.0 : 1.0 + (round - 2) * 0.5

  const p1DigitsColored: string[] = []
  const p2DigitsColored: string[] = []
  const sysDigitsColored: string[] = []
  const judgeSymbols: string[] = []

  for (let i = 0; i < 10; i++) {
    const sysDigit = parseInt(sysSeq[i]!, 10)
    const p1Digit = parseInt(p1Seq[i]!, 10)
    const p2Digit = parseInt(p2Seq[i]!, 10)

    const err1 = Math.abs(p1Digit - sysDigit)
    const err2 = Math.abs(p2Digit - sysDigit)

    const isP1Hit = err1 === 0
    const isP2Hit = err2 === 0
    if (isP1Hit) { p1Heal += sysDigit; p1ExactHits++; }
    if (isP2Hit) { p2Heal += sysDigit; p2ExactHits++; }

    // ★ 系統數字採用中性純白，確保不與命中者的金色搶視覺焦點
    sysDigitsColored.push(`${ANSI.WHITE}${sysDigit}${ANSI.RESET}`)

    // ★★★ 核心好品味：精準命中者使用耀眼金色 (ANSI.GOLD) 渲染 ★★★
    if (err1 < err2) {
      p2RawDamage += (err2 - err1)
      p1DigitsColored.push(isP1Hit ? `${ANSI.GOLD}${p1Digit}${ANSI.RESET}` : `${ANSI.GREEN}${p1Digit}${ANSI.RESET}`)
      p2DigitsColored.push(`${ANSI.RED}${p2Digit}${ANSI.RESET}`)
      judgeSymbols.push(isP1Hit ? '🎯' : '1')
    } else if (err1 > err2) {
      p1RawDamage += (err1 - err2)
      p1DigitsColored.push(`${ANSI.RED}${p1Digit}${ANSI.RESET}`)
      p2DigitsColored.push(isP2Hit ? `${ANSI.GOLD}${p2Digit}${ANSI.RESET}` : `${ANSI.GREEN}${p2Digit}${ANSI.RESET}`)
      judgeSymbols.push(isP2Hit ? '🎯' : '2')
    } else {
      // 平手時：若猜中依然閃耀金色，否則保持普通白字
      p1DigitsColored.push(isP1Hit ? `${ANSI.GOLD}${p1Digit}${ANSI.RESET}` : `${ANSI.WHITE}${p1Digit}${ANSI.RESET}`)
      p2DigitsColored.push(isP2Hit ? `${ANSI.GOLD}${p2Digit}${ANSI.RESET}` : `${ANSI.WHITE}${p2Digit}${ANSI.RESET}`)
      judgeSymbols.push(isP1Hit && isP2Hit ? '🎯' : '=')
    }
  }

  // 後續組裝矩陣代碼保持不變...
  const headerRow = `${ANSI.WHITE}位數 0 1 2 3 4 5 6 7 8 9${ANSI.RESET}`
  const sysRow    = `系統 ${sysDigitsColored.join(' ')}`
  const p1Row     = `P1  ${p1DigitsColored.join(' ')}`
  const p2Row     = `P2  ${p2DigitsColored.join(' ')}`
  const judgeRow  = `判定 ${judgeSymbols.join(' ')}`

  const matrixText = [headerRow, sysRow, p1Row, p2Row, judgeRow].join('\n')
  const p1Damage = Math.round(p1RawDamage * damageMultiplier)
  const p2Damage = Math.round(p2RawDamage * damageMultiplier)

  return {
    p1Damage,
    p2Damage,
    p1Heal,
    p2Heal,
    p1ExactHits,
    p2ExactHits,
    damageMultiplier,
    matrixText
  }
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
    title: '🎮 LinerBattle 數列對決 (2026 重生版)',
    description,
    color: isFinished ? 0xE74C3C : (isWaitingInput ? 0x3498DB : 0xF1C40F),
    footer: {
      text: '位差差額承受傷害 · 精準命中獲取等額回血 · 上限 100 HP',
    //   icon_url: 'https://i.imgur.com/cu2YAkn.png'
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
            '**【對決目標】**',
            '雙方初始擁有 `100` 點生命值，透過猜測 10 位數列進行位差博弈，先將對手生命削減至 0 者獲勝！',
            '',
            '**【核心結算機制】**',
            '• **逐位差額拼刀 (Geoguessr Clash)**：',
            '  系統對比 10 個數位（0~9 位）的各自誤差。在**每一個數位上獨立比拼**，只有在該位**誤差較大（較不準）的一方**承受兩者之**誤差差額傷害**！若兩人在某位誤差相同，則該位平局免傷。',
            '  *(註：因雙方可能在不同數位各自失誤，同一回合內兩人皆可能累積中彈扣血)*',
            '',
            '• **精準命中回血 (Jackpot Heal)**：',
            '  若閣下在特定位置完全猜中系統數字（誤差為 0），該數位將亮起 **🟡 金色**，並**立即回復該數字等量之生命值**（例：猜中 9 回復 9 HP，生命上限鎖定 100）！',
            '',
            '• **動態狂暴倍率 (Overdrive)**：',
            '  第 1~2 回合為 `1.0x` 基礎傷害；自**第 3 回合起每回合提升 `+0.5x`**（第 3 回合 `1.5x`、第 4 回合 `2.0x`...），差額傷害將呈指數級暴增，拒絕垃圾時間！',
            '',
            '**【戰報矩陣圖例】**',
            '```text',
            '🟡 金色：精準猜中系統數字 (獲得等量回血)',
            '🟢 綠色：該位比對手更準 (贏下該位，完全免傷)',
            '🔴 紅色：該位失誤落後 (承受差額傷害)',
            '⚪ 白色：平手免傷 / 系統標準數列',
            '```',
            '',
            '**【操作與隱私】**',
            '點擊 `[🔢 秘密輸入我的 10 位數列]` 將彈出專屬 Modal，輸入過程完全保密，對手無法窺視。對局超過 10 分鐘無操作將自動作廢。'
          ].join('\n'),
          color: 0x9B59B6,
          footer: { text: '林間小鎮 經典重製 · 逐位差額拼刀 · 數理與心理的極限交鋒' }
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

    const resolvedMember = interaction.data?.resolved?.members?.[targetUserId]
    const resolvedUser = interaction.data?.resolved?.users?.[targetUserId]
    const targetName = resolvedMember?.nick || resolvedUser?.global_name || resolvedUser?.username || '挑戰目標'

    const supabase = getSupabase()
    const { data: battle, error } = await supabase
      .schema('trpg')
      .from('liner_battles')
      .insert({
        channel_id: String(interaction.channel_id || ''),
        p1_id: callerId,
        p1_name: callerName,
        p2_id: targetUserId,
        p2_name: targetName,
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

  const multBadge = res.damageMultiplier > 1.0 
    ? `⚡ **[第 ${battle.round} 回合 · 狂暴倍率 ${res.damageMultiplier}x 生效！]**\n` 
    : `🛡️ **[第 ${battle.round} 回合 · 基礎 1.0x 傷害]**\n`

  const p1Details = [
    res.p1Damage > 0 ? `承受差額傷害 \`-${res.p1Damage}\`` : '✨ 本輪無失誤免傷',
    res.p1Heal > 0 ? `🎯 精準回血 \`+${res.p1Heal} HP\` (${res.p1ExactHits}位)` : ''
  ].filter(Boolean).join(' ｜ ')

  const p2Details = [
    res.p2Damage > 0 ? `承受差額傷害 \`-${res.p2Damage}\`` : '✨ 本輪無失誤免傷',
    res.p2Heal > 0 ? `🎯 精準回血 \`+${res.p2Heal} HP\` (${res.p2ExactHits}位)` : ''
  ].filter(Boolean).join(' ｜ ')

  const reportDescription = [
    multBadge,
    '**📊 本輪 10 位數列交鋒矩陣**:',
    '```ansi', // ★ 關鍵：宣告為 ansi 著色區塊
    res.matrixText,
    '```',
    '> *圖例: 🟢/🎯 贏下該位 ｜ 🔴 劣勢挨打 ｜ ⚪ 平手免傷*',
    '',
    `**P1 (${battle.p1_name})**`,
    `結算: ${p1Details}`,
    `生命: ${renderHealthBar(newP1Hp)}`,
    '',
    `**P2 (${battle.p2_name})**`,
    `結算: ${p2Details}`,
    `生命: ${renderHealthBar(newP2Hp)}`,
    '',
    isGameOver
      ? (newP1Hp <= 0 && newP2Hp <= 0
          ? '⚖️ **雙方同歸於盡！這是一場壯烈的平局！**'
          : (newP1Hp <= 0 
              ? `🏆 **${battle.p2_name} 獲勝！**\n💀 ${battle.p1_name} 生命耗盡陣亡。` 
              : `🏆 **${battle.p1_name} 獲勝！**\n💀 ${battle.p2_name} 生命耗盡陣亡。`))
      : `🔄 **雙方存活！已進入第 ${finalBattle.round} 回合，請繼續點擊按鈕輸入數列！**`
  ].join('\n')

  return {
    type: 4,
    data: {
      content: `💥 雙方數列提交完畢，第 ${battle.round} 回合交鋒結算完畢！`,
      embeds: [{
        title: '💥 LinerBattle 回合結算戰報',
        description: reportDescription,
        color: isGameOver ? 0xE74C3C : 0x2ECC71,
        footer: { text: `LB=${battle.id} · 逐位差額拼刀模式` }
      }],
      components: buildLinerBattleComponents(finalBattle)
    }
  }
}