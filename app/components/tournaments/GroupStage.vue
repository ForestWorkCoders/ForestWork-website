<script setup>
const props = defineProps({
  tournamentId: {
    type: [String, Number],
    required: true
  }
})

// 直接調用聚合 API
const { data, pending, error } = await useFetch(`/api/plazmaburst/tournaments/${props.tournamentId}/group-stage`)
</script>

<template>
  <div v-if="pending" class="flex justify-center py-12">
    <UIcon name="i-lucide-loader-2" class="animate-spin w-8 h-8 text-blue-500" />
  </div>
  <div v-else-if="error" class="text-red-500">加載失敗：{{ error.message }}</div>

  <div v-else-if="data" class="space-y-8 animate-fade-in">
    <section>
      <h3 class="text-xl font-bold mb-4 text-gray-900 dark:text-white">Group Standings</h3>
      <div class="overflow-x-auto [&::-webkit-scrollbar]:hidden">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-800 text-sm text-gray-500">
              <th class="p-3 font-medium">#</th>
              <th class="p-3 font-medium">Team</th>
              <th class="p-3 font-medium">P</th>
              <th class="p-3 font-medium">W</th>
              <th class="p-3 font-medium">D</th>
              <th class="p-3 font-medium">L</th>
              <th class="p-3 font-medium">+/-</th>
              <th class="p-3 font-medium">Pts</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="team in data.standings" :key="team.id"
              class="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              :class="{ 'border-l-4': team.qualified }"
              :style="team.qualified ? { borderLeftColor: team.colour || '#3b82f6' } : {}">
              <td class="p-3">{{ team.rank }}</td>
              <td class="p-3 font-bold">
                <UAvatar :src="team.logo || '/default-team-logo.png'" :alt="team.name" size="sm"
                  class="bg-white ring-1 ring-gray-200 dark:ring-gray-700 shadow-sm flex-shrink-0"
                  :ui="{ rounded: 'rounded-md' }" />
                <span class="mr-2">  </span>{{ team.name }}
              </td>
              <td class="p-3">{{ team.pld }}</td>
              <td class="p-3">{{ team.w }}</td>
              <td class="p-3">{{ team.d }}</td>
              <td class="p-3">{{ team.l }}</td>
              <td class="p-3">{{ team.diff > 0 ? '+' + team.diff : team.diff }}</td>
              <td class="p-3 font-bold text-blue-600 dark:text-blue-400">{{ team.pts }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section>
      <h3 class="text-xl font-bold mb-4 text-gray-900 dark:text-white">Matches</h3>
      <div class="space-y-6">
        <div v-for="round in data.rounds" :key="round.roundName">
          <h4 class="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider">{{ round.roundName }}</h4>
          <ul class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <li v-for="match in round.matches" :key="match.id">
              <NuxtLink :to="`/games/plazmaburst/tournaments/${tournamentId}/matches/${match.id}`"
                class="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-blue-500 transition-colors">
                <span class="truncate font-medium" :style="{ color: match.colorA }">{{ match.teamA }}</span>

                <div
                  class="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded font-mono font-bold text-sm mx-2 whitespace-nowrap">
                  <template v-if="match.status.includes('Walkover')">
                    <span class="text-amber-500">W/O</span>
                  </template>
                  <template v-else-if="match.status === 'Upcoming'">
                    <span class="text-gray-400">VS</span>
                  </template>
                  <template v-else>
                    {{ match.scoreA }} : {{ match.scoreB }}
                  </template>
                </div>

                <span class="truncate font-medium text-right" :style="{ color: match.colorB }">{{ match.teamB }}</span>
              </NuxtLink>
            </li>
          </ul>
        </div>
      </div>
    </section>
  </div>
</template>