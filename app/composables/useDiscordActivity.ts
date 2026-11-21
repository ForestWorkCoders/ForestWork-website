import { DiscordSDK, attemptRemap } from '@discord/embedded-app-sdk'

export interface ActivityUser {
  id: string
  username: string
  global_name: string | null
  avatar: string | null
}

// Same client ID fallback as the other Activity pages
const FALLBACK_CLIENT_ID = '311484597248720907'
const SDK_READY_TIMEOUT_MS = 8000

/**
 * Discord Activity session: SDK handshake, sign-in through /api/activities/auth, link helpers.
 * The ticket lives in memory only. Call start() on the client; it returns false outside Discord.
 */
export function useDiscordActivity() {
  const config = useRuntimeConfig()
  const route = useRoute()

  const status = ref<'loading' | 'ready' | 'error'>('loading')
  const error = ref('')
  const user = ref<ActivityUser | null>(null)
  const ticket = ref('')

  let sdk: DiscordSDK | null = null

  // True when the page is running inside the Discord client (frame_id or discordsays.com host)
  function isEmbedded(): boolean {
    if (!import.meta.client) return false

    // The router can hold frame_id after the address bar lost it; the SDK reads the address bar
    const searchParams = new URLSearchParams(window.location.search)
    if (!searchParams.has('frame_id') && route.query.frame_id) {
      const restoredUrl = new URL(window.location.href)
      for (const [k, v] of Object.entries(route.query)) {
        if (typeof v === 'string') restoredUrl.searchParams.set(k, v)
      }
      window.history.replaceState(null, '', restoredUrl.toString())
    }

    const finalParams = new URLSearchParams(window.location.search)
    return finalParams.has('frame_id') || window.location.hostname.includes('discordsays.com')
  }

  async function signIn() {
    const rawClientId = (config.public as Record<string, unknown>).discordClientId
    const clientId = typeof rawClientId === 'string' && rawClientId.trim().length > 0
      ? rawClientId.trim()
      : FALLBACK_CLIENT_ID

    const discordSdk = new DiscordSDK(clientId)
    sdk = discordSdk

    await Promise.race([
      discordSdk.ready(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('SDK_TIMEOUT: Discord ready() took > 8s')), SDK_READY_TIMEOUT_MS))
    ])

    const { code } = await discordSdk.commands.authorize({
      client_id: clientId,
      response_type: 'code',
      state: '',
      prompt: 'none',
      scope: ['identify']
    })
    if (!code) throw new Error('AUTH_EMPTY: Discord did not return code')

    const res = await $fetch<{ success: boolean, authTicket: string, user: ActivityUser }>('/api/activities/auth', {
      method: 'POST',
      body: { code }
    })
    if (!res.success || !res.user || !res.authTicket) throw new Error('AUTH_REJECTED')

    ticket.value = res.authTicket
    user.value = res.user
  }

  async function start(): Promise<boolean> {
    if (!isEmbedded()) return false

    status.value = 'loading'
    try {
      await signIn()
      status.value = 'ready'
    } catch (err: unknown) {
      const e = err as { data?: { statusMessage?: string }, message?: string }
      console.error('[Activity Auth Error]:', err)
      ticket.value = ''
      user.value = null
      error.value = e?.data?.statusMessage || e?.message || 'UNKNOWN_ERROR'
      status.value = 'error'
    }
    return true
  }

  // Discord client opens the link through RPC; plain browsers (or an SDK failure) use window.open
  async function openExternal(url: string) {
    if (sdk) {
      try {
        await sdk.commands.openExternalLink({ url })
        return
      } catch (err) {
        console.warn('[Activity SDK] openExternalLink fallback:', err)
      }
    }
    if (import.meta.client) {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  // Host of the public Supabase project, mapped to the /sb prefix in the Discord developer portal
  function supabaseHost(): string | null {
    const supabase = (config.public as Record<string, unknown>).supabase as { url?: string } | undefined
    if (!supabase?.url) return null
    try {
      return new URL(supabase.url).host
    } catch {
      return null
    }
  }

  // Rewrite a URL through the Activity proxy (no global patching: only URLs passed in are changed)
  function remapUrl(url: string | URL): URL {
    const parsed = new URL(url.toString())
    const target = supabaseHost()
    if (!target) return parsed
    return attemptRemap({ url: parsed, mappings: [{ prefix: '/sb', target }] })
  }

  return { status, error, user, ticket, start, openExternal, remapUrl, supabaseHost }
}
