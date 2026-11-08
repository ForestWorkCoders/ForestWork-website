// server/discord/commands/index.ts
import type { H3Event } from 'h3'
import { handlePing } from './ping'
import { handleSite } from './site'
import { handleRoll } from './roll'
import { handleCc } from './cc'
import { handleChoice } from './choice'
import { handleArrange } from './arrange'
import { handleDemoPager } from './demo-pager'
import { handleRollAdv } from './roll_adv'
import { handleMahjongPair } from './mahjong_pair'
import { handleBookOfAnswers } from './book-of-answers'
import { handleTarot } from './tarot'
import { handleBirthday } from './birthday'
import { handleInsanity } from './insanity'
import { handleCocGrowth } from './coc-growth'
import { handleCocMake } from './coc-make'
import { handleCardCommand } from './card'
import { handleSc } from './sc'

export type CommandHandler = (interaction: any, event: H3Event) => Promise<any> | any

export const commandRegistry: Record<string, CommandHandler> = {
  ping: handlePing,
  site: handleSite,
  roll: handleRoll,
  choice: handleChoice,
  arrange: handleArrange,
  pages: handleDemoPager,
  roll_adv: handleRollAdv,
  mahjong_pair: handleMahjongPair,
  解答之書: handleBookOfAnswers,
  每日塔羅: handleTarot,
  生日密碼: handleBirthday,
  insanity: handleInsanity,
  cc: handleCc,
  sc: handleSc,
  en: handleCocGrowth,
  coc_make: handleCocMake,
  card: handleCardCommand,
}