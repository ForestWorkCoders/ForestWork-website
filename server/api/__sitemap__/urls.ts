// server/api/__sitemap__/urls.ts
import fs from 'node:fs'
import path from 'node:path'
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {

    const urls: Array<{ loc: string; lastmod?: string }> = []

    const indexPath = path.join(process.cwd(), 'public/data/index.json')

    if (fs.existsSync(indexPath)) {
        try {
            const indexRaw = fs.readFileSync(indexPath, 'utf-8')
            const sessions = JSON.parse(indexRaw)

            if (Array.isArray(sessions)) {
                for (const session of sessions) {
                    if (session.id) {
                        urls.push({
                            // 对齐当前 OS 的规范路由拓扑
                            loc: `/games/gartic-phone/${session.id}`
                        })
                    }
                }
            }
        } catch (err) {
            console.error('[Sitemap] 读取 public/data/index.json 失败:', err)
        }
    }

    const client = await serverSupabaseClient(event)

    // 1. 从 Supabase 拉取所有麻将赛事 UUID
    const { data: tournaments_mahjong } = await client
        .schema('mahjong')
        .from('tournaments')
        .select('id, updates_at')

    const { data: tournaments_pb2 } = await client
        .schema('plazmaburst')
        .from('tournaments')
        .select('id, updates_at')

    // 映射赛事动态路径
    if (tournaments_mahjong) {
        for (const t of tournaments_mahjong) {
            urls.push({
                loc: `/games/mahjongsoul/tournaments/${t.id}`,
                lastmod: t.updates_at
            })
        }
    }
    if (tournaments_pb2) {
        for (const t of tournaments_pb2) {
            urls.push({
                loc: `/games/plazmaburst/tournaments/${t.id}`,
                lastmod: t.updates_at
            })
        }
    }
    return urls
})