// Data shape of the tournament VODs tab (<TournamentVods>).
// No API serves it yet; `vodsMock` below is the original placeholder content,
// kept as the design reference for when real VODs are stored. Nothing imports it
// at runtime, but typecheck keeps it in step with these types.

export interface VodStream {
  id: string
  title: string
  platform: 'twitch' | 'youtube'
  viewers: string
  url: string
  thumbnail: string
}

export interface VodArchive {
  id: string
  title: string
  duration: string
  date: string
  url: string
  thumbnail: string
}

export interface VodMontage {
  id: string
  title: string
  views: string
  url: string
  thumbnail: string
}

export interface TournamentVodsData {
  streams: VodStream[]
  archives: VodArchive[]
  montages: VodMontage[]
}

export const vodsMock: TournamentVodsData = {
  streams: [
    { id: 's1', title: '【G1A組】第一回合 轉播台', platform: 'twitch', viewers: '1.2K', url: '#', thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=600&h=338' },
    { id: 's2', title: '【G1B組】第一回合 選手第一視角', platform: 'youtube', viewers: '850', url: '#', thumbnail: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=600&h=338' },
  ],
  archives: [
    { id: 'a1', title: '【A組決賽】逆轉神局！最後的役滿', duration: '01:45:20', date: '2023-10-15', url: '#', thumbnail: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&q=80&w=600&h=338' },
    { id: 'a2', title: '【B組敗部復活】生死一瞬的防守', duration: '02:10:05', date: '2023-10-14', url: '#', thumbnail: 'https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?auto=format&fit=crop&q=80&w=600&h=338' },
    { id: 'a3', title: '【C組小組賽】全紀錄', duration: '03:22:11', date: '2023-10-13', url: '#', thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=600&h=338' },
    { id: 'a4', title: '【D組小組賽】全紀錄', duration: '03:15:40', date: '2023-10-12', url: '#', thumbnail: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=600&h=338' },
  ],
  montages: [
    { id: 'm1', title: '一發自摸！不可思議的聽牌', views: '15K', url: '#', thumbnail: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=300&h=533' },
    { id: 'm2', title: '10秒看完三倍滿炸裂瞬間', views: '22K', url: '#', thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=300&h=533' },
    { id: 'm3', title: '極限防守，海底撈月防禦術', views: '8.5K', url: '#', thumbnail: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&q=80&w=300&h=533' },
    { id: 'm4', title: '最速和牌傳說', views: '30K', url: '#', thumbnail: 'https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?auto=format&fit=crop&q=80&w=300&h=533' },
    { id: 'm5', title: '神仙打架，四家立直', views: '12K', url: '#', thumbnail: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=300&h=533' },
  ],
}
