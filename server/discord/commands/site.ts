// server/discord/commands/site.ts
import type { H3Event } from 'h3'

export async function handleSite(interaction: any, event: H3Event) {
  return {
    type: 4,
    data: {
      content: '🌲 **林間小鎮官方賽事平台**：https://forestwork.vercel.app'
    }
  }
}