// server/discord/commands/index.ts
import type { H3Event } from 'h3'
import { handlePing } from './ping'
import { handleSite } from './site'
import { handleRoll } from './roll'
import { handleCc } from './cc'
import { handleChoice } from './choice'
import { handleArrange } from './arrange'

export type CommandHandler = (interaction: any, event: H3Event) => Promise<any> | any

export const commandRegistry: Record<string, CommandHandler> = {
  ping: handlePing,
  site: handleSite,
  roll: handleRoll,
  cc: handleCc,
  choice: handleChoice,
  arrange: handleArrange
}