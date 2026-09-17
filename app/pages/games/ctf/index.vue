<script setup lang="ts">
import { ref, reactive, computed, nextTick, onMounted } from 'vue'

// 1. 核心数据结构：虚拟文件系统（VFS 树形结构）
interface VFSNode {
    type: 'dir' | 'file'
    content?: string       // 文本题面或内容
    isBinary?: boolean     // 是否为隐写原图/二进制
    artifactUrl?: string  // 图片或附件下载/预览直链
    flag?: string          // 模拟 Flag（仅供前端验证，未来切到后端 Hash）
    children?: Record<string, VFSNode>
}

// ==========================================
// 1. 历史命令栈状态（Command History Buffer）
// ==========================================
const commandHistory = ref<string[]>([])
const historyIdx = ref(-1)
const inputDraft = ref('')

const isMobileDevice = ref(false)
const showMobileWarning = ref(false)

function handleHistoryUp() {
    if (commandHistory.value.length === 0) return

    if (historyIdx.value === -1) {
        inputDraft.value = inputCmd.value
        historyIdx.value = commandHistory.value.length - 1
    } else if (historyIdx.value > 0) {
        historyIdx.value--
    }

    // 好品味：提取局部常量并通过卫语句收窄，消灭 undefined 越界隐患
    const targetCmd = commandHistory.value[historyIdx.value]
    if (targetCmd !== undefined) {
        inputCmd.value = targetCmd
    }
}

function handleHistoryDown() {
    if (historyIdx.value === -1) return

    if (historyIdx.value < commandHistory.value.length - 1) {
        historyIdx.value++
        const targetCmd = commandHistory.value[historyIdx.value]
        if (targetCmd !== undefined) {
            inputCmd.value = targetCmd
        }
    } else {
        // 到底归位
        historyIdx.value = -1
        inputCmd.value = inputDraft.value
    }
}

async function showScoreboard() {
    appendHistory('[GLOBAL OPERATOR STANDINGS // DECAY_ACTIVE]', 'system')
    try {
        const entries = await $fetch<ScoreboardEntry[]>('/api/ctf/leaderboard')
        appendHistory(formatScoreboard(entries), 'output')
    } catch (err: any) {
        appendHistory(`Failed to fetch standings: ${err.message}`, 'error')
    }
}

// ==========================================
// 2. 工业级 Tab 自动补全引擎 (POSIX 行为对齐)
// ==========================================

// 辅助纯函数：计算多个字符串的最长公共前缀 (LCP)
function getLongestCommonPrefix(words: string[]): string {
  if (words.length === 0) return ''
  const first = words[0] || ''
  let prefix = ''
  for (let i = 0; i < first.length; i++) {
    const char = first[i]
    if (words.every(w => w[i] === char)) {
      prefix += char
    } else {
      break
    }
  }
  return prefix
}

