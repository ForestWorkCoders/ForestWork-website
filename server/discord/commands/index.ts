// server/discord/commands/index.ts
import type { H3Event } from 'h3'
import { handlePing } from './ping'
import { handleSite } from './site'

export type CommandHandler = (interaction: any, event: H3Event) => Promise<any> | any

export const commandRegistry: Record<string, CommandHandler> = {
  ping: handlePing,
  site: handleSite,
  // 未来新命令直接在这里加一行，清晰明了
}