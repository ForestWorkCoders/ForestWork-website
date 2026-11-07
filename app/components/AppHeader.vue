<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { motion } from 'motion-v'
import type { VariantType } from 'motion-v'

const items = computed<NavigationMenuItem[]>(() => [
  { label: '主頁', icon: 'i-lucide-house', to: '/' },
  {
    label: '麥塊系列',
    icon: 'i-lucide-box',
    defaultOpen: true, // 預設展開
    children: [
      { label: '超极限生存竞赛', to: 'https://eaglepb2.gitbook.io/uhc_report/', target: '_blank' },
      { label: '多人生存 · SMP', to: 'https://forestwork-smp.vercel.app/', target: '_blank' }
    ]
  },
  {
    label: '日麻系列',
    icon: 'i-lucide-gamepad-2',
    defaultOpen: true, // 預設展開
    children: [
      { label: '賽事規章', to: 'https://forestwork-mahjong.vercel.app/pages/rules', target: '_blank' },
      { label: '積分賽', to: 'https://forestwork-mahjong.vercel.app', target: '_blank' },
      { label: '數番盃', to: 'https://forestwork-mahjong.vercel.app/pages/event_week/2022JuneMahjongEvent', target: '_blank' },
      { label: '役滿盃', to: 'https://forestwork-mahjong.vercel.app/pages/event_week/pages/mahjong/2023MarchMahjongEvent', target: '_blank' },
      { label: '鬼門盃', to: 'https://forestwork-mahjong.vercel.app/pages/event_week/pages/mahjong/2023AugustMahjongEvent', target: '_blank' }
    ]
  },
  {
    label: '同樂系列',
    icon: 'i-lucide-users',
    defaultOpen: true, // 預設展開
    children: [
      { label: '林間靈魂繪師', to: 'https://eaglepb2.github.io/gartic_phone/', target: '_blank' }
    ]
  },
  {
    label: '謎語人的呻吟',
    icon: 'i-lucide-message-circle',
    to: 'http://104.199.236.163/',
    target: '_blank'
  }
])

const variants: { [k: string]: VariantType | ((custom: unknown) => VariantType) } = {
  normal: {
    rotate: 0,
    y: 0,
    opacity: 1
  },
  close: (custom: unknown) => {
    const c = custom as number
    return {
      rotate: c === 1 ? 45 : c === 3 ? -45 : 0,
      y: c === 1 ? 6 : c === 3 ? -6 : 0,
      opacity: c === 2 ? 0 : 1,
      transition: {
        type: 'spring',
        stiffness: 260,
        damping: 20
      }
    }
  }
}
</script>

<template>
  <UHeader>
    <template #title>
      <NuxtLink to="/" class="flex-shrink-0 flex items-center gap-2">
        <UColorModeImage
    light="/images/logo-light.png"
    dark="/images/logo-dark.png"
    width="32" height="32"
    alt="ForestWork" class="h-8 w-auto"
    />
        <!-- <img src="~assets/images/favicon.png" alt="ForestWork" class="h-8 w-auto"> -->
        <span class="font-bold hidden sm:block">ForestWork</span>
      </NuxtLink>
    </template>

    <UNavigationMenu :items="items" class="w-full justify-center" content-orientation="vertical" />

    <template #right>
      <UColorModeButton />
      <UButton to="https://discord.gg/lin-jian-xiao-zhen-510192195509157909" target="_blank" color="primary"
        variant="solid" class="hidden lg:inline-flex">
        加入Discord
      </UButton>
    </template>

    <template #toggle="{ open, toggle, ui }">
      <UButton size="sm" variant="ghost" color="neutral" square :class="ui.toggle({ toggleSide: 'right' })"
        @click="toggle">
        <svg xmlns="http://www.w3.org/2000/svg" class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <motion.line x1="4" y1="6" x2="20" y2="6" :variants="variants" :animate="open ? 'close' : 'normal'"
            :custom="1" class="outline-none" />
          <motion.line x1="4" y1="12" x2="20" y2="12" :variants="variants" :animate="open ? 'close' : 'normal'"
            :custom="2" class="outline-none" />
          <motion.line x1="4" y1="18" x2="20" y2="18" :variants="variants" :animate="open ? 'close' : 'normal'"
            :custom="3" class="outline-none" />
        </svg>
      </UButton>
    </template>

    <template #body>
      <UNavigationMenu :items="items" orientation="vertical" class="px-2 mt-4" />

      <div class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800 px-4">
        <UButton to="https://discord.gg/lin-jian-xiao-zhen-510192195509157909" target="_blank" color="primary"
          variant="solid" block>
          加入Discord
        </UButton>
      </div>
    </template>
  </UHeader>
</template>