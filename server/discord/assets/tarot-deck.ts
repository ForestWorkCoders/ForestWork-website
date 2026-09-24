// server/discord/assets/tarot-deck.ts

export interface TarotCard {
  id: number
  name: string
  file: string
  upright: string
  reversed: string
}

export const TAROT_DECK: readonly TarotCard[] = [
  {
    id: 0,
    name: '0. 愚者 (The Fool)',
    file: '00_fool.png',
    upright: '新的開始、冒險、純真、自發性、無限可能、勇於嘗試。',
    reversed: '魯莽、冒進、不負責任、盲目樂觀、猶豫不決、面臨危險。'
  },
  {
    id: 1,
    name: 'I. 魔術師 (The Magician)',
    file: '01_magician.png',
    upright: '創造力、專注力、資源充足、主動出擊、掌握全局的技能。',
    reversed: '欺瞞、能力不足、精力分散、溝通不良、懷才不遇。'
  },
  {
    id: 2,
    name: 'II. 女祭司 (The High Priestess)',
    file: '02_high_priestess.png',
    upright: '直覺、潛意識、冷靜觀察、內在智慧、深層真相。',
    reversed: '缺乏遠見、壓抑情緒、誤解直覺、冷漠孤僻、隱私暴露。'
  },
  {
    id: 3,
    name: 'III. 皇后 (The Empress)',
    file: '03_empress.png',
    upright: '豐收、繁榮、關懷、母性、感官享受、創造力的孕育。',
    reversed: '過度依賴、創造力枯竭、資源浪費、家庭爭執、忽視自我。'
  },
  {
    id: 4,
    name: 'IV. 皇帝 (The Emperor)',
    file: '04_emperor.png',
    upright: '權威、秩序、紀律、領導力、穩固的基石、理性掌控。',
    reversed: '專制獨裁、缺乏自控、剛愎自用、秩序崩潰、官僚主義。'
  },
  {
    id: 5,
    name: 'V. 教皇 (The Hierophant)',
    file: '05_hierophant.png',
    upright: '傳統、道德體系、群體歸屬、求師求道、正統價值觀。',
    reversed: '墨守成規、叛逆反抗、被教條束縛、不拘一格的新思維。'
  },
  {
    id: 6,
    name: 'VI. 戀人 (The Lovers)',
    file: '06_lovers.png',
    upright: '和諧的關係、價值觀一致、重要的抉擇、吸引力、合作。',
    reversed: '關係失衡、價值觀衝突、錯誤的選擇、誘惑、承諾破裂。'
  },
  {
    id: 7,
    name: 'VII. 戰車 (The Chariot)',
    file: '07_chariot.png',
    upright: '決心、意志力、克服障礙、掌控衝突、朝著目標大步前進。',
    reversed: '失控、挫折、衝動魯莽、方向混亂、遭遇強烈阻力。'
  },
  {
    id: 8,
    name: 'VIII. 力量 (Strength)',
    file: '08_strength.png',
    upright: '內在力量、勇氣、耐心、以柔克剛、情緒的馴服。',
    reversed: '自我懷疑、脆弱無助、情緒失控、軟弱妥協、濫用權力。'
  },
  {
    id: 9,
    name: 'IX. 隱士 (The Hermit)',
    file: '09_hermit.png',
    upright: '內省、沉思、尋求真理、獨處、指引方向的光芒。',
    reversed: '孤立排閉、迷失方向、孤芳自賞、拒絕接納外界建議。'
  },
  {
    id: 10,
    name: 'X. 命運之輪 (Wheel of Fortune)',
    file: '10_wheel_of_fortune.png',
    upright: '轉折點、好運、命運循環、不可抗的契機、順應變化。',
    reversed: '運氣低迷、抗拒改變、壞循環、意外挫折、不可控的倒退。'
  },
  {
    id: 11,
    name: 'XI. 正義 (Justice)',
    file: '11_justice.png',
    upright: '公正、誠實、因果報應、客觀事實、法律與道德抉擇。',
    reversed: '偏見不公、推卸責任、不誠實、遭遇冤屈、逃避審判。'
  },
  {
    id: 12,
    name: 'XII. 倒吊人 (The Hanged Man)',
    file: '12_hanged_man.png',
    upright: '換位思考、暫停、自我犧牲、放下執念、獲得新視角。',
    reversed: '無謂的犧牲、停滯不前、拖延逃避、固執死板。'
  },
  {
    id: 13,
    name: 'XIII. 死神 (Death)',
    file: '13_death.png',
    upright: '結束、脫胎換骨、告別舊事物、必然的轉變、新生。',
    reversed: '抗拒結束、恐懼變革、苟延殘喘、無法擺脫過去。'
  },
  {
    id: 14,
    name: 'XIV. 節制 (Temperance)',
    file: '14_temperance.png',
    upright: '平衡、中庸、調和協調、耐心整合、身心平靜。',
    reversed: '極端失衡、缺乏節制、衝突加劇、急於求成、配合不良。'
  },
  {
    id: 15,
    name: 'XV. 惡魔 (The Devil)',
    file: '15_devil.png',
    upright: '執念、物質誘惑、束縛、慾望膨脹、盲目沉溺。',
    reversed: '打破枷鎖、重獲自由、看清誘惑、克服依賴、覺醒。'
  },
  {
    id: 16,
    name: 'XVI. 高塔 (The Tower)',
    file: '16_tower.png',
    upright: '驟然劇變、幻象破滅、崩解重構、不可抗的衝擊、意外震撼。',
    reversed: '恐懼崩潰、推遲必然的痛苦、從災難中僥倖逃生、內部瓦解。'
  },
  {
    id: 17,
    name: 'XVII. 星星 (The Star)',
    file: '17_star.png',
    upright: '希望、信念、靈感、精神平靜、治癒、光明的未來。',
    reversed: '失去信心、絕望消極、目標落空、精神疲憊、懷才不遇。'
  },
  {
    id: 18,
    name: 'XVIII. 月亮 (The Moon)',
    file: '18_moon.png',
    upright: '不安、迷惘、潛意識恐懼、局勢未明、虛幻與直覺考驗。',
    reversed: '撥雲見日、恐懼釋放、看清真相、謊言揭穿、克服焦慮。'
  },
  {
    id: 19,
    name: 'XIX. 太陽 (The Sun)',
    file: '19_sun.png',
    upright: '活力、成功、喜悅、光明磊落、自信、極佳的正向成果。',
    reversed: '暫時的烏雲、熱情受挫、過度自負、延遲的成功。'
  },
  {
    id: 20,
    name: 'XX. 審判 (Judgement)',
    file: '20_judgement.png',
    upright: '覺醒、重大決定、救贖、召喚、反省與清算、全新的篇章。',
    reversed: '自我懷疑、悔恨內疚、逃避召喚、重複犯錯、猶豫不決。'
  },
  {
    id: 21,
    name: 'XXI. 世界 (The World)',
    file: '21_world.png',
    upright: '圓滿完成、達成目標、整體和諧、成就、全新的循環啟程。',
    reversed: '功虧一簣、未完成的遺憾、缺乏收尾、延誤、封閉自限。'
  }
] as const


