// server/api/ctf/challenges.get.ts
import { serverSupabaseClient } from '#supabase/server'
// 改用纯物理相对路径！消除任何 Nuxt 别名解析歧义（从 server/api/ctf/ 往上跳三层到根目录）
import type { Database } from '../../../types/database.types'

export default defineEventHandler(async (event) => {
  // 2. 强行显式指定 <Database>，斩断一切歧义
  const supabase = await serverSupabaseClient<Database>(event)

  // 此时 .schema('ctf') 会直接受到 types/database.types.ts 的绝对统治
  const { data, error } = await supabase
    .schema('ctf')
    .from('challenge_points')
    .select('id, title, category, prompt, current_points, solve_count, files')
    .eq('is_active', true)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return data
})