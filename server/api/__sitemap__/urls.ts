// server/api/__sitemap__/urls.ts
import fs from 'node:fs'
import path from 'node:path'
import { serverSupabaseClient } from '#supabase/server'

// 辅助函数：确保时间戳符合 ISO8601 且消灭 null / undefined
function toIsoDate(dateStr?: string | null): string | undefined {
    if (!dateStr) return undefined
    const d = new Date(dateStr)
    return isNaN(d.getTime()) ? undefined : d.toISOString()
}

export default defineEventHandler(async (event) => {
    const urls: Array<{ loc: string; lastmod?: string }> = []

    // ==========================================
    // 1. 本地磁盘静态流：Gartic Phone 对局 (SSOT)
    // ==========================================
    const indexPath = path.join(process.cwd(), 'public/data/index.json')

    if (fs.existsSync(indexPath)) {
        try {
            const indexRaw = fs.readFileSync(indexPath, 'utf-8')
            const sessions = JSON.parse(indexRaw)

            if (Array.isArray(sessions)) {
                for (const session of sessions) {
                    if (session.id) {
                        urls.push({
                            loc: `/games/gartic-phone/${session.id}`
                        })
                    }
                }
            }
        } catch (err) {
            console.error('[Sitemap] 读取 public/data/index.json 失败:', err)
        }
    }

    // ==========================================
    // 2. 数据库动态流：Supabase 赛事路由
    // ==========================================
    try {
        const client = await serverSupabaseClient(event)

        // 拉取日麻赛事 UUID
        const { data: tournaments_mahjong } = await client
            .schema('mahjong')
            .from('tournaments')
            .select('id, updates_at')

        // 拉取 PB2 赛事 UUID
        const { data: tournaments_pb2 } = await client
            .schema('plazmaburst')
            .from('tournaments')
            .select('id, updates_at')

        if (tournaments_mahjong) {
            for (const t of tournaments_mahjong) {
                const lastmod = toIsoDate(t.updates_at)
                urls.push({
                    loc: `/games/mahjongsoul/tournaments/${t.id}`,
                    ...(lastmod ? { lastmod } : {})
                })
            }
        }

        if (tournaments_pb2) {
            for (const t of tournaments_pb2) {
                const lastmod = toIsoDate(t.updates_at)
                urls.push({
                    loc: `/games/plazmaburst/tournaments/${t.id}`,
                    ...(lastmod ? { lastmod } : {})
                })
            }
        }
    } catch (e) {
        console.error('[Sitemap] 数据库拉取失败，降级使用纯静态路由:', e)
    }

    return urls
})