function handleTabComplete(e: KeyboardEvent) {
  e.preventDefault()

  const rawCmd = inputCmd.value
  // 如果输入全为空白，直接忽略
  if (!rawCmd.trim() && !rawCmd.endsWith(' ')) {
    return
  }

  const endsWithSpace = rawCmd.endsWith(' ')
  const tokens = rawCmd.trim().split(/\s+/)

  // ----------------------------------------------------
  // 场景 A: 补全主命令 (只有一个 token 且未按空格)
  // ----------------------------------------------------
  if (tokens.length === 1 && !endsWithSpace) {
    const prefix = tokens[0] || ''
    const commandList = Object.keys(commands)
    const matches = commandList.filter(cmd => cmd.startsWith(prefix))

    if (matches.length === 1) {
      const match = matches[0]
      if (match) {
        inputCmd.value = `${match} `
      }
    } else if (matches.length > 1) {
      const lcp = getLongestCommonPrefix(matches)
      if (lcp.length > prefix.length) {
        inputCmd.value = lcp
      } else {
        // 打印所有匹配命令候选
        appendHistory(`guest@forestwork:${currentPathStr.value}$ ${rawCmd}`, 'input')
        appendHistory(matches.sort().join('  '), 'output')
      }
    }
    return
  }

  // ----------------------------------------------------
  // 场景 B: 补全路径参数 (后续参数)
  // ----------------------------------------------------
  // 获取当前正在输入的最后一个参数片段
  const currentToken = endsWithSpace ? '' : (tokens[tokens.length - 1] || '')
  
  // 将路径解构为：父级目录路径 (dirPart) 与 文件名前缀 (filePrefix)
  const lastSlashIndex = currentToken.lastIndexOf('/')
  let dirPart = ''
  let filePrefix = currentToken

  if (lastSlashIndex !== -1) {
    dirPart = currentToken.slice(0, lastSlashIndex + 1) // 保留末尾的 /
    filePrefix = currentToken.slice(lastSlashIndex + 1)
  }

  // 寻址父级节点：如果 dirPart 为空则在当前目录找，否则去对应目录找
  const parentNode = dirPart ? resolvePath(dirPart) : getCurrentNode()

  if (!parentNode || parentNode.type !== 'dir' || !parentNode.children) {
    return
  }

  // 提取子项并应用智能隐藏文件过滤
  let entries = Object.keys(parentNode.children)

  // 核心好品味：如果用户没显式敲 '.'，不主动提示隐藏文件
  if (!filePrefix.startsWith('.')) {
    entries = entries.filter(name => !name.startsWith('.'))
  }

  const matches = entries.filter(name => name.startsWith(filePrefix))

  // 0 个匹配直接忽略
  if (matches.length === 0) {
    return
  }

  // 计算替换基准：当前命令除最后一个 token 外的前缀字符串
  const baseCmd = endsWithSpace 
    ? rawCmd 
    : rawCmd.slice(0, rawCmd.length - currentToken.length)

  // 单一匹配：直接推送到终点
  if (matches.length === 1) {
    const match = matches[0]
    if (!match) return

    const childNode = parentNode.children[match]
    const isDir = childNode?.type === 'dir'
    const completedToken = `${dirPart}${match}${isDir ? '/' : ' '}`

    inputCmd.value = `${baseCmd}${completedToken}`
  } 
  // 多匹配：计算公共前缀，若无更大前缀则打印候选列表
  else {
    const lcp = getLongestCommonPrefix(matches)
    if (lcp.length > filePrefix.length) {
      inputCmd.value = `${baseCmd}${dirPart}${lcp}`
    } else {
      // 像标准终端一样回显输入并列出候选项
      appendHistory(`guest@forestwork:${currentPathStr.value}$ ${rawCmd}`, 'input')
      const formatted = matches.sort().map(name => {
        const isDir = parentNode.children?.[name]?.type === 'dir'
        return isDir ? `${name}/` : name
      })
      appendHistory(formatted.join('  '), 'output')
    }
  }
}

const vfs = reactive<Record<string, VFSNode>>({
    'challenges': {
        type: 'dir',
        children: {}
    },
    'readme.txt': {
        type: 'file',
        content: 'FORESTWORK CTF ENVIRONMENT\n輸入 "help" 獲取幫助。\n輸入 "ls challenges" 查看各類題目。\n你會發現，所有的flag開頭都是以"PBCTF"開頭的，試試PBCTF{TKU_4_Acc3pt1ng_Tut0r1aLs_traralela_tololora}。'
    }
})

const rootNode = computed<VFSNode>(() => ({
    type: 'dir',
    children: vfs
}))

/**
 * 将相对或绝对路径解析为对应的 VFS 节点
 * @param targetPath 目标路径（如 "prompt.txt", "/challenges", "../", "."）
 * @returns 目标 VFSNode，若路径不存在则返回 null
 */
function resolvePath(targetPath: string): VFSNode | null {
    const trimmed = targetPath.trim()
    if (!trimmed || trimmed === '.') {
        return getCurrentNode()
    }

    // 判定绝对路径与相对路径的起始基准
    const isAbsolute = trimmed.startsWith('/')
    const segments: string[] = isAbsolute ? [] : [...currentPath.value]

    // 按 / 分割并利用栈压入/弹出
    const rawParts = trimmed.split('/').filter(Boolean)
    for (const part of rawParts) {
        if (part === '.') continue
        if (part === '..') {
            segments.pop()
        } else {
            segments.push(part)
        }
    }

    // 从根节点自顶向下顺藤摸瓜
    let curr: VFSNode = rootNode.value

    for (const seg of segments) {
        if (curr.type !== 'dir' || !curr.children) {
            return null
        }
        // 严格适配 noUncheckedIndexedAccess
        const nextNode: VFSNode | undefined = curr.children[seg]
        if (!nextNode) {
            return null
        }
        curr = nextNode
    }

    return curr
}

