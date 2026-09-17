// scripts/hash-flag.mjs
import { createHash } from 'node:crypto'

const args = process.argv.slice(2)
const isCI = args.includes('--ci') || args.includes('-i')
const rawInput = args.find(arg => !arg.startsWith('-'))

if (!rawInput) {
  console.error('\x1b[31m[-] 錯誤: 缺少 Flag 參數。\x1b[0m')
  console.log('\x1b[33m用法範例:\x1b[0m')
  console.log('  pnpm ctf:hash \'FLAG{secret}\'         # 標準區分大小寫')
  console.log('  pnpm ctf:hash \'FLAG{secret}\' --ci    # 標記為忽略大小寫 (自動小寫化哈希)')
  process.exit(1)
}

let cleanFlag = rawInput.trim().replace(/^["']|["']$/g, '')

// 如果開啟了忽略大小寫，規範化為純小寫再算哈希
if (isCI) {
  cleanFlag = cleanFlag.toLowerCase()
}

const hash = createHash('sha256').update(cleanFlag).digest('hex')

console.log('\x1b[32m[+] Flag 規範原文:\x1b[0m', cleanFlag)
console.log('\x1b[32m[+] 忽略大小寫?   :\x1b[0m', isCI ? 'TRUE' : 'FALSE')
console.log('\x1b[32m[+] SHA-256 摘要  :\x1b[0m', hash)
console.log('\x1b[36m[+] SQL 插入參考  :\x1b[0m', `flag_hash = '${hash}', is_case_insensitive = ${isCI}`)