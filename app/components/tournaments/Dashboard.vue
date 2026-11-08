<script setup>
const props = defineProps({
  tournamentId: { type: String, required: true }
})

// 假设你的新 API 返回如下结构：
// {
//   config: { entity_type: 'player', columns: [...], phases: [{ id: 'A', ... }] },
//   data: { 
//     "A": { leaderboard: [...], matches: [...] },
//     "F": { leaderboard: [...], matches: [...] }
//   }
// }
const { data: dashboardData, pending, error } = await useFetch(`/api/mahjong/tournaments/${props.tournamentId}/matches`)
</script>

<template>
  <div class="space-y-16">
    <div v-if="pending" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="animate-spin w-8 h-8" />
    </div>
    
    <div v-else-if="error" class="text-red-500 text-center font-bold">
      載入失敗: {{ error.message }}
    </div>

    <template v-else-if="dashboardData" v-for="phase in dashboardData.config.phases" :key="phase.id">
      <section class="space-y-6 animate-fade-in">
        
        <div class="border-b border-gray-200 dark:border-gray-800 pb-4 flex items-center justify-between">
          <h2 class="text-3xl font-black tracking-tight flex items-center gap-3">
            <UIcon :name="phase.is_final ? 'i-heroicons-trophy' : 'i-heroicons-flag'" 
                   :class="phase.is_final ? 'text-yellow-500' : 'text-emerald-500'" />
            <span :class="phase.is_final ? 'text-yellow-500' : 'text-emerald-500'">
              {{ phase.title }}
            </span>
            <span class="text-gray-400 font-normal text-xl tracking-wider">
              {{ phase.subtitle }}
            </span>
          </h2>
        </div>

        <TournamentsBaseLeaderboardTable
          :entity-type="dashboardData.config.entity_type" 
          :columns="dashboardData.config.columns"
          :data="dashboardData.data[phase.id]?.leaderboard || []"
          :is-final="phase.is_final"
          :promoted-ranks="phase.promoted_ranks"
          :disqualified-ranks="phase.disqualified_ranks"
        />

        <div class="mt-4 p-6 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center">
            <span class="text-sm font-medium tracking-wide">備註保留區塊</span>
        </div>

        <TournamentsBaseMatchGrid 
          :matches="dashboardData.data[phase.id]?.matches || []"
        />

      </section>
    </template>
  </div>
</template>