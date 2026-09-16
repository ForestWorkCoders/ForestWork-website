// server/routes/fwmp_result.ts
import { getQuery, sendRedirect } from 'h3'

// 历史 2024 与 2025 年度邀请赛/积分榜对应的新站真实落地页
// 替换为你数据库中 2024 和 2025 真实的 Tournament UUID
const FWMP_LEAGUE_MAP: Record<string, string> = {
  '2024': '/games/mahjongsoul/tournaments/3f085a0b-5d47-416d-a2c2-a34f80cf844d',
  '2025': '/games/mahjongsoul/tournaments/6de17681-ede7-48bf-a6f2-df3abf0b0d0f'
}

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const league = String(query.league || '').trim()

  // 1. 精确命中 2024 或 2025 -> 301 永久重定向
  const target = FWMP_LEAGUE_MAP[league]
  if (target) {
    return sendRedirect(event, target, 301)
  }

  // 2. 特殊情况（未传参、传错参数、裸路径） -> 安全降级至日麻大厅，绝不 404
  return sendRedirect(event, '/games/mahjongsoul', 302)
})