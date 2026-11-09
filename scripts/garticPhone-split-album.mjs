#!/usr/bin/env node
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

// 验证图形引擎
let sharp;
try {
  const sharpModule = await import('sharp');
  sharp = sharpModule.default;
} catch {
  console.error('❌ 缺少核心图像处理库: sharp');
  console.error('👉 请先在项目根目录运行: pnpm add -D sharp\n');
  process.exit(1);
}

// ==========================================
// 1. 月份标准化映射
// ==========================================
const MONTH_MAP = {
  january: '01', jan: '01', '1': '01', '01': '01',
  february: '02', feb: '02', '2': '02', '02': '02',
  march: '03', mar: '03', '3': '03', '03': '03',
  april: '04', apr: '04', '4': '04', '04': '04',
  may: '05', '5': '05', '05': '05',
  june: '06', jun: '06', '6': '06', '06': '06',
  july: '07', jul: '07', '7': '07', '07': '07',
  august: '08', aug: '08', '8': '08', '08': '08',
  september: '09', sep: '09', '9': '09', '09': '09',
  october: '10', oct: '10', '10': '10',
  november: '11', nov: '11', '11': '11',
  december: '12', dec: '12', '12': '12'
};

// ==========================================
// 2. 参数解析
// ==========================================
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isForce = args.includes('--force');
const targetArg = args.find(arg => !arg.startsWith('--'));

const TARGET_DIR = path.resolve(process.cwd(), targetArg || 'gartic_phone/gartic_phone_content');

if (!existsSync(TARGET_DIR)) {
  console.error(`❌ 错误: 目标目录不存在 -> ${TARGET_DIR}`);
  console.error('💡 用法: node scripts/gartic_phone_split_album.mjs [目录路径] [--dry-run] [--force]');
  process.exit(1);
}

console.log(`=======================================================`);
console.log(`🎬 Gartic Phone 全自动清洗：元数据抽取 + 拆帧 + 结构对齐`);
console.log(`📂 工作目录: ${TARGET_DIR}`);
console.log(`🛡️  运行模式: ${isDryRun ? '【DRY-RUN 预览模式】' : '【LIVE 物理执行】'}`);
console.log(`=======================================================\n`);

const stats = {
  normalizedYMDs: 0,
  extractedMetas: 0,
  renamedPhases: 0,
  sanitizedChains: 0,
  cleanedAssets: 0,
  splitGifs: 0,
  extractedFrames: 0,
  purgedDirtyFrames: 0
};

// ==========================================
// 3. I/O 安全操作原语
// ==========================================
async function safeRename(oldPath, newPath, logMsg) {
  if (oldPath === newPath) return;
  console.log(`  ${logMsg}`);
  if (!isDryRun) {
    await fs.mkdir(path.dirname(newPath), { recursive: true });
    await fs.rename(oldPath, newPath);
  }
}

async function safeWriteJson(targetPath, data, logMsg) {
  console.log(`  ${logMsg}`);
  if (!isDryRun) {
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, JSON.stringify(data, null, 2), 'utf-8');
  }
}

async function safeUnlink(filePath, logMsg) {
  console.log(`  ${logMsg}`);
  if (!isDryRun) {
    await fs.unlink(filePath);
  }
}

async function safeRmdir(dirPath, logMsg) {
  console.log(`  ${logMsg}`);
  if (!isDryRun) {
    await fs.rmdir(dirPath).catch(() => {});
  }
}

function sanitizeText(raw) {
  if (!raw) return '';
  return raw.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
}

// ==========================================
// 4. 第一阶段：标准化年月顶级目录 (<year>_<Month> -> <year>/<month>)
// ==========================================
async function normalizeYearMonthDirs(rootDir) {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const ymMatch = entry.name.match(/^(\d{4})[-_]([a-zA-Z0-9]+)$/);
    if (ymMatch) {
      const year = ymMatch[1];
      const rawMonth = ymMatch[2].toLowerCase();
      const month = MONTH_MAP[rawMonth] || rawMonth.padStart(2, '0');

      const oldPath = path.join(rootDir, entry.name);
      const newPath = path.join(rootDir, year, month);

      if (oldPath !== newPath) {
        await safeRename(
          oldPath,
          newPath,
          `[NORMALIZE YM] ${entry.name} -> ${year}/${month}`
        );
        stats.normalizedYMDs++;
      }
    }
  }
}

