// server/api/auth/logout.post.ts
import { SESSION_COOKIE_NAME, sanitizeRedirect } from '../../utils/session'

export default defineEventHandler((event) => {
  // 1. 物理销毁会话 Cookie
  deleteCookie(event, SESSION_COOKIE_NAME, {
    path: '/'
  })

  // 2. 优先提取请求指定的 redirect，没有则尝试提取 Referer 标头，最后兜底首页 /
  const query = getQuery(event)
  const referer = getHeader(event, 'referer')
  
  let targetPath = query.redirect
  if (!targetPath && referer) {
    try {
      targetPath = new URL(referer).pathname
    } catch {
      targetPath = '/'
    }
  }

  // 3. 安全清洗后 302 弹射返回！
  return sendRedirect(event, sanitizeRedirect(targetPath))
})