import { h } from 'vue'

export interface ColumnConfig {
  id?: string
  accessorKey: string
  header: string
  sortable?: boolean
  size?: number
  class?: string
  sortingFn?: any
  [key: string]: any
}

/**
 * 原生 SVG 排序图标渲染器 (精准渲染 arrow-up-narrow-wide 与 arrow-down-wide-narrow)
 */
function renderSortIcon(isSorted: boolean, isDesc: boolean) {
  // 1. 已激活排序状态
  if (isSorted) {
    return h('svg', {
      xmlns: 'http://www.w3.org/2000/svg',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      class: 'shrink-0 w-4 h-4 text-emerald-500 font-bold select-none'
    }, isDesc ? [
      // 降序：arrow-down-wide-narrow 原生路径
      h('path', { d: 'm3 16 4 4 4-4' }),
      h('path', { d: 'M7 20V4' }),
      h('path', { d: 'M11 4h10' }),
      h('path', { d: 'M11 8h7' }),
      h('path', { d: 'M11 12h4' })
    ] : [
      // 升序：arrow-up-narrow-wide 原生路径
      h('path', { d: 'm3 8 4-4 4 4' }),
      h('path', { d: 'M7 4v16' }),
      h('path', { d: 'M11 12h4' }),
      h('path', { d: 'M11 16h7' }),
      h('path', { d: 'M11 20h10' })
    ])
  }

  // 2. 未排序状态：双向微箭头 (常态透明，hover 时浮现)
  return h('svg', {
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    class: 'shrink-0 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity select-none'
  }, [
    h('path', { d: 'm7 15 5 5 5-5' }),
    h('path', { d: 'm7 9 5-5 5 5' })
  ])
}

/**
 * 统一表头排序契约生成器
 */
export function createSortableColumns(columns: ColumnConfig[]) {
  return columns.map(col => {
    const isCenter = col.class?.includes('text-center')
    const isRight = col.class?.includes('text-right')

    return {
      ...col,
      id: col.id || col.accessorKey,
      accessorKey: col.accessorKey,

      header: col.sortable === false ? col.header : ({ column }: any) => {
        const sorted = column.getIsSorted()
        const isSorted = Boolean(sorted)
        const isDesc = sorted === 'desc'

        return h('button', {
          type: 'button',
          class: [
            'flex items-center gap-1.5 focus:outline-none group select-none cursor-pointer py-1 px-0.5 rounded transition-colors whitespace-nowrap flex-nowrap',
            isCenter ? 'justify-center w-full' : isRight ? 'justify-end w-full' : 'justify-start'
          ].join(' '),
          onClick: () => column.toggleSorting(sorted === 'asc')
        }, [
          h('span', {
            class: [
              'font-bold tracking-wider whitespace-nowrap transition-colors select-none',
              isSorted
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white'
            ].join(' ')
          }, col.header),

          renderSortIcon(isSorted, isDesc)
        ])
      }
    }
  })
}