/**
 * 获取当前工作目录所在的 VFSNode
 */
function getCurrentNode(): VFSNode {
    let curr: VFSNode = rootNode.value

    for (const seg of currentPath.value) {
        if (curr.type !== 'dir' || !curr.children) {
            return rootNode.value
        }
        const nextNode: VFSNode | undefined = curr.children[seg]
        if (!nextNode) {
            return rootNode.value
        }
        curr = nextNode
    }

    return curr
}

async function hydrateChallenges() {
    try {
        const data = await $fetch<any[]>('/api/ctf/challenges')
        if (!data || !vfs['challenges']?.children) return

        const challengesRoot = vfs['challenges'].children

        data.forEach((c) => {
            const dirName = c.id

            // ★ 核心修复：把字符串里的字面量 "\n" 归一化为真实的控制台换行符
            const cleanPrompt = (c.prompt || '').replace(/\\n/g, '\n')

            const childrenNodes: Record<string, VFSNode> = {
                'prompt.txt': {
                    type: 'file',
                    content: `[${c.title}]\nCATEGORY: ${c.category}\nCURRENT_VALUE: ${c.current_points} pts\nSOLVES: ${c.solve_count}\n\n${cleanPrompt}`
                }
            }

            if (c.artifact_url) {
                const fileName = c.artifact_url.split('/').pop()?.split('?')[0] || 'artifact.bin'
                childrenNodes[fileName] = {
                    type: 'file',
                    isBinary: true,
                    artifactUrl: c.artifact_url
                }
            }

            challengesRoot[dirName] = {
                type: 'dir',
                children: childrenNodes
            }
        })

        appendHistory('[SYSTEM] OS booted successfully.', 'system')
    } catch (err: any) {
        appendHistory(`[WARN] Failed to sync challenges: ${err.message || 'Offline mode'}`, 'error')
    }
}

// ==========================================
// 1. Mock 排行榜数据结构（未来直接用 useFetch 替换为 /api/ctf/leaderboard）
// ==========================================
interface ScoreboardEntry {
    rank: number
    user: string
    solved: number
    score: number
    lastSolve: string
}

const mockScoreboard: ScoreboardEntry[] = [
    { rank: 1, user: 'Klm1200', solved: 4, score: 1450, lastSolve: '12m ago' },
    { rank: 2, user: 'Devil_Smile', solved: 3, score: 1100, lastSolve: '34m ago' },
    { rank: 3, user: 'guest_942', solved: 2, score: 600, lastSolve: '1h ago' },
    { rank: 4, user: 'you (guest)', solved: 0, score: 0, lastSolve: '--' }
]

// 好品味：纯字符填充排版，数值右对齐，文本左对齐，绝不依赖脆弱的 \t
function formatScoreboard(entries: ScoreboardEntry[]): string {
    if (entries.length === 0) {
        return '(no standings recorded for active cycle)'
    }

    // 列宽契约定义
    const W_RANK = 6
    const W_USER = 16
    const W_SOLVED = 8
    const W_SCORE = 9
    const W_TIME = 10

    const header =
        'RANK'.padStart(W_RANK) + '  ' +
        'OPERATOR'.padEnd(W_USER) + '  ' +
        'SOLVED'.padStart(W_SOLVED) + '  ' +
        'SCORE'.padStart(W_SCORE) + '  ' +
        'LATEST'.padEnd(W_TIME)

    const separator =
        '-'.repeat(W_RANK) + '  ' +
        '-'.repeat(W_USER) + '  ' +
        '-'.repeat(W_SOLVED) + '  ' +
        '-'.repeat(W_SCORE) + '  ' +
        '-'.repeat(W_TIME)

    const rows = entries.map(item => {
        const rankStr = `#${item.rank}`.padStart(W_RANK)
        const userStr = item.user.padEnd(W_USER)
        const solvedStr = String(item.solved).padStart(W_SOLVED)
        const scoreStr = `${item.score} pts`.padStart(W_SCORE)
        const timeStr = item.lastSolve.padEnd(W_TIME)
        return `${rankStr}  ${userStr}  ${solvedStr}  ${scoreStr}  ${timeStr}`
    })

    return [header, separator, ...rows].join('\n')
}

