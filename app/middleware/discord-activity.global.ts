// app/middleware/discord-activity.global.ts
export default defineNuxtRouteMiddleware((to) => {
  if (to.path !== '/') return

  const url = useRequestURL()
  const isDiscordSays = url.hostname.includes('discordsays.com')
  const hasFrameId = Boolean(to.query.frame_id || url.searchParams.has('frame_id'))

  if (isDiscordSays || hasFrameId) {
    // ★ 核心好品味：直接提取原始物理 Query 字符串，绝不用 to.query 重新序列化，杜绝参数丢失！
    const rawSearch = import.meta.client
      ? window.location.search
      : (url.search || '')

    return navigateTo(`/activities/skill-test${rawSearch}`, { replace: true })
  }
})