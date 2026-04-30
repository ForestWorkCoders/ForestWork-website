<script setup>
const props = defineProps({
    tournamentId: {
        type: [String, Number],
        required: true
    }
})

// 1. API 路由替換為 PB2 專屬
const { data: teams, pending } = await useFetch(`/api/plazmaburst/tournaments/${props.tournamentId}/teams`)

// 2. 徹底移除日麻職位，替換為標準電競 FPS 職位[cite: 2]
const roleDisplay = {
    Captain: '隊長',
    Player: '隊員',
    Substitute: '替補'
}

// 3. 職位顏色重構：隊長給予醒目的琥珀色，一般隊員用冷峻的藍色，替補用灰色
const roleColor = {
    Captain: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
    Player: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    Substitute: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
}
</script>

<template>
    <section class="animate-fade-in">
        <!-- 載入中狀態 (保持極簡)[cite: 2] -->
        <div v-if="pending" class="flex justify-center py-12">
            <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-blue-500" />
        </div>

        <!-- 空狀態[cite: 2] -->
        <div v-else-if="!teams || teams.length === 0"
            class="text-center py-16 bg-white dark:bg-[#1a1c23] rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
            <UIcon name="i-lucide-shield-question" class="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <h3 class="text-lg font-bold text-gray-900 dark:text-white">參賽隊伍尚未公佈</h3>
            <p class="text-gray-500 dark:text-gray-400 text-sm mt-1">Teams are yet to be announced.</p>
        </div>

        <!-- 隊伍網格[cite: 2] -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            <div v-for="team in teams" :key="team.id"
                class="bg-white dark:bg-[#1a1c23] rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col border-x border-b border-gray-200 dark:border-gray-800 group"
                :style="{ borderTop: `4px solid ${team.colour || '#3b82f6'}` }">
                <!-- 注意上面的 inline-style：這就是 team.colour 的終極用法，直接作為戰隊主題色注入 -->

                <!-- 卡片頭部 -->
                <div
                    class="p-6 flex items-center gap-4 border-b border-gray-100 dark:border-gray-800/60 bg-gray-50/50 dark:bg-gradient-to-b dark:from-white/5 dark:to-transparent relative overflow-hidden">

                    <!-- 背景裝飾：用隊伍顏色做一個極弱的漸層光暈 -->
                    <div class="absolute top-0 right-0 w-32 h-32 opacity-10 blur-2xl rounded-full"
                        :style="{ backgroundColor: team.colour || 'transparent' }"></div>

                    <UAvatar :src="team.logo || '/default-team-logo.png'" :alt="team.name" size="xl"
                        class="ring-2 ring-gray-100 dark:ring-gray-800 shadow-sm bg-white relative z-10"
                        :ui="{ rounded: 'rounded-lg' }" />
                    <!-- 提醒：電競隊標通常是方形或圓角矩形，我把雀魂的 rounded-full 改成了 rounded-lg[cite: 2] -->

                    <div class="flex flex-col relative z-10">
                        <h3
                            class="text-xl font-black text-gray-900 dark:text-white tracking-tight flex items-baseline gap-2">
                            <!-- 加入 short_sign 的展示 -->
                            {{ team.name }}
                            <span v-if="team.short_sign" class="text-sm font-bold opacity-70"
                                :style="{ color: team.colour }">[{{ team.short_sign }}]</span>
                        </h3>
                        <div v-if="team.notes" class="flex items-center gap-1.5 mt-1 opacity-75">
                            <UIcon name="i-lucide-info" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
                            <span class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate max-w-[200px]"
                                :title="team.notes">
                                {{ team.notes }}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- 選手列表[cite: 2] -->
                <div class="p-6 flex-1 flex flex-col gap-4">
                    <div v-for="player in team.players" :key="player.id || player.name"
                        class="flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 p-2 -mx-2 rounded-lg transition-colors">
                        <!-- 職位標籤 -->
                        <span
                            class="w-16 text-center text-[10px] font-black tracking-widest uppercase py-1.5 rounded shadow-sm"
                            :class="roleColor[player.role] || roleColor.Substitute">
                            {{ roleDisplay[player.role] || player.role }}
                        </span>

                        <div class="flex items-center gap-3 flex-1 min-w-0">
                            <UAvatar :src="player.avatar || '/default-avatar.png'" :alt="player.name" size="sm" />
                            <!-- 名字懸停時高亮，不再是雀魂的 emerald，而是符合 PB2 的藍色[cite: 2] -->
                            <span
                                class="text-sm font-bold text-gray-700 dark:text-gray-200 truncate group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                                {{ player.name }}
                            </span>
                        </div>
                    </div>

                    <div v-if="!team.players || team.players.length === 0"
                        class="text-sm text-center text-gray-400 py-4 italic">
                        尚未登錄選手
                    </div>
                </div>
            </div>

        </div>
    </section>
</template>