// ==========================================
// 5. 第二阶段：HTML 元数据提取 (提取后生成 main/phase_<N>.json)
// ==========================================
function parseMetaHtml(htmlContent, fallbackPhaseNum) {
  const h2Match = htmlContent.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
  const topicMatch = htmlContent.match(/<p[^>]*>\s*(?:主题|主題)\s*[:：]\s*([\s\S]*?)<\/p>/i);
  const authorMatch = htmlContent.match(/<p[^>]*>\s*(?:by|出题人|出題人|作者)\s*[:：]\s*([\s\S]*?)<\/p>/i);

  const rawH2 = sanitizeText(h2Match ? h2Match[1] : '');
  const topic = sanitizeText(topicMatch ? topicMatch[1] : '');
  const author = sanitizeText(authorMatch ? authorMatch[1] : '靈魂繪師們');

  // 解析模式与标题
  let mode = '你畫我猜';
  if (rawH2) {
    const modeMatch = rawH2.match(/^Round\s*\d+(?:\s*[:：]\s*|\s+)?(.*)$/i);
    if (modeMatch && modeMatch[1].trim()) {
      mode = modeMatch[1].trim();
    } else if (!rawH2.toLowerCase().startsWith('round')) {
      mode = rawH2;
    }
  }

  const title = (topic && topic !== '無')
    ? `Round ${fallbackPhaseNum}: ${topic}`
    : `Round ${fallbackPhaseNum}: ${mode}`;

  return {
    title,
    mode,
    topic: topic || '無',
    author
  };
}

// 扫描并就地转换 index.html 为 main/phase_<N>.json
async function extractLegacyHtmlMetadata(monthDir) {
  const entries = await fs.readdir(monthDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    // 匹配 Round_<N> 或 phase_<N>
    const match = entry.name.match(/^(?:round|phase)[\s_-]*([1-5])$/i);
    if (!match) continue;

    const phaseNum = match[1];
    const roundDirPath = path.join(monthDir, entry.name);
    const htmlPath = path.join(roundDirPath, 'index.html');

    if (existsSync(htmlPath)) {
      const htmlContent = await fs.readFile(htmlPath, 'utf-8');
      const meta = parseMetaHtml(htmlContent, phaseNum);

      const targetJsonPath = path.join(monthDir, 'main', `phase_${phaseNum}.json`);
      if (!existsSync(targetJsonPath) || isForce) {
        await safeWriteJson(
          targetJsonPath,
          meta,
          `[EXTRACT META] ${path.relative(TARGET_DIR, htmlPath)} -> main/phase_${phaseNum}.json`
        );
        stats.extractedMetas++;
      }
    }
  }
}

// 递归穿透至各月份目录
async function scanAndExtractAllMetas(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  // 命中月份目录 (父目录是 4 位年份，当前目录是 2 位月份)
  const isMonthDir = /^\d{2}$/.test(path.basename(dir)) && /^\d{4}$/.test(path.basename(path.dirname(dir)));

  if (isMonthDir) {
    await extractLegacyHtmlMetadata(dir);
    return;
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      await scanAndExtractAllMetas(path.join(dir, entry.name));
    }
  }
}

// ==========================================
// 6. 第三阶段：规范化轮次目录 Round_<1-5> -> phase_<1-5>
// ==========================================
async function normalizePhaseDirs(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const fullPath = path.join(dir, entry.name);

    await normalizePhaseDirs(fullPath);

    const match = entry.name.match(/^round[\s_-]*([1-5])$/i);
    if (match) {
      const phaseNum = match[1];
      const newName = `phase_${phaseNum}`;
      const newFullPath = path.join(dir, newName);

      if (fullPath !== newFullPath) {
        await safeRename(
          fullPath,
          newFullPath,
          `[PHASE STANDARDIZE] ${path.relative(TARGET_DIR, fullPath)} -> ${newName}`
        );
        stats.renamedPhases++;
      }
    }
  }
}

// ==========================================
// 7. 第四阶段：提升 assets 嵌套并对齐链条两位补零 (01~09)
// ==========================================
async function sanitizeRoundChains(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const fullPath = path.join(dir, entry.name);

    if (entry.name.toLowerCase() === 'assets' && /^phase_[1-5]$/i.test(path.basename(dir))) {
      const parentPhaseDir = dir;
      const subEntries = await fs.readdir(fullPath, { withFileTypes: true });

      for (const sub of subEntries) {
        const subPath = path.join(fullPath, sub.name);

        if (sub.isDirectory()) {
          let chainNum = sub.name;
          if (/^\d+$/.test(sub.name)) {
            chainNum = String(parseInt(sub.name, 10)).padStart(2, '0');
          }
          const destPath = path.join(parentPhaseDir, chainNum);

          await safeRename(
            subPath,
            destPath,
            `[PROMOTE CHAIN] ${path.relative(TARGET_DIR, subPath)} -> ${chainNum}`
          );
          stats.sanitizedChains++;
        }
      }

      await safeRmdir(fullPath, `[REMOVE EMPTY ASSETS] ${path.relative(TARGET_DIR, fullPath)}`);
      stats.cleanedAssets++;
      continue;
    }

    if (/^phase_[1-5]$/i.test(path.basename(dir)) && /^\d$/.test(entry.name)) {
      const paddedChain = String(parseInt(entry.name, 10)).padStart(2, '0');
      const newFullPath = path.join(dir, paddedChain);
      await safeRename(
        fullPath,
        newFullPath,
        `[PAD CHAIN] ${path.relative(TARGET_DIR, fullPath)} -> ${paddedChain}`
      );
      stats.sanitizedChains++;
      await sanitizeRoundChains(newFullPath);
      continue;
    }

    await sanitizeRoundChains(fullPath);
  }
}

