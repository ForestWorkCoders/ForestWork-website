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


export interface TarotSpread {
  id: string
  name: string          // 用於 Discord 下拉選單的單行緊湊名稱 (嚴格小於 100 字符)
  description: string   // 牌陣釋義 (渲染於 Embed 頂部)
  count: number         // 抽牌張數 (1 ~ 10)
  positions: readonly string[] // 具體牌位象徵
}

export const DEFAULT_SPREAD: TarotSpread = {
  id: 'single',
  name: '🎴 單牌神諭 ⎯ 每日運勢與核心指引 (1 張)',
  description: '最純粹的塔羅啟示，直指此時此刻的核心本質。適合每日抽籤、是非決策或獲取快速靈感。',
  count: 1,
  positions: ['核心啟示 · 當下指引']
}

/**
 * 塔羅專屬牌陣語義字典 (Domain-driven Spread Templates)
 * 好品味：按抽牌張數精準分配位象，杜絕語意污染
 */
export const TAROT_SPREADS: Record<string, TarotSpread> = {
  // ★ 1. 核心基石：单牌与基础通用阵（排在最前）
  single: {
    id: 'single',
    name: '🎴 單牌神諭 ⎯ 每日運勢與核心指引 (1 張)',
    description: '最純粹的塔羅啟示，直指此時此刻的核心本質。適合每日抽籤、是非決策或獲取快速靈感。',
    count: 1,
    positions: ['核心啟示 · 當下指引']
  },
  duality: {
    id: 'duality',
    name: '☯️ 二元對立 ⎯ 顯化局勢與深層阻礙 (2 張)',
    description: '深入審視事物的明暗兩面，對照表面呈現的客觀現實與深層隱藏的潛在因素。',
    count: 2,
    positions: ['顯化面 · 當前局勢與挑戰', '隱藏面 · 潛在阻礙與深層因素']
  },
  three_cards: {
    id: 'three_cards',
    name: '⏳ 三張牌通用 ⎯ 靈活自定義分析 (3 張)',
    description: '通用型占卜牌陣，可以自由定義。應用在很多場合，不受約束地分析獨立事情的各個面向。',
    count: 3,
    positions: ['第一面向 · 本質', '第二面向 · 影響', '第三面向 · 啟示']
  },
  holy_triangle: {
    id: 'holy_triangle',
    name: '📐 聖三角牌陣 ⎯ 前因後果因由剖析 (3 張)',
    description: '梳理問題前因後果，是時間流的變形，更注重事物內在原因而非單純時間流向，適合因由推演。',
    count: 3,
    positions: ['起因 · 根本原因', '現狀 · 核心矛盾', '結果 · 最終演變']
  },
  time_flow: {
    id: 'time_flow',
    name: '⌛ 時間流牌陣 ⎯ 純粹時空流向 (3 張)',
    description: '平行流向的時間解析法，純粹的時間流向。恍若流淌的時間從過去延伸到未來，事件平鋪於時間毯之上。',
    count: 3,
    positions: ['過去 · 既往軌跡', '現在 · 此時此刻', '未來 · 趨向終局']
  },

  // ★ 2. 专项要素与决策阵
  two_choices: {
    id: 'two_choices',
    name: '⚖️ 二選一牌陣 ⎯ 猶豫不決時的最佳選擇 (5 張)',
    description: '適合在兩種情況中選擇其中一種，可用於感情、事業、學業占卜。猶豫不決時是你最棒的選擇。',
    count: 5,
    positions: ['當前面臨的局勢核心', '選擇 A 的實施過程', '選擇 A 的最終結局', '選擇 B 的實施過程', '選擇 B 的最終結局']
  },
  four_elements: {
    id: 'four_elements',
    name: '🌍 四元素牌陣 ⎯ 感性/理性/物質/行動 (4 張)',
    description: '通過四元素了解問題多方面的狀況。從感性、理性、物質、行動四方面透徹審視，多重角度出發了解問題實質。',
    count: 4,
    positions: ['火象 · 原初行動與動能', '水象 · 情感體驗與人際', '風象 · 思維邏輯與溝通', '地象 · 物質現實與成果']
  },
  wealth_spread: {
    id: 'wealth_spread',
    name: '💰 財富之數 ⎯ 揭示脈搏指導求財 (5 張)',
    description: '象徵財富的生成，揭示財富脈搏，對求財有積極的指導意義。想了解自己的財富指數可嘗試此陣。',
    count: 5,
    positions: ['當前財務狀況基調', '正財收入與工作機遇', '意外開銷與破財隱患', '理財投資應對策略', '未來財運總體走向']
  },
  weekly_fortune: {
    id: 'weekly_fortune',
    name: '📅 周運勢牌陣 ⎯ 未來七天運程解析 (7 張)',
    description: '周運占卜的專用牌陣，適用於占卜下一周的運勢，亦可應用在有七天期限的占卜事件中。',
    count: 7,
    positions: [
      '星期一 (Mon) · 起始與動力', '星期二 (Tue) · 推進與節奏', '星期三 (Wed) · 轉折與人際',
      '星期四 (Thu) · 考驗與收穫', '星期五 (Fri) · 結尾與整合', '星期六 (Sat) · 沉澱與反思',
      '星期日 (Sun) · 總結與復盤'
    ]
  },

  // ★ 3. 情感与关系专项阵
  lovers_pyramid: {
    id: 'lovers_pyramid',
    name: '❤️ 戀人金字塔 ⎯ 戀人與情侶關係剖析 (4 張)',
    description: '簡潔直接，涵蓋兩人相戀原始要素。適合戀人情侶間的占卜，牌面一出明瞭易懂。',
    count: 4,
    positions: ['問卜者自我心態', '對方內心真實感受', '雙方當前關係本質', '未來戀情走向前景']
  },
  love_cross: {
    id: 'love_cross',
    name: '✝️ 愛情大十字 ⎯ 洞悉情感狀況與結果 (5 張)',
    description: '注重內心情感，主要應用於情侶之間，善於洞悉彼此關係中的情感狀況並分析結果。',
    count: 5,
    positions: ['自身心境', '對方態度', '阻礙與歧異', '應對助力', '戀局落幕']
  },
  find_partner: {
    id: 'find_partner',
    name: '🔍 尋找對象牌陣 ⎯ 單身願景與目標確立 (5 張)',
    description: '適合單身人士占卜，用來健全意中人的願景，幫助自己確定目標。不知道自己想要什麼，不妨問一問這個牌陣。',
    count: 5,
    positions: ['自身當前特質魅力', '內心真正渴望的伴侶類型', '戀情阻礙絆腳石', '應當採取的行動建議', '未來桃花期許走向']
  },
  love_tree: {
    id: 'love_tree',
    name: '🌳 愛情樹牌陣 ⎯ 感情困境尋找癥結 (5 張)',
    description: '適合溯本求源與尋找癥結。適合戀愛遇到困境時占卜，尋找潛在原因改善感情關係，突出重圍。',
    count: 5,
    positions: ['樹根 · 情感深層基石', '樹幹 · 關係現實核心', '樹枝 · 彼此溝通互動', '落葉 · 必須割捨的執念', '果實 · 改善後的未來']
  },
  gypsy: {
    id: 'gypsy',
    name: '💃 吉普賽牌陣 ⎯ 浪漫釋放情感困獸 (5 張)',
    description: '適合婚姻、戀愛、感情方面的占卜，探索彼此內心想法，找到合適的相處方式。浪漫奔放的首選。',
    count: 5,
    positions: ['對方內心真實想法', '自身對這段感情的期待', '當前關係最大挑戰', '化解矛盾之道', '長遠命運牽絆']
  },
  reconcile_love: {
    id: 'reconcile_love',
    name: '💔 情人複合牌陣 ⎯ 對照內心揭開迷霧 (5 張)',
    description: '通過對照彼此內心感受，揭開對方撲朔迷離的面紗。若念念不忘覺得前緣未了，可打開此牌陣。',
    count: 5,
    positions: ['當初分開的根源矛盾', '對方目前對你的真實心態', '彼此能否破冰的關鍵契機', '如果複合將面臨的新問題', '這段緣分的終局可能']
  },
  venus_love: {
    id: 'venus_love',
    name: '✨ 維納斯牌陣 ⎯ 愛情未來走向大推演 (8 張)',
    description: '適合婚姻、戀愛未來的指向占卜，是分析愛情未來的專門牌陣，能洞察雙方長遠狀況。',
    count: 8,
    positions: [
      '問卜者當前真心態度', '對方此時內心世界', '影響關係的外界環境',
      '彼此潛在障礙', '問卜者期待的願景', '對方所顧慮之處',
      '突破關係的破局點', '最終未來情感結論'
    ]
  },

  // ★ 4. 深度高阶宏观大阵
  hexagram: {
    id: 'hexagram',
    name: '✡️ 六芒星牌陣 ⎯ 窺視未來與顯潛意識 (7 張)',
    description: '判斷事情走向，有積極指導意義，可分析潛意識與顯意識的表達，有著極強的窺視未來能力。',
    count: 7,
    positions: [
      '過去起因', '當前局勢', '未來趨勢',
      '問卜者自身因應對策', '周遭環境與他人態度', '心中的期盼與擔憂',
      '最終神諭結果'
    ]
  },
  celtic_cross: {
    id: 'celtic_cross',
    name: '⚔️ 凱爾特十字 ⎯ 宏觀全貌權威經典大陣 (10 張)',
    description: '擁有很強的總結和規律推演能力，結構細緻嚴謹，可從宏觀角度審視事件全貌，協助做出有利決策。',
    count: 10,
    positions: [
      '第一位 · 現狀 / 核心焦點', '第二位 · 阻礙 / 交叉助力', '第三位 · 根基 / 潛意識源起',
      '第四位 · 過往 / 近期影響事件', '第五位 · 冠冕 / 目標與期許', '第六位 · 未來 / 近期即將走向',
      '第七位 · 自我 / 心理心態定位', '第八位 · 環境 / 外界人際影響', '第九位 · 期盼 / 潛在恐懼矛盾',
      '第十位 · 終局 / 最終宏觀啟示'
    ]
  }
} as const