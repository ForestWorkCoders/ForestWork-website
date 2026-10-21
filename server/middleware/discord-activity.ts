// server/middleware/discord-activity.ts
import { defineEventHandler, getRequestURL, sendRedirect } from 'h3'

export default defineEventHandler((event) => {
  const url = getRequestURL(event)

  // 1. 守卫：只在访问根路径 '/' 时进行分流判定，不打扰其他正常子路由
  if (url.pathname === '/') {
    // 2. 检测 Discord 物理指纹
    const isDiscordSays = url.host.includes('discordsays.com') ||
      Boolean((event.node.req.headers['x-forwarded-host'] as string | undefined)?.includes('discordsays.com'))

    const hasFrameId = url.searchParams.has('frame_id')

    // 3. 命中 Discord 启动环境
    if (isDiscordSays || hasFrameId) {
      // ★ 核心铁律：必须完整拼接 url.search，绝不能丢掉 frame_id 等通信凭证！
      const target = `/activities/skill-test${url.search}`
      return sendRedirect(event, target, 302)
    }
  }
})