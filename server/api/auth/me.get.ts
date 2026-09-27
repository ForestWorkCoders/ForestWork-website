// server/api/auth/me.get.ts
// 注意：SESSION_COOKIE_NAME 与 unsealSessionData 由 server/utils/session.ts 自动引入！
export default defineEventHandler((event) => {
  // 1. 只看浏览器悄悄带上来的 HttpOnly Cookie
  const cookieValue = getCookie(event, SESSION_COOKIE_NAME)
  
  // 2. 解密封包（防篡改签名校验）
  const session = unsealSessionData(cookieValue)

  // 3. 没票或被篡改，返回未登录
  if (!session) {
    return { authenticated: false, user: null }
  }

  // 4. 有票，直接吐出操作员画像！
  return { authenticated: true, user: session }
})