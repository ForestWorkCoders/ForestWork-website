// server/utils/supabase.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let cachedClient: ReturnType<typeof createClient> | null = null

/**
 * 斯巴達式後端全權 Supabase 客戶端 (零依賴 event，零 Cookie 負擔)
 */
export function getSupabase(): SupabaseClient<any> {
  if (!cachedClient) {
    cachedClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
  }
  return cachedClient
}