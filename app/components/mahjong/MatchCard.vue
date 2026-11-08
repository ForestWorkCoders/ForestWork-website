<script setup>
const props = defineProps({
  match: {
    type: Object,
    required: true
  }
})
</script>

<template>
  <div class="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col">
    
    <div class="px-5 py-3 border-b border-gray-100 dark:border-gray-700/50 flex justify-between items-center bg-gray-50/80 dark:bg-[#18212f]">
      <span class="font-black tracking-widest text-sm text-blue-600 dark:text-blue-400 group-hover:text-blue-500 dark:group-hover:text-blue-300 transition-colors">
        {{ match.round }}
      </span>
      <NuxtLink :to="match.paipu_url" target="_blank" class="flex items-center gap-2 group cursor-pointer">
        <span class="text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded group-hover:bg-gray-300 dark:group-hover:bg-gray-700 transition-colors">
          雀魂牌譜
        </span>
      </NuxtLink>
      <span class="text-xs text-gray-500 dark:text-gray-400 font-mono">{{ match.time }}</span>
    </div>

    <div class="p-0 flex-1 bg-white dark:bg-[#1e293b]">
      <table class="w-full text-sm text-left">
        <thead class="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
          <tr>
            <th class="px-4 py-3 font-medium w-12">起莊</th>
            <th class="px-4 py-3 font-medium">玩家</th>
            <th class="px-4 py-3 font-medium text-right">得分</th>
            <th class="px-4 py-3 font-medium text-right">積分</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50 dark:divide-gray-800/50">
          <tr v-for="p in match.players" :key="p.seat" class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            
            <td class="px-4 py-3 font-bold transition-colors" :class="{
              'text-amber-500 dark:text-amber-400 drop-shadow-sm': p.score === Math.max(...match.players.map(x => x.score)),
              'text-gray-400 dark:text-gray-500': p.score !== Math.max(...match.players.map(x => x.score))
            }">
              {{ p.seat }}
            </td>

            <td class="px-4 py-3 font-medium text-gray-900 dark:text-gray-200">{{ p.name }}</td>
            
            <td class="px-4 py-3 text-right font-mono tracking-wide text-gray-800 dark:text-gray-300">
              {{ p.score.toLocaleString() }}
            </td>

            <td class="px-4 py-3 text-right font-mono font-bold"
              :class="p.pts > 0 ? 'text-emerald-600 dark:text-emerald-400' : p.pts < 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'">
              {{ p.pts > 0 ? '+' : '' }}{{ p.pts }}
            </td>
            
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>