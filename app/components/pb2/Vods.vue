<script setup>
const props = defineProps({
  tournamentId: {
    type: String,
    required: true
  }
})

// ==========================================
// ★ 影音專區 (VODs) 假資料 ★
// 未來可透過 API 取得：await useFetch(`/api/mahjong/tournaments/${props.tournamentId}/vods`)
// ==========================================

const mockStreams = [
  { id: 's1', title: '【G1A組】第一回合 轉播台', platform: 'twitch', viewers: '1.2K', url: '#', thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=600&h=338' },
  { id: 's2', title: '【G1B組】第一回合 選手第一視角', platform: 'youtube', viewers: '850', url: '#', thumbnail: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=600&h=338' }
]

const mockArchives = [
  { id: 'a1', title: '【A組決賽】逆轉神局！最後的役滿', duration: '01:45:20', date: '2023-10-15', url: '#', thumbnail: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&q=80&w=600&h=338' },
  { id: 'a2', title: '【B組敗部復活】生死一瞬的防守', duration: '02:10:05', date: '2023-10-14', url: '#', thumbnail: 'https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?auto=format&fit=crop&q=80&w=600&h=338' },
  { id: 'a3', title: '【C組小組賽】全紀錄', duration: '03:22:11', date: '2023-10-13', url: '#', thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=600&h=338' },
  { id: 'a4', title: '【D組小組賽】全紀錄', duration: '03:15:40', date: '2023-10-12', url: '#', thumbnail: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=600&h=338' }
]

const mockMontages = [
  { id: 'm1', title: '一發自摸！不可思議的聽牌', views: '15K', url: '#', thumbnail: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=300&h=533' },
  { id: 'm2', title: '10秒看完三倍滿炸裂瞬間', views: '22K', url: '#', thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=300&h=533' },
  { id: 'm3', title: '極限防守，海底撈月防禦術', views: '8.5K', url: '#', thumbnail: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&q=80&w=300&h=533' },
  { id: 'm4', title: '最速和牌傳說', views: '30K', url: '#', thumbnail: 'https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?auto=format&fit=crop&q=80&w=300&h=533' },
  { id: 'm5', title: '神仙打架，四家立直', views: '12K', url: '#', thumbnail: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=300&h=533' }
]
</script>

<template>
  <div class="px-4 md:px-6 mt-8 space-y-12 animate-fade-in pb-12">

    <section v-if="mockStreams.length > 0">
      <div class="flex items-center justify-between mb-4 border-b border-gray-200 dark:border-gray-800 pb-2">
        <h2 class="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <span class="relative flex h-3 w-3">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          實況轉播 <span class="text-gray-400 dark:text-gray-500 font-normal text-sm ml-1">Live Streams</span>
        </h2>
      </div>
      
      <div class="flex overflow-x-auto gap-5 pb-4 snap-x [&::-webkit-scrollbar]:hidden">
        <a v-for="stream in mockStreams" :key="stream.id" :href="stream.url" target="_blank" class="snap-start shrink-0 w-[300px] md:w-[400px] group flex flex-col gap-3">
          <div class="relative aspect-video rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <img :src="stream.thumbnail" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div class="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              <UIcon name="i-heroicons-play-solid" class="w-12 h-12 text-white opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all drop-shadow-lg" />
            </div>
            <div class="absolute top-3 left-3 px-2 py-1 rounded bg-black/70 backdrop-blur-sm flex items-center gap-1.5 text-xs font-bold text-white">
              <span :class="stream.platform === 'twitch' ? 'text-purple-400' : 'text-red-500'">●</span>
              {{ stream.platform === 'twitch' ? 'Twitch' : 'YouTube' }}
            </div>
            <div class="absolute bottom-3 left-3 px-2 py-1 rounded bg-red-600 text-white text-xs font-bold tracking-wider flex items-center gap-1">
              <UIcon name="i-heroicons-users" class="w-3.5 h-3.5" /> {{ stream.viewers }}
            </div>
          </div>
          <h3 class="font-bold text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-amber-500 transition-colors">{{ stream.title }}</h3>
        </a>
      </div>
    </section>

    <section v-if="mockArchives.length > 0">
      <div class="flex items-center justify-between mb-4 border-b border-gray-200 dark:border-gray-800 pb-2">
        <h2 class="text-xl font-bold text-gray-900 dark:text-white">
          賽事存檔 <span class="text-gray-400 dark:text-gray-500 font-normal text-sm ml-1">Archives</span>
        </h2>
      </div>
      
      <div class="flex overflow-x-auto gap-5 pb-4 snap-x [&::-webkit-scrollbar]:hidden">
        <a v-for="arc in mockArchives" :key="arc.id" :href="arc.url" target="_blank" class="snap-start shrink-0 w-[280px] md:w-[320px] group flex flex-col gap-2">
          <div class="relative aspect-video rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <img :src="arc.thumbnail" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div class="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-white text-[11px] font-mono font-bold tracking-wider">
              {{ arc.duration }}
            </div>
          </div>
          <div class="flex flex-col">
            <h3 class="font-semibold text-sm text-gray-900 dark:text-gray-200 line-clamp-2 group-hover:text-amber-500 transition-colors leading-tight">{{ arc.title }}</h3>
            <span class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ arc.date }}</span>
          </div>
        </a>
      </div>
    </section>

    <section v-if="mockMontages.length > 0">
      <div class="flex items-center justify-between mb-4 border-b border-gray-200 dark:border-gray-800 pb-2">
        <h2 class="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <UIcon name="i-heroicons-bolt-solid" class="w-5 h-5 text-amber-500" />
          精華短片 <span class="text-gray-400 dark:text-gray-500 font-normal text-sm ml-1">Shorts & Highlights</span>
        </h2>
      </div>
      
      <div class="flex overflow-x-auto gap-4 pb-4 snap-x [&::-webkit-scrollbar]:hidden">
        <a v-for="montage in mockMontages" :key="montage.id" :href="montage.url" target="_blank" class="snap-start shrink-0 w-[140px] md:w-[180px] group flex flex-col gap-2">
          <div class="relative aspect-[9/16] rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-sm">
            <img :src="montage.thumbnail" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 group-hover:opacity-100 transition-opacity"></div>
            
            <div class="absolute bottom-3 left-3 right-3 flex justify-between items-end">
              <span class="text-white text-[11px] font-bold tracking-wider flex items-center gap-1">
                <UIcon name="i-heroicons-eye" class="w-3.5 h-3.5" /> {{ montage.views }}
              </span>
              <UIcon name="i-heroicons-play-circle" class="w-6 h-6 text-white/80 group-hover:text-white transition-colors" />
            </div>
          </div>
          <h3 class="font-semibold text-xs md:text-sm text-gray-800 dark:text-gray-300 line-clamp-2 leading-snug group-hover:text-amber-500 transition-colors">{{ montage.title }}</h3>
        </a>
      </div>
    </section>

  </div>
</template>