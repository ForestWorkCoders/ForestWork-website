// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxtjs/supabase'
  ],

  devtools: {
    enabled: true
  },

  supabase: {
    redirect: false
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
    '/gartic_phone': { redirect: { to: '/games/gartic-phone', statusCode: 301 } },
    '/gartic_phone/**': { redirect: { to: '/games/gartic-phone', statusCode: 301 } }
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