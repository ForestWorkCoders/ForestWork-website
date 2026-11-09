// scripts/generate-tarot-rev.mjs
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp' // 本地安裝一次用作構建工具: pnpm add -D sharp

const TAROT_DIR = path.resolve('public/tarot')

if (!fs.existsSync(TAROT_DIR)) {
  console.error(`❌ 找不到目錄: ${TAROT_DIR}`)
  process.exit(1)
}

const files = fs.readdirSync(TAROT_DIR).filter(f => f.endsWith('.png') && !f.includes('_rev'))

console.log(`🎴 正在批次生成 22 張大阿卡那逆位圖片...`)

for (const file of files) {
  const inputPath = path.join(TAROT_DIR, file)
  const outputPath = path.join(TAROT_DIR, file.replace('.png', '_rev.png'))

  // 物理旋轉 180 度並輸出
  await sharp(inputPath)
    .rotate(180)
    .toFile(outputPath)

  console.log(`✅ 已生成逆位: ${file} -> ${path.basename(outputPath)}`)
}

console.log(`\n🎉 全部逆位卡牌生成完畢！共 ${files.length} 張。`)