// 2. 易失状态（Session State）
const cwd = ref<string[]>([]) // 根目录为 []
const inputCmd = ref('')
const terminalRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const previewImage = ref<string | null>(null)

interface HistoryLine {
    id: number
    type: 'input' | 'output' | 'error' | 'success' | 'system'
    text: string
}

const history = ref<HistoryLine[]>([
    { id: 1, type: 'system', text: 'FORESTWORK_OS [Version 2026.09.17]' },
    { id: 2, type: 'system', text: 'Secure Virtual Environment initialized. Type "help" for active directives.\n' }
])

// 计算当前工作目录字符串
const currentPath = ref<string[]>([])

const currentPathStr = computed(() => {
    return currentPath.value.length === 0 ? '/' : '/' + currentPath.value.join('/')
})

// 3. 好品味路径解析器：统一消除特殊情况
function resolveNode(path: string): { node: VFSNode | null; newPath: string[] } {
    const parts = path.startsWith('/')
        ? path.split('/').filter(Boolean)
        : [...cwd.value, ...path.split('/').filter(Boolean)]

    const resolvedStack: string[] = []
    for (const part of parts) {
        if (part === '.') continue
        if (part === '..') {
            resolvedStack.pop()
        } else {
            resolvedStack.push(part)
        }
    }

    let curr: VFSNode = { type: 'dir', children: vfs }
    for (const p of resolvedStack) {
        if (curr.type !== 'dir' || !curr.children || !curr.children[p]) {
            return { node: null, newPath: [] }
        }
        curr = curr.children[p]
    }

    return { node: curr, newPath: resolvedStack }
}

function appendHistory(text: string, type: HistoryLine['type'] = 'output') {
    history.value.push({ id: Date.now() + Math.random(), text, type })
    nextTick(() => {
        if (terminalRef.value) {
            terminalRef.value.scrollTop = terminalRef.value.scrollHeight
        }
    })
}

