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

const CURRENT_OPERATOR = 'operator_10001'

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
        content: 'FORESTWORK CTF ENVIRONMENT\n輸入 "help" 獲取幫助。\n輸入 "ls challenges" 查看各類題目。\n你會發現，所有的flag開頭都是以"PBCTF"開頭的。'
    },
    '.flag_sample.txt': {
        type: 'file',
        content: 'PBCTF{TKU_4_Acc3pt1ng_Tut0r1aLs_B38694}'
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

// ==========================================
// 动态关卡数据水合引擎 (支持多文本文件与代码注入)
// ==========================================
async function hydrateChallenges() {
    try {
        const data = await $fetch<any[]>('/api/ctf/challenges')
        if (!data || !vfs['challenges']?.children) return

        const challengesRoot = vfs['challenges'].children

        data.forEach((c) => {
            const dirName = c.id
            const cleanPrompt = (c.prompt || c.description || '').replace(/\\n/g, '\n')

            // 1. 初始化目录节点，内置题面
            const childrenNodes: Record<string, VFSNode> = {
                'prompt.txt': {
                    type: 'file',
                    content: `[${c.title}]\nCATEGORY: ${c.category}\nCURRENT_VALUE: ${c.current_points} pts\nSOLVES: ${c.solve_count}\n\n${cleanPrompt}`
                }
            }

            // 2. 核心好品味：单一事实源！纯文本代码与二进制附件全由 files 统领, 智能感知纯代码、扁平 URL 与嵌套附件对象
            if (c.files && typeof c.files === 'object') {
                for (const [filename, val] of Object.entries(c.files)) {
                    if (typeof val === 'string') {
                        const trimmedVal = val.trim()
                        const isHttp = /^https?:\/\//i.test(trimmedVal)
                        const isUrlShortcut = /\.url$/i.test(filename)

                        // ★ 核心好品味：如果是 .url 快捷方式，它是纯文本！允许 cat 查看，也允许 open 唤起
                        if (isUrlShortcut) {
                            childrenNodes[filename] = {
                                type: 'file',
                                content: trimmedVal,       // 填入纯文本，cat 时直接打印这行 URL！
                                artifactUrl: trimmedVal,   // 记录直链，open 时直接弹射！
                                isBinary: false            // 绝非二进制！
                            }
                        } 
                        // 其他普通的 http 外链（图片、视频、zip、bin）保持为二进制物料
                        else if (isHttp) {
                            childrenNodes[filename] = {
                                type: 'file',
                                isBinary: true,
                                artifactUrl: trimmedVal
                            }
                        } 
                        // 本地纯文本/代码
                        else {
                            childrenNodes[filename] = {
                                type: 'file',
                                content: val.replace(/\\n/g, '\n')
                            }
                        }
                    } 
                    // 兼容旧的嵌套对象结构
                    else if (typeof val === 'object' && val !== null && (val as any).artifact_url) {
                        childrenNodes[filename] = {
                            type: 'file',
                            isBinary: true,
                            artifactUrl: (val as any).artifact_url
                        }
                    }
                }
            }

            // 👈 那个恶心的 if (c.artifact_url) 已经被彻底抹杀！

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
const inputCmd = ref('')
const terminalRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)

interface PreviewMedia {
    url: string
    name: string
    type: 'image' | 'video'
}
const activeMedia = ref<PreviewMedia | null>(null)

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
        appendHistory(`目前擁有的指令集:
  ls [-a] [dir]      列出目錄清單 (支援 -a 顯示隱藏項目)
  cd <dir>           切換工作目錄
  cat <file>         讀取文本文件
  open <image>       在視窗中預覽隱寫原圖
  download <file>    下載未損壞的原始二進制文件
  submit <flag>      向驗證器提交 Flag
  scoreboard         檢視全場即時積分榜 (別名: top)
  clear              清除終端屏幕
  whoami             顯示當前權限標記
  whois [player]     查詢玩家解題檔案明細 (缺省為本人)`, 'system')
    },

    clear: () => {
        history.value = []
    },

    whoami: () => {
        appendHistory('guest@forestwork-node-01 (unprivileged)', 'output')
    },

    // ==========================================
    // whois: 查询选手解题档案 (默认回退至当前操作员)
    // ==========================================
    whois: async (args) => {
        // 核心好品味：如果没有传参，无缝降级为查询自己！
        const target = args[0]?.trim() || CURRENT_OPERATOR

        appendHistory(`[TELEMETRY] 尋轉關於 ${target} 的記錄...`, 'system')

        try {
            const res = await $fetch<any>('/api/ctf/whois', {
                params: { operator: target }
            })

            if (!res || !res.found) {
                appendHistory(`[-] 玩家 "${target}" 不存在、或尚未解出任何一道題目。`, 'error')
                return
            }

            // 格式化输出卡片
            appendHistory(`[玩家檔案]
  玩家昵稱 : ${res.accountId}
  目前名次 : #${res.rank}
  目前總分 : ${res.totalScore} 分
  解題題數 : ${res.solvesCount} 題

  已解決的謎題:`, 'output')

            if (res.solves.length === 0) {
                appendHistory('  (目前沒有任何解題記錄)', 'system')
                return
            }

            res.solves.forEach((s: any) => {
                const timeStr = new Date(s.solvedAt).toLocaleTimeString()
                const cat = `[${s.category}]`.padEnd(9, ' ')
                const title = s.title.length > 16 ? s.title.slice(0, 15) + '…' : s.title.padEnd(16, ' ')
                const pts = `(+${s.points} pts)`.padStart(11, ' ')

                appendHistory(`  ${cat} ${title} ${pts}  @ ${timeStr}`, 'output')
            })
        } catch (err: any) {
            appendHistory(`whois: failed to inspect operator: ${err.message || 'Network error'}`, 'error')
        }
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

    // ==========================================
    // open: 通用媒体工件检查器 与 外部靶场穿透
    // ==========================================
    open: (args) => {
        const target = args[0]?.trim()
        if (!target) {
            appendHistory('open: missing operand. Usage: open <media_file | url>', 'error')
            return
        }

        // 1. 如果输入本身就是纯 URL：直接无视拦截弹射新标签页
        if (/^https?:\/\//i.test(target)) {
            openExternalTab(target)
            appendHistory(`[SYSTEM] Dispatched external uplink: ${target}`, 'system')
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

        // 2. ★ 核心好品味：针对 .url 快捷方式文件，提取其内容/直链并以 DOM 锚点穿透打开！
        if (target.toLowerCase().endsWith('.url') || (node.artifactUrl && /^https?:\/\//i.test(node.artifactUrl) && !/\.(jpe?g|png|gif|webp|svg|bmp|ico|mp4|webm|ogg|mov|zip|pcap|bin|tar|gz)$/i.test(target))) {
            const destUrl = node.artifactUrl || node.content?.trim()
            if (destUrl) {
                openExternalTab(destUrl)
                appendHistory(`[SYSTEM] Dispatched external uplink from shortcut: ${destUrl}`, 'system')
                return
            }
        }

        if (!node.artifactUrl) {
            appendHistory(`open: ${target}: Not an external media artifact.`, 'error')
            return
        }

        // 3. 图像与视频媒体嗅探
        const isImage = /\.(jpe?g|png|gif|webp|svg|bmp|ico)$/i.test(target)
        const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(target)

        if (!isImage && !isVideo) {
            appendHistory(`open: ${target}: Unsupported media stream format. Use 'download' instead.`, 'error')
            return
        }

        const fileName = target.split('/').pop() || target
        activeMedia.value = {
            url: node.artifactUrl,
            name: fileName,
            type: isVideo ? 'video' : 'image'
        }

        appendHistory(`[SYSTEM] Displaying artifact inspector for: ${target} [${isVideo ? 'VIDEO' : 'IMAGE'}]`, 'system')
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

function openExternalTab(rawUrl: string) {
    if (!rawUrl) return
    let dest = rawUrl.trim()
    
    // 协议安全补齐：防止相对路径污染
    if (!/^https?:\/\//i.test(dest)) {
        dest = `https://${dest}`
    }

    const link = document.createElement('a')
    link.href = dest
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

        <!-- ========================================== -->
    <!-- 统一媒体工件检查器 (Artifact Inspector Modal) -->
    <!-- ========================================== -->
    <div 
      v-if="activeMedia" 
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none"
      @click.self="activeMedia = null"
    >
      <div class="relative max-w-4xl w-full bg-black/90 border border-emerald-500/40 rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.2)] overflow-hidden flex flex-col">
        <!-- 弹窗顶栏 (Unix 质感) -->
        <div class="flex items-center justify-between px-4 py-2 bg-emerald-950/40 border-b border-emerald-500/30 font-mono text-xs text-emerald-400">
          <div class="flex items-center gap-2">
            <span class="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>INSPECTOR // {{ activeMedia.name }}</span>
          </div>
          <button 
            type="button" 
            class="text-emerald-500/60 hover:text-emerald-300 transition-colors uppercase font-bold"
            @click="activeMedia = null"
          >
            [CLOSE ESC]
          </button>
        </div>

        <!-- 媒体核心视口 -->
        <div class="p-2 flex items-center justify-center bg-black min-h-[200px] max-h-[80vh] overflow-auto">
          <!-- 视频形态：带原生控制台、自动播放 -->
          <video 
            v-if="activeMedia.type === 'video'" 
            :src="activeMedia.url" 
            controls 
            autoplay 
            playsinline 
            class="max-w-full max-h-[75vh] rounded object-contain border border-emerald-500/20"
          >
            Your browser does not support HTML5 video streaming.
          </video>

          <!-- 图像形态 -->
          <img 
            v-else 
            :src="activeMedia.url" 
            :alt="activeMedia.name" 
            class="max-w-full max-h-[75vh] object-contain rounded"
          />
        </div>
      </div>
    </div>
    </div>
</template>