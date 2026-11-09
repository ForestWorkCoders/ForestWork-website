// server/discord/commands/ping.ts
import type { H3Event } from 'h3'

const DISCORD_EPOCH = 1420070400000n

export async function handlePing(interaction: any, event: H3Event) {
  // 1. 从 Discord 64-bit Snowflake ID 中提取交互创建的物理毫秒时间戳
  const interactionId = BigInt(interaction.id)
  const createdTimestamp = Number((interactionId >> 22n) + DISCORD_EPOCH)

  // 2. 当前 Vercel 接收执行时刻
  const now = Date.now()
  const latency = Math.max(0, now - createdTimestamp)

  // 3. 状态标识（直观分辨是热函数还是冷启动）
  let statusEmoji = '🟢'
  let remark = '極速 (Hot)'

  if (latency > 1500) {
    statusEmoji = '🟡'
    remark = '冷啟動延遲 (Cold Start)'
  } else if (latency > 2500) {
    statusEmoji = '🔴'
    remark = '接近 3 秒超時臨界'
  }

  return {
    type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
    data: {
      content: `🏓 **PONG!**\n` +
               `* **網路延遲**: \`${latency} ms\` ${statusEmoji} (${remark})\n` +
               `* **運行環境**: \`Vercel Serverless (Node.js)\`\n` +
               `* **主站狀態**: \`正常運作中\``
    }
  }
}