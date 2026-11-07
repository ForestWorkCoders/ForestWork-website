// nuxt.config.ts
export default defineNuxtConfig({
  // Nuxt 4 的兼容性日期设定，确保你使用最新的内部机制
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },
  modules: ['@nuxt/ui','@nuxtjs/supabase','@vercel/speed-insights/nuxt'],
  css: ['~/assets/css/main.css'],

  supabase: {
    // 預設情況下，這個模組會強制所有頁面都要登入才能看。
    // 我們是公開的賽事網站，所以必須把 redirect 關掉。
    redirect: false
  },

  app: {
    head: {
      htmlAttrs: { 
        lang: 'zh-TW' // 根据你的 JSON-LD 地址，设定为繁体中文
      },
      title: '林间小镇 ForestWork',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: '林间小镇是一个成立于2019年，有来自不同国家的热血玩家组成的社群。这里有好喝的玫瑰茶 (*^▽^*)' },
        { name: 'author', content: 'EaglePB2' },
        { name: 'theme-color', content: '#ffffff' },
        { name: 'keywords', content: '林间, 林间小镇, ForestWork' },
        
        // Open Graph 标签 (给 Facebook/Discord 预览用的)
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: '林间小镇 ForestWork' },
        { property: 'og:url', content: 'https://forestwork.vercel.app/' },
        { property: 'og:image', content: 'https://og-image.xyz/og/林间小镇/ForestWork/forestwork.team/https/menlo/virtualshapes/ffffff/data.png' },
        { property: 'og:description', content: '林间小镇是一个成立于2019年，有来自不同国家的热血玩家组成的社群。这里有好喝的玫瑰茶 (*^▽^*)' },
        
        // Twitter 标签
        { name: 'twitter:card', content: 'summary' },
        { name: 'twitter:title', content: '林间小镇 ForestWork' },
        { name: 'twitter:site', content: '@TeamForestWork' },
        { name: 'twitter:description', content: '林间小镇是一个成立于2019年，有来自不同国家的热血玩家组成的社群。这里有好喝的玫瑰茶 (*^▽^*)' },
        { name: 'twitter:image', content: 'https://pbs.twimg.com/profile_images/1393930243920957442/6He2XdiU.jpg' },
        { name: 'twitter:image:alt', content: 'ForestWork Logo' }
      ],
      link: [
        // 注意这里的路径！把你的图标放到 public/ 目录下，路径直接写 /
        { rel: 'shortcut icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon.png' },
        { rel: 'manifest', href: '/site.webmanifest' }
      ],
      script: [
        // 结构化数据 (JSON-LD)，这是好品味的 SEO
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            "@context": "http://schema.org/",
            "@type": "Organization",
            "name": "林间小镇",
            "logo": "https://forestwork.vercel.app/left-top-icon.png",
            "url": "https://forestwork.vercel.app/",
            "address": {
              "@type": "PostalAddress",
              "addressCountry": "Taiwan"
            },
            "sameAs": ["@teamforestwork", "@forestwork"]
          })
        }
      ]
    }
  }
})