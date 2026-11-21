<script setup lang="ts">
import type { CtfHost } from '~/utils/ctfHost'

const { user: currentUser, login, logout } = useAuth()

function triggerDownload(url: string, filename?: string) {
    if (!url) return

    // 如果没有显式指定文件名，从 URL 末尾优雅截取，兜底为 artifact.bin
    const fallbackName = url.split('/').pop()?.split('?')[0] || 'artifact.bin'
    const finalName = filename?.trim() || fallbackName

    const link = document.createElement('a')
    link.href = url
    link.download = finalName
    link.target = '_blank'
    link.rel = 'noopener noreferrer'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}

function openExternalTab(rawUrl: string) {
    if (!rawUrl) return
    let dest = rawUrl.trim()

    // 协议安全补齐：防止相对路径污染
    if (!/^https?:\/\//i.test(dest)) {
        dest = `https://${dest}`
    }

    const link = document.createElement('a')
    link.href = dest
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}

// Website host: session cookie identifies the player, links open in new tabs
const host = reactive<CtfHost>({
    get operator() {
        return currentUser.value
    },
    headers: () => ({}),
    openExternal: openExternalTab,
    download: triggerDownload,
    mediaUrl: url => url,
    login,
    logout,
    exitTo: '/'
})

// ==========================================
// 1. 常规 SEO / 社交平台基石兜底 (Twitter Card & Open Graph)
// ==========================================
useSeoMeta({
  title: 'FORESTWORK // CTF 終端控制台 · 極客解密挑戰賽',
  ogTitle: 'FORESTWORK // VIRTUAL_CTF_CONSOLE',
  description: '純前端 WebShell 虛擬終端靶場。支援動態 VFS 檔案系統、隱寫術分析、二進制逆向與動態衰減計分。立即接入 Mainframe 展開滲透！',
  ogDescription: '純前端 WebShell 虛擬終端靶場。支援動態 VFS 檔案系統、隱寫術分析、二進制逆向與動態衰減計分。立即接入 Mainframe 展開滲透！',
  ogImage: 'https://forestwork.vercel.app/images/share/ctf.png', // 1200×630 shot of this terminal after `help`
  twitterCard: 'summary_large_image',
  // 终端专属翡翠绿 (#10B981)
  themeColor: '#10B981'
})

// ==========================================
// 2. Discord Component Embed 专属结构体
// ==========================================
const ctfDiscordEmbedPayload = {
  component: {
    type: 17, // 主容器 Container
    accent_color: 1096065, // #10B981 翡翠绿 (HEX 转十进制整数)
    spoiler: false,
    components: [
      {
        type: 9, // Section 块
        components: [
          {
            type: 10, // Text 终端字符说明
            content: [
              '# FORESTWORK // CTF MAINFRAME',
              '`STATUS: ONLINE` · `ENV: POSIX_VFS_SANDBOX`',
              '',
              '**【全系統挑戰已上線】**',
              '• 支援指令: `ls`, `cat`, `open`, `download`, `submit`, `whois`',
              '• 涵蓋領域: 隱寫術 (Stego) / 逆向 (Reverse) / 密碼學 / Web',
              '• 賽制特性: 即時分數衰減機制 · Discord 帳號認證綁定',
              '',
              '> *「敲下你的第一行指令，奪取屬於你的 Flag。」*'
            ].join('\n')
          }
        ],
        accessory: {
          type: 11, // Thumbnail 挂件
          media: {
            url: 'https://forestwork.vercel.app/images/share/forestwork-team.png' // 终端或林间专属 Logo 图标
          }
        }
      },
      {
        type: 14, // 视觉分割线
        spacing: 1,
        divider: true
      },
      {
        type: 1, // Action Row 操作按钮容器
        components: [
          {
            type: 2,
            style: 5, // Link Button
            label: '接入終端 (Launch Shell)',
            emoji: { name: '💻' },
            url: 'https://forestwork.vercel.app/games/ctf'
          },
        ]
      }
    ]
  }
}

// ==========================================
// 3. 声明式注入并彻底覆写根节点
// ==========================================
useHead({
  script: [
    {
      key: 'discord:component-embed', // 核心好品味：与 app.vue 相同 key 实施强力覆盖
      id: 'discord:component-embed',
      type: 'application/json',
      innerHTML: () => JSON.stringify(ctfDiscordEmbedPayload).replace(/</g, '\\u003c') // 安全防爆转义
    }
  ]
})
</script>

<template>
    <!-- 用 100dvh 精准扣除 Header 与 Footer 高度，彻底封死外层滚动条 -->
    <CtfTerminal
        :host="host"
        class="h-[58dvh] md:h-[62dvh] lg:h-[calc(100dvh-10.5rem)] max-h-[620px] lg:max-h-none" />
</template>
