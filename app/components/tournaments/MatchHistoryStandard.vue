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

            <template v-else>
                <TournamentsMatchCard v-for="match in matchHistory" :key="match.id" :match="match" />
            </template>

            
        </div>
    </section>
</template>