// server/api/__sitemap__/urls.ts
// Bundled at build time: server functions on Vercel have no public/ folder on disk
import sessionIndex from '~~/public/data/index.json'
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
    // 1. Gartic Phone replays, one per session in public/data/index.json
    // ==========================================
    for (const session of sessionIndex) {
        urls.push({ loc: `/games/garticphone/${session.id}` })
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