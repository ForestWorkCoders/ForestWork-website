// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxtjs/supabase',
    '@nuxtjs/sitemap'
  ],

  site: {
    url: 'https://forestwork.vercel.app'
  },

  sitemap: {
    // 自动整合 Nitro 动态 URL 来源
    sources: [
      '/api/__sitemap__/urls'
    ],
    // 排除纯内部 API 端点，防止泄露给搜索引擎
    exclude: [
      '/api/**',
      '/activities/**',
      '/tools/giveaway'
    ]
  },

  devtools: {
    enabled: true
  },

  supabase: {
    // 强制关闭所有对外部机器人的全局鉴权检查与重定向
    redirect: false,
    // 或者如果你开启了重定向保护，必须显式排除该路径：
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: [
        '/api/discord/**',   // ★ 核心：彻底禁止 Supabase 插手 Discord 端点！
        '/api/discord'
      ]
    }
  },

  vite: {
    optimizeDeps: {
      include: [
        '@vercel/speed-insights/vue',
        'echarts/charts',
        'echarts/components',
        'echarts/core',
        'echarts/renderers',
        'markdown-it',
        'vue-echarts',
      ]
    }
  },

  css: ['~/assets/css/main.css'],

  routeRules: {
    // 0. 絕對默認
    '/': { prerender: true },

    // 1. 舊日麻網頁重定向
    '/rules': { redirect: { to: '/games/mahjongsoul/rules', statusCode: 301 } },
    '/pages/rules/': { redirect: { to: '/games/mahjongsoul/rules', statusCode: 301 } },
    '/how-to': { redirect: { to: '/games/mahjongsoul/how-to', statusCode: 301 } },
    '/tournaments/**': { redirect: { to: '/games/mahjongsoul/tournaments/**', statusCode: 301 } },
 
    // 2.1. 2022 年 6 月 數番盃（精確命中 -> 301 永久重定向）
    '/pages/event_week/2022JuneMahjongEvent': { redirect: { to: '/games/mahjongsoul/tournaments/fec16063-0e19-41ce-a766-aa41eb930ecf', statusCode: 301 } },
    '/pages/event_week/2022JuneMahjongEvent/**': { redirect: { to: '/games/mahjongsoul/tournaments/fec16063-0e19-41ce-a766-aa41eb930ecf', statusCode: 301 } },

    // 2.2. 2023 年 3 月 役滿盃（精確命中 -> 301 永久重定向）
    '/pages/event_week/2023MarchMahjongEvent': { redirect: { to: '/games/mahjongsoul/tournaments/a4626acc-b3c1-4e73-aa2a-3d019b7731c2', statusCode: 301 } },
    '/pages/event_week/2023MarchMahjongEvent/**': { redirect: { to: '/games/mahjongsoul/tournaments/a4626acc-b3c1-4e73-aa2a-3d019b7731c2', statusCode: 301 } },

    // 2.3. 活動周目錄通配保底（消除未知死鏈 -> 302 降級至日麻專區）
    '/pages/event_week/**': { redirect: { to: '/games/mahjongsoul', statusCode: 302 } },

    // 3. Gartic Phone 旧站重定向（301 永久重定向）
    '/gartic_phone': { redirect: { to: '/games/garticphone', statusCode: 301 } },
    '/gartic_phone/**': { redirect: { to: '/games/garticphone', statusCode: 301 } },

    // 4. CTF 旧站重定向（301 永久重定向）
    '/pages/others/Puzzles': { redirect: { to: '/games/ctf', statusCode: 302 } },
    '/pages/others/Puzzles/**': { redirect: { to: '/games/ctf', statusCode: 302 } },

    // 5. Discord 站内嵌套允许（CSP + XFO）
    '/activities/**': {
      headers: {
        'Content-Security-Policy': "frame-ancestors 'self' https://*.discordsays.com https://discord.com",
        'X-Frame-Options': 'ALLOWALL'
      }
    }
  },

  compatibilityDate: '2026-06-30',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})