// ==========================================
// 8. 第五阶段：Sharp 拆帧 (frame_01.png 起步) 与旧帧清理
// ==========================================
async function splitAndVerifyFrames(chainDir) {
  const entries = await fs.readdir(chainDir, { withFileTypes: true });

  let albumPath = path.join(chainDir, 'album.gif');
  if (!existsSync(albumPath)) {
    const rawGif = entries.find(e => e.isFile() && e.name.toLowerCase().endsWith('.gif'));
    if (rawGif) {
      const oldGifPath = path.join(chainDir, rawGif.name);
      await safeRename(
        oldGifPath,
        albumPath,
        `[STANDARDIZE GIF] ${path.relative(TARGET_DIR, oldGifPath)} -> album.gif`
      );
    }
  }

  // 清除 0-indexed 的残次品 (frame_00.png, frame_0.png)
  for (const entry of entries) {
    if (entry.isFile() && /^frame_0{1,2}\.png$/i.test(entry.name)) {
      await safeUnlink(
        path.join(chainDir, entry.name),
        `[PURGE DIRTY FRAME] ${path.relative(TARGET_DIR, path.join(chainDir, entry.name))}`
      );
      stats.purgedDirtyFrames++;
    }
  }

  if (existsSync(albumPath) || isDryRun) {
    try {
      const metadata = await sharp(albumPath, { animated: true }).metadata();
      const totalFrames = metadata.pages || 1;

      console.log(`  [SPLIT ALBUM] ${path.relative(TARGET_DIR, albumPath)} (共 ${totalFrames} 帧)`);
      stats.splitGifs++;

      if (!isDryRun) {
        for (let idx = 0; idx < totalFrames; idx++) {
          const frameNumStr = String(idx + 1).padStart(2, '0');
          const targetFrameName = `frame_${frameNumStr}.png`;
          const targetFramePath = path.join(chainDir, targetFrameName);

          if (existsSync(targetFramePath) && !isForce) continue;

          await sharp(albumPath, { page: idx })
            .png()
            .toFile(targetFramePath);

          stats.extractedFrames++;
        }
      }
    } catch (err) {
      console.error(`  ❌ 拆帧失败: ${albumPath}`, err.message);
    }
  }
}

async function scanAndProcessChains(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const isChainFolder = /^\d{2}$/.test(path.basename(dir)) && /^phase_[1-5]$/i.test(path.basename(path.dirname(dir)));

  if (isChainFolder) {
    await splitAndVerifyFrames(dir);
    return;
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      await scanAndProcessChains(path.join(dir, entry.name));
    }
  }
}

// ==========================================
// 9. 统一引擎主流程
// ==========================================
async function main() {
  const start = Date.now();
  try {
    console.log(`▶ [Pass 1/5] 标准化年月目录 (<year>_<Month> -> <year>/<month>)...`);
    await normalizeYearMonthDirs(TARGET_DIR);

    console.log(`\n▶ [Pass 2/5] 提取历史 index.html 元数据 -> main/phase_<N>.json...`);
    await scanAndExtractAllMetas(TARGET_DIR);

    console.log(`\n▶ [Pass 3/5] 规范化轮次目录 (Round_<1-5> -> phase_<1-5>)...`);
    await normalizePhaseDirs(TARGET_DIR);

    console.log(`\n▶ [Pass 4/5] 提升 assets 层级并对齐链条补零 (<rounds: 01~09>)...`);
    await sanitizeRoundChains(TARGET_DIR);

    console.log(`\n▶ [Pass 5/5] 执行 Sharp 动图拆帧与 1-based 帧校验...`);
    await scanAndProcessChains(TARGET_DIR);

    const cost = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`\n=======================================================`);
    console.log(`🎉 全流程统一管线收敛完成！(耗时 ${cost}s)`);
    console.log(`📊 统计报告:`);
    console.log(`   - 年月目录重整 (<year>/<month>)   : ${stats.normalizedYMDs} 处`);
    console.log(`   - 提取并生成元数据 (main/*.json)   : ${stats.extractedMetas} 份`);
    console.log(`   - 阶段目录规范 (phase_<1-5>)     : ${stats.renamedPhases} 处`);
    console.log(`   - 故事链编号两位对齐 (<rounds>)  : ${stats.sanitizedChains} 个`);
    console.log(`   - 清除废弃 assets 目录           : ${stats.cleanedAssets} 个`);
    console.log(`   - 动图解析 (album.gif)           : ${stats.splitGifs} 个`);
    console.log(`   - 规范生成 1-based 帧 (frame_xx) : ${stats.extractedFrames} 张`);
    console.log(`   - 清除 0-indexed 脏帧            : ${stats.purgedDirtyFrames} 张`);
    console.log(`=======================================================`);

    if (isDryRun) {
      console.log(`\n💡 处于 Dry-Run 模式，磁盘未作改动。确认无误后移除 --dry-run 运行。`);
    } else {
      console.log(`\n🚀 目录已成为 100% 完整的 Supabase 镜像（包含 main/ 元数据与画作帧）！`);
    }
  } catch (error) {
    console.error(`\n❌ 执行管线发生异常:`, error);
    process.exit(1);
  }
}

main();