// server/discord/curse-words.mjs
// Detection list for the curse leaderboard. It is only used to count; the words are never shown.
// Plain .mjs so the cron (server/api/cron/sync-curse.get.ts) and the backfill script
// (scripts/discord-backfill-curse.mjs) read the same list.

// Counted wherever they appear. A word that starts or ends with a Latin letter or a digit
// only counts when that end isn't glued to more letters or digits: "87" counts, "1987" doesn't.
const CURSE_WORDS = [
  'fuck', 'shit', '機掰', '雞掰', '78', '靠邀', '靠么', '靠北',
  '三小', '殺小', '3小', '尛', '你媽的', '操', 'NMSL', 'CNMB',
  '你媽逼', 'NMB', '媽的', '幹', 'E04', '屌', '屄', '幹你娘',
  '操你媽', '你媽死了', '林老師勒', '王八蛋', '米蟲', '賤貨', '智障', '敗類',
  '白癡', '北七', '婊子', '屎', '下流', 'fk', 'fucking', 'fucker',
  'nigga', 'niggas', 'nigger', '老母', '林北', '林娘', '低能', '腦殘',
  '腦缺', '腦癱', '霍金', '87', '靠杯', '靠腰', '靠夭', '三洨',
  '啥小', '沙小', '可悲', '臥槽', '窩操', 'wc', 'sb', '傻逼',
  '傻B', '狗屎', '去死', '幹話', '屁話', '神經病', '有病', '皮炎',
  '屁眼', 'p眼', '迪克', '死全家', '死媽', '死媽的', '死你媽', '死你全家',
  '全家產', '他喵的'
]

// Ordinary words that contain a listed word. They are matched first and not counted.
const INNOCENT_WORDS = [
  '操作', '操場', '體操', '操心', '操控',
  '幹嘛', '幹麻', '幹嗎', '幹部', '幹線', '能幹', '骨幹', '主幹', '樹幹', '才幹', '幹練',
  '3小時', '三小時'
]

const escape = (word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function wholeToken(word) {
  const before = /^[a-z0-9]/i.test(word) ? '(?<![a-z0-9])' : ''
  const after = /[a-z0-9]$/i.test(word) ? '(?![a-z0-9])' : ''
  return before + escape(word) + after
}

// Innocent words come first, outside the capture group: they use up their text without counting.
const CURSE_REGEX = new RegExp(
  `${INNOCENT_WORDS.map(escape).join('|')}|(${CURSE_WORDS.map(wholeToken).join('|')})`,
  'gi'
)

/**
 * How many listed words a message contains.
 * @param {string} text
 * @returns {number}
 */
export function countCurses(text) {
  let count = 0
  for (const match of text.matchAll(CURSE_REGEX)) {
    if (match[1]) count++
  }
  return count
}
