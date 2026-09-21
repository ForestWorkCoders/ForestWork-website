// server/discord/utils.ts
export function getInteractionOption<T = any>(interaction: any, name: string): T | undefined {
  const options = interaction.data?.options
  if (!Array.isArray(options)) return undefined
  const target = options.find((opt: any) => opt.name === name)
  return target ? (target.value as T) : undefined
}

/**
 * 健壮的候选项切分器：
 * 1. 优先支持中英文逗号、分号或换行分隔（项内部空格天然保留）
 * 2. 次选支持引号包裹语法："Chili Crab" "Fried Rice" Pizza
 */
export function tokenizeChoices(input: string): string[] {
  const text = input.trim()
  if (!text) return []

  // 场景 A: 存在显式分隔符 (英文逗号, 中文逗号, 分号, 换行)
  if (/[,，;\n]/.test(text)) {
    return text
      .split(/[,，;\n]+/)
      .map(item => item.trim().replace(/^["']|["']$/g, '')) // 清除可能残留的引号
      .filter(item => item.length > 0)
  }

  // 场景 B: 靠空格隔开，但部分项被单/双引号包裹
  // 匹配: "带空格的内容" 或 '带空格的内容' 或 普通不带空格的连续字符
  const regex = /"([^"]+)"|'([^']+)'|(\S+)/g
  const matches: string[] = []
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    // match[1] 是双引号捕获组, match[2] 是单引号捕获组, match[3] 是裸词
    const item = (match[1] || match[2] || match[3] || '').trim()
    if (item) {
      matches.push(item)
    }
  }

  return matches
}