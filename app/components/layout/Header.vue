<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
const { user, isPending, login, fetchUser } = useAuth()

// 頁面初次掛載時拉取一次身份
onMounted(() => {
  fetchUser()
})

// 下拉選單項（使用 Nuxt UI 標準資料結構）
const dropdownItems = computed(() => [
  [
    {
      label: user.value?.global_name || user.value?.username || 'Operator',
      slot: 'account',
      disabled: true
    }
  ],
  [
    {
      label: '林間小鎮 Discord 伺服器',
      icon: 'i-simple-icons-discord',
      to: 'https://discord.com/servers/510192195509157909',
      target: '_blank'
    }
  ],
  [
    {
      label: '登出系統',
      icon: 'i-lucide-log-out',
      to: '/api/auth/logout',
      external: true,
      target: '_self'
    }
  ]
])

const items = computed<NavigationMenuItem[]>(() => [
  { label: '主頁', icon: 'i-lucide-house', to: '/' },
  {
    label: '麥塊系列',
    icon: 'i-lucide-box',
    defaultOpen: true,
    children: [
      { label: '超极限生存竞赛', to: 'https://eaglepb2.gitbook.io/uhc_report/', target: '_blank' },
      { label: '多人生存 · SMP', to: '/games/minecraftsmp' }
    ]
  },
  {
    label: '雀魂麻將',
    icon: 'i-lucide-playing-cards',
    defaultOpen: true,
    children: [
      { label: '戰報一覽', to: '/games/mahjongsoul/' },
      { label: '賽事規章', to: '/games/mahjongsoul/rules' },
      { label: '如何加入比賽場', to: '/games/mahjongsoul/how-to' },
      { label: '玩家數據', to: '/games/mahjongsoul/players/sanma', badge: { label: 'Beta', color: 'warning' } }
    ]
  },
  {
    label: '繪畫系列',
    icon: 'i-lucide-palette',
    defaultOpen: true,
    children: [
      { label: '林間靈魂繪師', to: '/games/garticphone' },
      { label: '林間交換繪', to: 'https://kp06125.github.io/card/', target: '_blank' }
    ]
  },
  {
    label: '謎語人的呻吟',
    icon: 'i-lucide-square-terminal',
    to: '/games/ctf'
  }
])
</script>

<template>
  <UHeader>
    <!-- 🟢 1. 消除 <a> 套 <a> 的致命 Bug，并将 PNG 替换为矢量 SVG -->
    <template #title>
      <div class="flex-shrink-0 flex items-center gap-2">
        <UColorModeImage
          light="/brand/svg/logo-dark.svg"
          dark="/brand/svg/logo-light.svg"
          width="32"
          height="32"
          alt="ForestWork Logo"
          class="h-8 w-auto"
        />
        <span class="font-bold hidden sm:block">ForestWork</span>
      </div>
    </template>

    <UNavigationMenu :items="items" class="w-full justify-center" content-orientation="vertical" />

    <!-- 🟢 2. 使用 ClientOnly 防御 SSR 与客户端身份状态脱节引发的水合警告 -->
    <template #right>
      <UColorModeButton />

      <ClientOnly>
        <!-- 載入中骨架屏佔位 -->
        <div v-if="isPending" class="w-8 h-8 rounded-full bg-slate-800 animate-pulse hidden lg:block" />

        <!-- 已登入：渲染 Discord 頭像與下拉操作選單 -->
        <UDropdownMenu v-else-if="user" :items="dropdownItems" :popper="{ placement: 'bottom-end' }">
          <UButton color="secondary" variant="ghost" class="flex items-center gap-2 p-1 rounded-full hover:bg-slate-800">
            <UAvatar :src="user.avatar || undefined" :alt="user.username" size="sm" class="border border-emerald-500/50" />
            <span class="text-xs font-mono text-emerald-400 font-bold hidden xl:inline-block pr-1">
              {{ user.username }}
            </span>
            <UIcon name="i-lucide-chevron-down" class="w-4 h-4 text-slate-400" />
          </UButton>

          <template #account="{ item }">
            <div class="text-left font-mono">
              <p class="text-xs text-slate-400">目前登入身份</p>
              <p class="truncate font-bold text-xs text-emerald-400">
                {{ item.label }}
              </p>
            </div>
          </template>
        </UDropdownMenu>

        <!-- 未登入：Discord 登入按鈕 -->
        <UButton
          v-else
          color="primary"
          variant="solid"
          icon="i-simple-icons-discord"
          class="hidden lg:inline-flex font-mono text-xs font-bold"
          @click="login"
        >
          Discord 登入
        </UButton>

        <template #fallback>
          <div class="w-20 h-8 rounded-md bg-slate-800/50 animate-pulse hidden lg:block" />
        </template>
      </ClientOnly>
    </template>

    <!-- 🟢 3. 彻底拔掉静态 SVG 身上有害的 <ClientOnly> -->
    <template #toggle="{ open, toggle, ui }">
      <UButton
        size="sm"
        variant="ghost"
        color="neutral"
        square
        :class="ui.toggle({ toggleSide: 'right' })"
        @click="toggle"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="size-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
        </svg>
      </UButton>
    </template>

    <template #body>
      <UNavigationMenu :items="items" orientation="vertical" class="px-2 mt-4" />

      <div class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800 px-4">
        <UButton
          to="https://discord.gg/lin-jian-xiao-zhen-510192195509157909"
          target="_blank"
          color="primary"
          variant="solid"
          block
        >
          加入Discord
        </UButton>
      </div>
    </template>
  </UHeader>
</template>