<script setup>
const props = defineProps({
  tournamentId: {
    type: String,
    required: true
  }
})

const { data: teams, pending } = await useFetch(`/api/mahjong/tournaments/${props.tournamentId}/teams`)

// 日麻職位名稱的在地化 (Localization) 映射
const roleDisplay = {
  Senpo: '先鋒',
  Jiho: '次鋒',
  Chuken: '中堅',
  Fukusho: '副將',
  Taisho: '大將',
  Substitute: '替補'
}

// 根據職位給予不同的顏色標籤，增加視覺層次
const roleColor = {
  Senpo: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Jiho: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  Chuken: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Fukusho: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  Taisho: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  Substitute: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
}
</script>

<template>
  <section class="animate-fade-in">
    <div v-if="pending" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
    </div>

    <div v-else-if="!teams || teams.length === 0" class="text-center py-16 bg-gray-50 dark:bg-[#1e293b] rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
      <UIcon name="i-heroicons-user-group" class="w-12 h-12 mx-auto text-gray-400 mb-3" />
      <h3 class="text-lg font-bold text-gray-900 dark:text-white">參賽隊伍尚未公佈</h3>
      <p class="text-gray-500 dark:text-gray-400 text-sm mt-1">Teams are yet to be announced.</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      
      <div 
        v-for="team in teams" 
        :key="team.id"
        class="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
      >
        <div class="p-6 flex items-center gap-4 border-b border-gray-100 dark:border-gray-800/60 bg-gray-50/50 dark:bg-gray-800/20">
          <UAvatar 
            :src="team.logo || 'https://avatars.githubusercontent.com/u/739984?v=4'" 
            :alt="team.name"
            size="xl" 
            class="ring-2 ring-white dark:ring-[#1e293b] shadow-sm bg-white"
            :ui="{ rounded: 'rounded-full' }"
          />
          <div class="flex flex-col">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{{ team.name }}</h3>
            <div v-if="team.notes" class="flex items-center gap-1.5 mt-1 opacity-75">
              <UIcon name="i-lucide-trophy" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <span class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate max-w-[200px]" :title="team.notes">
                {{ team.notes }}
              </span>
            </div>
          </div>
        </div>

        <div class="p-6 flex-1 flex flex-col gap-4"> <div 
            v-for="player in team.players" 
            :key="player.name"
            class="flex items-center gap-4 group" >
            <span 
              class="w-14 text-center text-xs font-black tracking-widest uppercase py-1.5 rounded-md shadow-sm"
              :class="roleColor[player.role] || roleColor.Substitute"
            >
              {{ roleDisplay[player.role] || player.role }}
            </span>
            
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <UAvatar :src="player.avatar" :alt="player.name" size="sm" />
              <span class="text-base font-semibold text-gray-700 dark:text-gray-200 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {{ player.name }}
              </span>
            </div>
          </div>

          <div v-if="team.players.length === 0" class="text-sm text-center text-gray-400 py-4 italic">
            尚未登錄選手
          </div>
        </div>
      </div>

    </div>
  </section>
</template>