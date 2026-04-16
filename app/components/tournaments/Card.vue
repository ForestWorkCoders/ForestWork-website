<script setup>
defineProps({
    tourney: {
        type: Object,
        required: true
    }
})
</script>

<template>
    <div
        class="flex items-center justify-between p-4 bg-white/90 hover:bg-gray-50 dark:bg-[#0f172a]/80 dark:hover:bg-[#1e293b]/90 border border-gray-200 dark:border-slate-800 rounded-lg transition-all shadow-sm hover:shadow-md dark:shadow-none">

        <div class="flex items-center gap-4">
            <UAvatar :src="tourney.icon" :alt="tourney.title" size="lg" :ui="{
                rounded: 'rounded-md',
                fallback: {
                    text: 'font-bold text-gray-500 dark:text-gray-400'
                }
            }" />

            <div>
                <h3 class="font-bold text-lg text-gray-900 dark:text-white transition-colors">
                    {{ tourney.title }}
                </h3>

                <div class="flex gap-4 text-xs text-gray-500 dark:text-gray-400 mt-1 transition-colors">
                    <span class="flex items-center gap-1">
                        <UIcon name="i-lucide-chart-column-increasing" /> {{ tourney.tier }}
                    </span>
                    <span class="flex items-center gap-1">
                        <UIcon name="i-lucide-globe" /> {{ tourney.region }}
                    </span>
                    <span class="flex items-center gap-1">
                        <UIcon name="i-lucide-calendar" /> {{ tourney.start_date }} - {{ tourney.end_date }}
                    </span>
                </div>
            </div>
        </div>

        <UButton color="gray" variant="ghost" trailing-icon="i-lucide-chevron-right"
            class="font-bold text-xs tracking-widest text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
            :to="`/tournaments/${tourney.id}`">
            DETAILS
        </UButton>
    </div>
</template>