// composables/useAuth.ts
export interface UserProfile {
  id: string
  username: string
  global_name: string | null
  avatar: string | null
}

export function useAuth() {
  // Nuxt SSR 友好的全域響應式單例狀態
  const user = useState<UserProfile | null>('auth_user', () => null)
  const isPending = useState<boolean>('auth_pending', () => true)

  const fetchUser = async () => {
    try {
      isPending.value = true
      const res = await $fetch<{ authenticated: boolean; user: UserProfile | null }>('/api/auth/me')
      user.value = res.authenticated ? res.user : null
    } catch {
      user.value = null
    } finally {
      isPending.value = false
    }
  }

  // 登录：携带当前浏览器的 pathname 发起授权
  const login = () => {
    const currentPath = window.location.pathname + window.location.search
    window.location.href = `/api/auth/discord/login?redirect=${encodeURIComponent(currentPath)}`
  }

  // 登出：POST from this page, then reload it so every part of the page sees the logged-out state
  const logout = async () => {
    await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
    window.location.reload()
  }

  return {
    user,
    isPending,
    fetchUser,
    login,
    logout
  }
}