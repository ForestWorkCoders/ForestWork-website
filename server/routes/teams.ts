// server/routes/teams.ts
import { getQuery, sendRedirect } from 'h3'

// 历史 3 季团队接力赛对应的新站真实落地页
// 替换为你数据库中 S1, S2, S3 真实的 Tournament UUID
const LEGACY_TEAMS_MAP: Record<string, string> = {
  '1': '/games/mahjongsoul/tournaments/7e17f5f5-b614-40e8-9511-a0b20a257315',
  '2': '/games/mahjongsoul/tournaments/fb80a662-41c8-4f2c-a4f2-7d2fcc63664b',
  '3': '/games/mahjongsoul/tournaments/094e6267-143e-487c-9a44-1150a5112150'
}

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const seasonParam = String(query.season_param || '').trim()

  // 1. 命中 1, 2, 3 -> 301 永久重定向到具体的接力赛页面
  const target = LEGACY_TEAMS_MAP[seasonParam]
  if (target) {
    return sendRedirect(event, target, 301)
  }

  // 2. 特殊情况（未传参、传错参数） -> 安全降级至日麻大厅，绝不 404
  return sendRedirect(event, '/games/mahjongsoul', 302)
})