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

export type CommandHandler = (interaction: any, event: H3Event) => Promise<any> | any

export const commandRegistry: Record<string, CommandHandler> = {
  ping: handlePing,
  site: handleSite,
  roll: handleRoll,
  cc: handleCc,
  choice: handleChoice,
  arrange: handleArrange,
  pages: handleDemoPager,
  roll_adv: handleRollAdv,
  mahjong_pair: handleMahjongPair,
  解答之书: handleBookOfAnswers,
  每日塔羅: handleTarot,
  生日密碼: handleBirthday
}