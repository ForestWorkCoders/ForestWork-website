// server/api/ctf/submit.post.ts
import { createHash } from 'node:crypto'
import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '../../../types/database.types'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const submittedFlag = String(body?.flag || '').trim().replace(/^["']|["']$/g, '')
    const accountId = Number(body?.accountId || 10001)

    if (!submittedFlag) {
        throw createError({ statusCode: 400, statusMessage: 'Missing flag parameter.' })
    }

    const supabase = await serverSupabaseClient<Database>(event)

    // 1. 同时准备：原样字面量哈希 & 规范化全小写哈希
    // 准备原始哈希与小写哈希
    const rawHash = createHash('sha256').update(submittedFlag).digest('hex')
    const lowerHash = createHash('sha256').update(submittedFlag.toLowerCase()).digest('hex')

    // ★ 核心改进：把 error 抓出来，绝不容许静默吞错！
    const { data: challenge, error: queryError } = await supabase
        .schema('ctf')
        .from('challenges')
        .select('id, title, is_active')
        .or(`flag_hash.eq.${rawHash},and(is_case_insensitive.eq.true,flag_hash.eq.${lowerHash})`)
        .eq('is_active', true)
        .maybeSingle()

    // 如果数据库本身报错了，立刻在终端咆哮并返回 500，停止掩耳盗铃！
    if (queryError) {
        console.error('❌ [CTF Submit DB Error]:', queryError)
        throw createError({
            statusCode: 500,
            statusMessage: `Database validation error: ${queryError.message}`
        })
    }

    if (!challenge) {
        return { success: false, message: `REJECTED. Invalid token sequence: "${submittedFlag}".` }
    }

    // 3. 记录解题流水（后续逻辑保持不变）
    const { error: insertError } = await supabase
        .schema('ctf')
        .from('solves')
        .insert({ challenge_id: challenge.id, account_id: accountId })

    if (insertError) {
        if (insertError.code === '23505') {
            return { success: false, message: `DUPLICATE. You have already solved [${challenge.id}].` }
        }
        throw createError({ statusCode: 500, statusMessage: insertError.message })
    }

    // 4. 查询当前动态分
    const { data: ptData } = await supabase
        .schema('ctf')
        .from('challenge_points')
        .select('current_points')
        .eq('id', challenge.id)
        .single()

    return {
        success: true,
        message: `ACCEPTED! [${challenge.id}] solved. +${ptData?.current_points || 100} PTS awarded.`
    }
})