// 4. 命令分发字典（Command Dispatcher）
const commands: Record<string, (args: string[]) => void> = {
    help: () => {
        appendHistory(`AVAILABLE DIRECTIVES:
  ls [dir]           列出目錄清單
  cd <dir>           切換工作目錄
  cat <file>         讀取文本文件
  open <image>       在視窗中預覽隱寫原圖
  download <file>    下載未損壞的原始二進制文件
  submit <flag>      向驗證器提交 Flag
  scoreboard         檢視全場即時積分榜 (別名: top)
  clear              清除終端屏幕
  whoami             顯示當前權限標記`, 'system')
    },

    clear: () => {
        history.value = []
    },

    whoami: () => {
        appendHistory('guest@forestwork-node-01 (unprivileged)', 'output')
    },

    ls: (args) => {
        // 1. 判定是否传入了包含 'a' 的标志位（如 -a, -la, -al）
        const showAll = args.some(arg => arg.startsWith('-') && arg.includes('a'))

        // 2. 剥离所有的 flag 参数，剩下的才是目标路径（如有）
        const pathArgs = args.filter(arg => !arg.startsWith('-'))
        const targetPath = pathArgs[0]

        const targetNode = targetPath ? resolvePath(targetPath) : getCurrentNode()

        if (!targetNode) {
            appendHistory(`ls: cannot access '${targetPath}': No such file or directory`, 'error')
            return
        }

        if (targetNode.type !== 'dir' || !targetNode.children) {
            // 如果目标是文件，直接输出文件名
            appendHistory(targetPath || '', 'output')
            return
        }

        // 3. 核心好品味：基于数据结构过滤，而不是业务判断
        let entries = Object.keys(targetNode.children)

        if (!showAll) {
            // 默认过滤掉所有以 . 开头的隐藏项
            entries = entries.filter(name => !name.startsWith('.'))
        }

        if (entries.length === 0) {
            // 如果目录下只有隐藏文件且没有敲 -a，输出空行或直接静默
            return
        }

        // 格式化输出：目录追加 /，并保持排序
        const formatted = entries.sort().map(name => {
            const isDir = targetNode.children?.[name]?.type === 'dir'
            return isDir ? `${name}/` : name
        })

        appendHistory(formatted.join('  '), 'output')
    },

    cd: (args) => {
        const target = args[0]?.trim()

        // 1. 无参数或 cd ~ 或 cd /，直接回根目录
        if (!target || target === '~' || target === '/') {
            currentPath.value = []
            return
        }

        // 2. 利用 resolvePath 直接嗅探目标节点
        const targetNode = resolvePath(target)

        if (!targetNode) {
            appendHistory(`cd: no such file or directory: ${target}`, 'error')
            return
        }

        if (targetNode.type !== 'dir') {
            appendHistory(`cd: not a directory: ${target}`, 'error')
            return
        }

        // 3. 计算新的工作目录栈
        const isAbsolute = target.startsWith('/')
        const segments = isAbsolute ? [] : [...currentPath.value]
        const rawParts = target.split('/').filter(Boolean)

        for (const part of rawParts) {
            if (part === '.') continue
            if (part === '..') {
                segments.pop()
            } else {
                segments.push(part)
            }
        }

        currentPath.value = segments
    },

    cat: (args) => {
        const target = args[0]?.trim()
        if (!target) {
            appendHistory('cat: missing file operand', 'error')
            return
        }

        // 核心：统一使用 resolvePath，同时支持相对路径与绝对路径
        const node = resolvePath(target)

        if (!node) {
            appendHistory(`cat: ${target}: No such file or directory`, 'error')
            return
        }

        if (node.type === 'dir') {
            appendHistory(`cat: ${target}: Is a directory`, 'error')
            return
        }

        if (node.isBinary) {
            appendHistory(`cat: ${target}: Cannot display binary file. Use 'open' or 'download'.`, 'error')
            return
        }

        appendHistory(node.content || '', 'output')
    },

    open: (args) => {
        const target = args[0]?.trim()
        if (!target) {
            appendHistory('open: missing file operand', 'error')
            return
        }

        const node = resolvePath(target)

        if (!node) {
            appendHistory(`open: ${target}: No such file or directory`, 'error')
            return
        }

        if (node.type === 'dir') {
            appendHistory(`open: ${target}: Is a directory`, 'error')
            return
        }

        if (!node.artifactUrl) {
            appendHistory(`open: ${target}: Not a viewable media artifact.`, 'error')
            return
        }

        // 唤起弹窗
        previewImage.value = node.artifactUrl
        appendHistory(`[SYSTEM] Displaying artifact inspector for: ${target}`, 'system')
    },

    download: (args) => {
        const target = args[0]?.trim()
        if (!target) {
            appendHistory('download: missing file operand', 'error')
            return
        }

        const node = resolvePath(target)

        if (!node) {
            appendHistory(`download: ${target}: No such file or directory`, 'error')
            return
        }

        if (node.type === 'dir') {
            appendHistory(`download: ${target}: Is a directory`, 'error')
            return
        }

        if (!node.artifactUrl) {
            appendHistory(`download: ${target}: File has no external artifact stream.`, 'error')
            return
        }

        // 安全外链下载
        const fileName = target.split('/').pop() || 'artifact.bin'
        triggerDownload(node.artifactUrl, fileName)
        appendHistory(`[SYSTEM] Dispatched raw binary download stream: ${fileName}`, 'system')
    },

    submit: async (args) => {
        const rawFlag = args.join(' ').trim().replace(/^["']|["']$/g, '')
        if (!rawFlag) {
            appendHistory('submit: missing flag payload. Usage: submit <FLAG{...}>', 'error')
            return
        }

        appendHistory('[VALIDATING] Dispatching cryptographic token sequence...', 'system')

        try {
            const res = await $fetch<{ success: boolean; message: string }>('/api/ctf/submit', {
                method: 'POST',
                body: { flag: rawFlag }
            })

            if (res.success) {
                appendHistory(`[+] ${res.message}`, 'success')
            } else {
                appendHistory(`[-] ${res.message}`, 'error')
            }
        } catch (err: any) {
            appendHistory(`[-] API_ERROR: ${err.statusMessage || err.message || 'Submission failed'}`, 'error')
        }
    },

    scoreboard: showScoreboard,
    top: showScoreboard,
}

// 5. 输入调度器
function handleExecute() {
    const line = inputCmd.value.trim()
    if (!line) return

    if (commandHistory.value[commandHistory.value.length - 1] !== line) {
        commandHistory.value.push(line)
    }
    historyIdx.value = -1
    inputDraft.value = ''

    appendHistory(`guest@forestwork:${currentPathStr.value}$ ${line}`, 'input')

    // 核心修复：安全提取首词，用卫语句斩杀 undefined
    const tokens = line.split(/\s+/)
    const rawCmd = tokens[0]
    if (!rawCmd) return

    const cmd = rawCmd.toLowerCase()
    const args = tokens.slice(1)
    inputCmd.value = ''

    const executor = commands[cmd]
    if (executor) {
        executor(args)
    } else {
        appendHistory(`command not found: ${cmd}. Type "help" for available directives.`, 'error')
    }
}

function focusInput() {
    inputRef.value?.focus()
}

function handleTerminalClick() {
    const selection = window.getSelection()
    if (selection && selection.toString().trim().length > 0) {
        return // 正在选词，放行用户原生操作
    }
    inputRef.value?.focus()
}

function triggerDownload(url: string, filename?: string) {
    if (!url) return

    // 如果没有显式指定文件名，从 URL 末尾优雅截取，兜底为 artifact.bin
    const fallbackName = url.split('/').pop()?.split('?')[0] || 'artifact.bin'
    const finalName = filename?.trim() || fallbackName

    const link = document.createElement('a')
    link.href = url
    link.download = finalName
    link.target = '_blank'
    link.rel = 'noopener noreferrer'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}

onMounted(() => {
    focusInput()
    hydrateChallenges()

    // 纯原生精确匹配：屏幕宽度 < 768px 或具备移动端触控特征
    if (window.matchMedia('(max-width: 768px)').matches) {
        isMobileDevice.value = true
        showMobileWarning.value = true

        // 同时以 Unix MOTD (Message of the Day) 风格，在终端历史流中白纸黑字留下系统提示
        appendHistory(
            '[WARN] MOBILE CLIENT DETECTED: Certain steganography, forensics, and binary artifacts require desktop reverse-engineering suites. Not all challenges are solvable on a mobile device alone.',
            'system'
        )
    }
})

// 允许选手手动点掉横幅，释放更多终端纵向空间
function dismissMobileWarning() {
    showMobileWarning.value = false
}
</script>

<template>
    <!-- 1. 根容器：砍掉 min-h-screen！用 100dvh 精准扣除 Header 与 Footer 高度，彻底封死外层滚动条 -->
    <div
        class="w-full max-w-5xl mx-auto px-4 pt-4 pb-2 sm:pt-6 sm:pb-3 h-[58dvh] md:h-[62dvh] lg:h-[calc(100dvh-10.5rem)] max-h-[620px] lg:max-h-none flex flex-col items-center select-text font-mono text-slate-200 overflow-hidden">

        <!-- 顶栏标题指示器（保持原样） -->
        <header class="w-full shrink-0 mb-2 flex justify-between items-center border-b border-emerald-950/80 pb-2">
            <div class="flex items-center gap-3">
                <span class="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <h1 class="text-xs sm:text-sm font-bold tracking-widest text-emerald-400">
                    FORESTWORK // VIRTUAL_CTF_CONSOLE
                </h1>
            </div>
            <NuxtLink to="/" class="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                [EXIT SESSION]
            </NuxtLink>
        </header>

        <!-- 3. 终端主视口（flex-1 自动吃满所有垂直剩余空间，自身 overflow-hidden 杜绝外溢） -->
        <!-- 终端主视口 -->
        <main @click="handleTerminalClick"
            class="w-full flex-1 min-h-0 bg-[#0f141c] border border-slate-800 rounded-lg p-3 sm:p-4 flex flex-col cursor-text shadow-2xl shadow-black/80 selection:bg-emerald-500 selection:text-black overflow-hidden relative">
            <!-- ★★★ 移动端专属警示条：内嵌于终端框顶部，不撑大外部页面，可手动关闭 ★★★ -->
            <div v-if="showMobileWarning"
                class="shrink-0 mb-2.5 px-3 py-2 bg-amber-950/40 border border-amber-500/50 rounded flex items-start justify-between gap-2 text-amber-300 text-xs">
                <div class="flex items-center gap-2 leading-relaxed">
                    <span>
                        檢測到行動裝置 / 平板設備。部分隱寫術（Stego）與二進制逆向題目需要桌面端專業工具鏈，可能無法僅憑觸控裝置獨立完成。
                    </span>
                </div>
                <button @click.stop="dismissMobileWarning"
                    class="shrink-0 text-amber-400 hover:text-amber-200 font-bold px-1.5 py-0.5 rounded bg-amber-900/40 hover:bg-amber-800/60 transition-colors"
                    title="關閉提示">
                    [ACK/OK]
                </button>
            </div>

            <!-- 输出历史流（全站唯一滚动区，高度会自动根据是否有上方横幅弹性伸缩） -->
            <div ref="terminalRef" class="flex-1 min-h-0 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                <div v-for="item in history" :key="item.id"
                    class="whitespace-pre-wrap leading-relaxed text-xs sm:text-sm">
                    <span v-if="item.type === 'input'" class="text-slate-400 font-bold">{{ item.text }}</span>
                    <span v-else-if="item.type === 'error'" class="text-rose-400 font-medium">{{ item.text }}</span>
                    <span v-else-if="item.type === 'success'" class="text-emerald-400 font-bold">{{ item.text }}</span>
                    <span v-else-if="item.type === 'system'" class="text-sky-400">{{ item.text }}</span>
                    <span v-else class="text-slate-300">{{ item.text }}</span>
                </div>
            </div>

            <!-- 命令行输入条保持在最底端 -->
            <div class="shrink-0 flex items-center gap-2 mt-2 pt-2 border-t border-slate-800/80">
                <span class="text-emerald-400 font-bold text-xs sm:text-sm whitespace-nowrap select-none">
                    guest@forestwork:{{ currentPathStr }}$
                </span>
                <input ref="inputRef" v-model="inputCmd" @keydown.enter="handleExecute"
                    @keydown.tab.prevent="handleTabComplete" @keydown.up.prevent="handleHistoryUp"
                    @keydown.down.prevent="handleHistoryDown" type="text" autofocus spellcheck="false"
                    autocomplete="off"
                    class="flex-1 bg-transparent border-none outline-none text-emerald-300 font-mono text-xs sm:text-sm caret-emerald-400 p-0 focus:ring-0" />
            </div>
        </main>

        <!-- 原生隐写图片模态框保持原样 -->
        <div v-if="previewImage"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
            @click.self="previewImage = null">
            <div class="max-w-xl w-full bg-[#161d27] border border-emerald-500/40 rounded p-4 text-slate-200">
                <div class="flex justify-between items-center mb-3">
                    <span class="text-xs font-bold text-emerald-400">ARTIFACT_INSPECTOR // RAW_PREVIEW</span>
                    <button @click="previewImage = null"
                        class="text-slate-400 hover:text-white text-xs">[CLOSE_ESC]</button>
                </div>
                <div class="flex justify-center bg-black/60 p-4 border border-slate-800 rounded">
                    <img :src="previewImage" class="max-h-[50vh] object-contain" alt="CTF Raw Artifact" />
                </div>
                <div class="mt-4 flex justify-between items-center text-xs text-slate-400">
                    <span>Format: RAW_IMAGE_PASS</span>
                    <button @click="triggerDownload('artifact.png')"
                        class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-black font-bold rounded transition-colors">
                        FETCH RAW BINARY
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>