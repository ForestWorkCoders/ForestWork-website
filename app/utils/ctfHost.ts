// What the CTF terminal needs from the page that embeds it (website or Discord Activity).

export interface CtfOperator {
  id: string
  username: string
  global_name?: string | null
}

export interface CtfHost {
  /** Current identity; null = guest. Read reactively. */
  operator: CtfOperator | null
  /** Extra headers for every /api/ctf/* request. */
  headers: () => Record<string, string>
  /** Open a link outside the terminal. */
  openExternal: (url: string) => void
  /** Save a file. */
  download: (url: string, name: string) => void
  /** URL to put in <img>/<video>; null = cannot preview here, open externally instead. */
  mediaUrl: (url: string) => string | null
  /** Sign-in commands; leave out when the host has no way to sign in or out. */
  login?: () => void
  logout?: () => void
  /** Extra line printed at startup. */
  notice?: string
  /** Replaces the default mobile banner text. */
  mobileNotice?: string
  /** Message printed when a submit is rejected as unauthenticated. */
  unauthorizedMessage?: string
  /** Where [EXIT SESSION] leads; the link is not shown when absent. */
  exitTo?: string
}