export interface TarotSpreadMeta {
  count: number
  displayName: string
  positions: readonly string[]
}

/**
 * 塔羅專屬牌陣語義字典 (Domain-driven Spread Templates)
 * 好品味：按抽牌張數精準分配位象，杜絕語意污染
 */
export const TAROT_SPREADS: Record<number, TarotSpreadMeta> = {
  1: {
    count: 1,
    displayName: '🎴 單牌神諭 · 當下核心指引 (1 張)',
    positions: ['核心啟示 · 當下指引']
  },
  2: {
    count: 2,
    displayName: '☯️ 二元對立牌陣 · 明面與暗面 (2 張)',
    // ★ 修正致命衝突：使用「明面/暗面」替代「正位/逆位」
    positions: [
      '顯化面 · 當前局勢與挑戰',
      '隱藏面 · 潛在阻礙與深層因素'
    ]
  },
  3: {
    count: 3,
    displayName: '⏳ 經典時序牌陣 · 過去 / 現在 / 未來 (3 張)',
    positions: [
      '過去 · 起因與過往',
      '現在 · 當前局勢與挑戰',
      '未來 · 走向與終局啟示'
    ]
  },
  4: {
    count: 4,
    displayName: '🌍 四象元素牌陣 · 地水火風 (4 張)',
    positions: [
      '地象 · 現實與物質層面',
      '水象 · 情感與人際關係',
      '火象 · 行動與原初動力',
      '風象 · 思維與心智層面'
    ]
  },
  5: {
    count: 5,
    displayName: '⭐ 五要素核心牌陣 · 局勢與策略 (5 張)',
    positions: [
      '核心現狀 · 此時此刻',
      '過往根基 · 潛在影響',
      '當前阻礙 · 核心矛盾',
      '因應策略 · 突破契機',
      '發展趨勢 · 最終走向'
    ]
  },
  6: {
    count: 6,
    displayName: '✡️ 六方位牌陣 · 環境與全景 (6 張)',
    positions: [
      '核心現狀 · 此時此刻',
      '過往根基 · 潛在影響',
      '當前阻礙 · 核心矛盾',
      '因應策略 · 突破契機',
      '發展趨勢 · 最終走向',
      '外界影響 · 他人與環境'
    ]
  },
  7: {
    count: 7,
    displayName: '✨ 七星方位牌陣 · 內心與心態 (7 張)',
    positions: [
      '核心現狀 · 此時此刻',
      '過往根基 · 潛在影響',
      '當前阻礙 · 核心矛盾',
      '因應策略 · 突破契機',
      '發展趨勢 · 最終走向',
      '外界影響 · 他人與環境',
      '自我心態 · 內在心理與情緒'
    ]
  },
  8: {
    count: 8,
    displayName: '🌀 曼陀羅牌陣 · 恐懼與潛意識 (8 張)',
    positions: [
      '核心現狀 · 此時此刻',
      '過往根基 · 潛在影響',
      '當前阻礙 · 核心矛盾',
      '因應策略 · 突破契機',
      '發展趨勢 · 最終走向',
      '外界影響 · 他人與環境',
      '自我心態 · 內在心理與情緒',
      '潛在恐懼 · 隱藏的焦慮不安'
    ]
  },
  9: {
    count: 9,
    displayName: '🪟 九宮格全瞻牌陣 · 全維度推演 (9 張)',
    positions: [
      '第一位 · 現狀 / 核心',
      '第二位 · 阻礙 / 助力',
      '第三位 · 根基 / 潛意識',
      '第四位 · 過往 / 近期事件',
      '第五位 · 冠冕 / 目標與希望',
      '第六位 · 未來 / 近期趨勢',
      '第七位 · 自我 / 心理心態',
      '第八位 · 環境 / 外界影響',
      '第九位 · 期盼 / 潛在恐懼'
    ]
  },
  10: {
    count: 10,
    displayName: '⚔️ 凱爾特十字牌陣 · 權威十牌大陣 (10 張)',
    positions: [
      '第一位 · 現狀 / 核心',
      '第二位 · 阻礙 / 助力',
      '第三位 · 根基 / 潛意識',
      '第四位 · 過往 / 近期事件',
      '第五位 · 冠冕 / 目標與希望',
      '第六位 · 未來 / 近期趨勢',
      '第七位 · 自我 / 心理心態',
      '第八位 · 環境 / 外界影響',
      '第九位 · 期盼 / 潛在恐懼',
      '第十位 · 終局 / 最終啟示'
    ]
  }
}