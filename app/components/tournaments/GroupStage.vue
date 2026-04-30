<script setup>
const props = defineProps({
  tournamentId: {
    type: [String, Number],
    required: true
  }
})

// Mock 数据暂时放在这里...
// 极简且清晰的数据结构
const mockStandings = [
  { id: 1, rank: 1, name: "Team Alpha", pld: 5, w: 4, d: 0, l: 1, pts: 12, diff: "+15", qualified: true },
  { id: 2, rank: 2, name: "Team Beta",  pld: 5, w: 3, d: 1, l: 1, pts: 10, diff: "+5", qualified: true },
  { id: 3, rank: 3, name: "Team Gamma", pld: 5, w: 1, d: 1, l: 3, pts: 4,  diff: "-8", qualified: false }
];

const mockRounds = [
  {
    roundName: "Week 1",
    matches: [
      { id: 101, teamA: "Team Alpha", teamB: "Team Beta", scoreA: 2, scoreB: 1, status: "completed" },
      { id: 102, teamA: "Team Gamma", teamB: "Team Delta", scoreA: 0, scoreB: 0, status: "upcoming" }
    ]
  }
];
</script>



<template>
  <div class="space-y-8">
    
    <section>
      <h3 class="text-xl font-bold mb-4 text-gray-900 dark:text-white">Group Standings</h3>
      <div class="overflow-x-auto [&::-webkit-scrollbar]:hidden">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-800 text-sm text-gray-500">
              <th class="p-3 font-medium">#</th>
              <th class="p-3 font-medium">Team</th>
              <th class="p-3 font-medium">Pld</th>
              <th class="p-3 font-medium">W-D-L</th>
              <th class="p-3 font-medium">+/-</th>
              <th class="p-3 font-medium">Pts</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="team in mockStandings" 
              :key="team.id"
              class="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              :class="{'border-l-4 border-l-emerald-500': team.qualified}" 
            >
              <td class="p-3">{{ team.rank }}</td>
              <td class="p-3 font-bold">{{ team.name }}</td>
              <td class="p-3">{{ team.pld }}</td>
              <td class="p-3">{{ team.w }}-{{ team.d }}-{{ team.l }}</td>
              <td class="p-3">{{ team.diff }}</td>
              <td class="p-3 font-bold text-blue-600 dark:text-blue-400">{{ team.pts }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section>
      <h3 class="text-xl font-bold mb-4 text-gray-900 dark:text-white">Matches</h3>
      <div class="space-y-6">
        <div v-for="round in mockRounds" :key="round.roundName">
          <h4 class="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider">{{ round.roundName }}</h4>
          <ul class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <li v-for="match in round.matches" :key="match.id">
              <NuxtLink 
                :to="`/games/pb2/tournaments/${tournamentId}/matches/${match.id}`"
                class="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
              >
                <span class="truncate font-medium">{{ match.teamA }}</span>
                
                <div class="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded font-mono font-bold text-sm mx-2 whitespace-nowrap">
                  <template v-if="match.status === 'completed'">
                    {{ match.scoreA }} : {{ match.scoreB }}
                  </template>
                  <template v-else>
                    VS
                  </template>
                </div>
                
                <span class="truncate font-medium text-right">{{ match.teamB }}</span>
              </NuxtLink>
            </li>
          </ul>
        </div>
      </div>
    </section>

  </div>
</template>