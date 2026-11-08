<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  tournamentId: {
    type: [String, Number],
    required: true
  }
})

const { data: teams, pending } = await useFetch(`/api/plazmaburst/tournaments/${props.tournamentId}/teams`)

// 1. 狀態管理：記錄哪些隊伍被展開 (儲存 team.id)
const expandedTeams = ref(new Set())

const toggleTeam = (teamId) => {
  if (expandedTeams.value.has(teamId)) {
    expandedTeams.value.delete(teamId)
  } else {
    expandedTeams.value.add(teamId)
  }
}

// 2. 狀態管理：記錄每支隊伍當前的 Tab 狀態 (儲存 teamId -> 'main' | 'sub' | 'history')
const teamTabs = ref({}) 

const getActiveTab = (teamId) => teamTabs.value[teamId] || 'main'
const setActiveTab = (teamId, tab) => { teamTabs.value[teamId] = tab }

// 3. 核心過濾邏輯：Dumb UI 的大腦
const getFilteredPlayers = (team) => {
  const tab = getActiveTab(team.id)
  if (!team.players) return []

  if (tab === 'main') {
    return team.players.filter(p => p.status === 'active' && ['manager', 'player'].includes(p.role))
  }
  if (tab === 'sub') {
    return team.players.filter(p => p.status === 'active' && p.role === 'substitute')
  }
  if (tab === 'history') {
    return team.players.filter(p => p.status !== 'active')
  }
  return []
}

// 職位顏色 (保持不變)
const roleDisplay = { manager: 'manager', player: 'player', substitute: 'substitute' }
const roleColor = {
  manager: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
  player: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  substitute: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
}
</script>

<template>
  <section class="animate-fade-in">
    <div v-if="pending" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-blue-500" />
    </div>

    <div v-else-if="!teams || teams.length === 0" class="text-center py-16 bg-white dark:bg-[#1a1c23] rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
      <p class="text-gray-500 dark:text-gray-400 text-sm mt-1">Teams are yet to be announced.</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
      
      <div 
        v-for="team in teams" 
        :key="team.id"
        class="bg-white dark:bg-[#1a1c23] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden"
      >
        <button 
          @click="toggleTeam(team.id)"
          class="w-full text-left p-4 md:p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors relative"
          :style="{ borderLeft: `4px solid ${team.colour || '#3b82f6'}` }"
        >
          <div class="flex items-center gap-4">
            <div class="absolute top-0 right-0 w-32 h-32 opacity-10 blur-2xl rounded-full"
                        :style="{ backgroundColor: team.colour || 'transparent' }"></div>
            <UAvatar :src="team.logo || '/default-team-logo.png'" size="lg" class="bg-white" :ui="{ rounded: 'rounded-lg' }" />
            <div class="flex flex-col">
              <h3 class="text-lg md:text-xl font-black text-gray-900 dark:text-white flex items-baseline gap-2">
                <span v-if="team.short_sign" class="text-sm font-bold opacity-70" :style="{ color: team.colour }">[{{ team.short_sign }}]</span>
                {{ team.name }}
              </h3>
            </div>
          </div>
          
          <div class="p-2 text-gray-400 flex-shrink-0">
            <UIcon 
              name="i-lucide-chevron-down" 
              class="w-6 h-6 transition-transform duration-300"
              :class="{ 'rotate-180': expandedTeams.has(team.id) }" 
            />
          </div>
        </button>

        <div 
          v-show="expandedTeams.has(team.id)" 
          class="border-t border-gray-100 dark:border-gray-800/60 bg-gray-50/30 dark:bg-black/10"
        >
          <div class="p-4 border-b border-gray-100 dark:border-gray-800/60 flex justify-center">
            <div class="inline-flex bg-gray-200/50 dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-bold">
              <button @click="setActiveTab(team.id, 'main')" :class="['px-4 py-1.5 rounded-md transition-all', getActiveTab(team.id) === 'main' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white']">Main</button>
              <button @click="setActiveTab(team.id, 'sub')" :class="['px-4 py-1.5 rounded-md transition-all', getActiveTab(team.id) === 'sub' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white']">Sub</button>
              <button @click="setActiveTab(team.id, 'history')" :class="['px-4 py-1.5 rounded-md transition-all', getActiveTab(team.id) === 'history' ? 'bg-white dark:bg-gray-700 text-red-500 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white']">History</button>
            </div>
          </div>

          <div class="p-6 flex flex-col gap-3">
            <div 
              v-for="player in getFilteredPlayers(team)" 
              :key="player.id || player.name"
              class="flex items-center gap-4 hover:bg-white dark:hover:bg-gray-800/80 p-2 -mx-2 rounded-lg transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700" 
            >
              <span 
                v-if="player.status !== 'active'" 
                class="w-16 text-center text-[10px] font-black tracking-widest uppercase py-1.5 rounded shadow-sm bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              >
                {{ player.status }}
              </span>
              <span 
                v-else
                class="w-16 text-center text-[10px] font-black tracking-widest uppercase py-1.5 rounded shadow-sm"
                :class="roleColor[player.role] || roleColor.substitute"
              >
                {{ roleDisplay[player.role] || player.role }}
              </span>
              
              <div class="flex items-center gap-3 flex-1 min-w-0">
                <UAvatar :src="player.avatar || '/images/404/default-avatar.png'" :alt="player.name" size="sm" />
                <span class="text-sm font-bold text-gray-700 dark:text-gray-200 truncate" :class="{'line-through opacity-50': player.status !== 'active'}">
                  {{ player.name }}
                </span>
              </div>
            </div>

            <div v-if="getFilteredPlayers(team).length === 0" class="text-sm text-center text-gray-400 py-6 italic">
              無符合條件的選手 (No players found)
            </div>
          </div>
        </div>

      </div>
    </div>
  </section>
</template>