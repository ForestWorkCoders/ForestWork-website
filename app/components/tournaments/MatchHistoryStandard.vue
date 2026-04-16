<script setup>
// 定義接收外部傳入的賽事 ID
const props = defineProps({
    tournamentId: {
        type: String,
        required: true
    }
})

// 呼叫 API 取得對局紀錄資料
const { data: matchHistory, pending: matchesPending } = await useFetch(`/api/mahjong/tournaments/${props.tournamentId}/matches`)
</script>

<template>
    <section>
        <div class="mb-6 border-b border-gray-200 dark:border-gray-800 pb-4">
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white tracking-wide">
                對局紀錄 <span class="text-gray-400 dark:text-gray-500 font-normal text-lg ml-2">Match Details</span>
            </h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

            <div v-if="matchesPending" class="col-span-full py-12 flex justify-center text-gray-500">
                <UIcon name="i-lucide-refresh-cw" class="animate-spin w-8 h-8" />
            </div>

            <div v-else-if="!matchHistory || matchHistory.length === 0"
                class="col-span-full py-12 text-center text-gray-500 bg-gray-50 dark:bg-gray-800/20 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                目前尚無對局紀錄
            </div>

            <div v-else v-for="match in matchHistory" :key="match.id"
                class="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col">
                <div
                    class="px-5 py-3 border-b border-gray-100 dark:border-gray-700/50 flex justify-between items-center bg-gray-50/80 dark:bg-[#18212f]">
                    <span
                        class="font-black tracking-widest text-sm text-blue-600 dark:text-blue-400 group-hover:text-blue-500 dark:group-hover:text-blue-300 transition-colors">
                        {{ match.round }}
                    </span>
                    <NuxtLink :to="match.paipu_url" target="_blank"
                        class="flex items-center gap-2 group cursor-pointer">
                        <span
                            class="text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded group-hover:bg-gray-300 dark:group-hover:bg-gray-700 transition-colors">
                            雀魂牌譜
                        </span>
                    </NuxtLink>
                    <span class="text-xs text-gray-500 dark:text-gray-400 font-mono">{{ match.time }}</span>
                </div>

                <div class="p-0 flex-1 bg-white dark:bg-[#1e293b]">
                    <table class="w-full text-sm text-left">
                        <thead
                            class="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                            <tr>
                                <th class="px-4 py-3 font-medium w-12">起莊</th>
                                <th class="px-4 py-3 font-medium">玩家</th>
                                <th class="px-4 py-3 font-medium text-right">得分</th>
                                <th class="px-4 py-3 font-medium text-right">積分</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-50 dark:divide-gray-800/50">
                            <tr v-for="p in match.players" :key="p.seat"
                                class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">

                                <td class="px-4 py-3 font-bold transition-colors" :class="{
                                    'text-amber-500 dark:text-amber-400 drop-shadow-sm': p.score === Math.max(...match.players.map(x => x.score)),
                                    'text-gray-400 dark:text-gray-500': p.score !== Math.max(...match.players.map(x => x.score))
                                }">
                                    {{ p.seat }}
                                </td>

                                <td class="px-4 py-3 font-medium text-gray-900 dark:text-gray-200">{{ p.name }}</td>
                                <td
                                    class="px-4 py-3 text-right font-mono tracking-wide text-gray-800 dark:text-gray-300">
                                    {{ p.score.toLocaleString() }}</td>

                                <td class="px-4 py-3 text-right font-mono font-bold"
                                    :class="p.pts > 0 ? 'text-emerald-600 dark:text-emerald-400' : p.pts < 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'">
                                    {{ p.pts > 0 ? '+' : '' }}{{ p.pts }}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </section>
</template>