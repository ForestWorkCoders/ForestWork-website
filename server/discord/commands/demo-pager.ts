// server/discord/commands/demo-pager.ts
import type { H3Event } from 'h3'

// 静态页面数据清单
const PAGES = [
  {
    title: '📄 林間小鎮簡介 (Page 1/3)',
    description: '歡迎來到林間小鎮 ForestWork！\n這裡是社群歷史與核心活動的大廳。',
    color: 0x4C7766,
    fields: [
      { name: '成立年份', value: '2019', inline: true },
      { name: '常駐遊戲', value: '雀魂 / PB2 / Minecraft', inline: true }
    ]
  },
  {
    title: '🏆 賽事榮譽殿堂 (Page 2/3)',
    description: '歷屆重大賽事與冠亞軍精華記錄。',
    color: 0x3B82F6,
    fields: [
      { name: '數番盃 (2022)', value: '冠軍: 隊伍 Alpha', inline: true },
      { name: '役滿盃 (2023)', value: '冠軍: 隊伍 Omega', inline: true }
    ]
  },
  {
    title: '📜 伺服器規章與資源 (Page 3/3)',
    description: '請共同維護社群良好氛圍與比賽秩序。',
    color: 0xEAB308,
    fields: [
      { name: '禁止事項', value: '嚴禁作弊、窺屏與惡意拔線。', inline: false },
      { name: '官方網站', value: 'https://forestwork.vercel.app', inline: false }
    ]
  }
]

// 确定性兜底节点：杜绝任何 undefined 穿透
const DEFAULT_PAGE = PAGES[0]!

/**
 * 纯函数：根据当前页码构造 Discord Embed + 按钮组件
 * 彻底消灭 pageData 可能为 undefined 的编译器红线
 */
export function buildPagerResponse(pageIndex: number) {
  const totalPages = PAGES.length
  const page = Math.min(totalPages, Math.max(1, pageIndex))

  // 好品味：优先取目标项，若遇异常（如越界）平滑退化至默认页，类型严格收窄为 PageObject
  const pageData = PAGES[page - 1] ?? DEFAULT_PAGE

  const prevTarget = page - 1
  const nextTarget = page + 1

  return {
    embeds: [
      {
        title: pageData.title,
        description: pageData.description,
        color: pageData.color,
        fields: pageData.fields,
        footer: {
          text: `第 ${page} 頁 · 共 ${totalPages} 頁`
        }
      }
    ],
    components: [
      {
        type: 1, // ACTION_ROW
        components: [
          {
            type: 2, // BUTTON
            style: 2, // SECONDARY
            label: '◀ 上一頁',
            custom_id: `pager:nav:${prevTarget}`,
            disabled: page <= 1
          },
          {
            type: 2,
            style: 2,
            label: '▶ 下一頁',
            custom_id: `pager:nav:${nextTarget}`,
            disabled: page >= totalPages
          }
        ]
      }
    ]
  }
}

export async function handleDemoPager(interaction: any, event: H3Event) {
  return {
    type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
    data: buildPagerResponse(1)
  }
}