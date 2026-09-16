import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1. 配置输入与输出路径
// 请根据你的实际存放位置调整 SOURCE_DIR
const SOURCE_DIR = path.resolve(__dirname, '../../gartic_phone/gartic_phone_content');
const OUTPUT_DIR = path.resolve(__dirname, '../../bucket_output/Gartic_Phone');

// 2. 月份归一化字典 (消除特殊情况)
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

// 1. 斯巴达式轮次数字提取器：消除所有特殊情况与 undefined
function resolveRoundNumber(folderName, rawH2) {
  // 优先级 A：从文件夹名提取（如 "Round_1", "Round-2", "round_03"）
  if (folderName) {
    const match = folderName.match(/\d+/);
    if (match) return match[0];
  }

  // 优先级 B：从 <h2> 中提取（如 "<h2>Round 2: ..."）
  if (rawH2) {
    const match = rawH2.match(/Round\s*(\d+)/i);
    if (match) return match[1];
  }

  // 优先级 C：终极保底，绝对不允许返回 undefined
  return '1';
}

// 2. 清洗 HTML 标签与空白
function sanitizeText(raw) {
  if (!raw) return '';
  return raw
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

// 3. 元数据提取核心引擎
function extractMetaFromHtml(htmlContent, folderName = '') {
  const h2Match = htmlContent.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
  const topicMatch = htmlContent.match(/<p[^>]*>\s*(?:主题|主題)\s*[:：]\s*([\s\S]*?)<\/p>/i);
  const authorMatch = htmlContent.match(/<p[^>]*>\s*(?:by|出题人|出題人|作者)\s*[:：]\s*([\s\S]*?)<\/p>/i);

  const rawH2 = sanitizeText(h2Match ? h2Match[1] : '');
  const topic = sanitizeText(topicMatch ? topicMatch[1] : '');
  const author = sanitizeText(authorMatch ? authorMatch[1] : '靈魂繪師們');

  // 彻底锁死 roundNumber，绝不会是 undefined
  const roundNumber = resolveRoundNumber(folderName, rawH2);

  // 提纯模式 (mode): 比如 "你畫我猜"、"破冰"
  let mode = '你畫我猜';
  if (rawH2) {
    const modeMatch = rawH2.match(/^Round\s*\d+(?:\s*[:：]\s*|\s+)?(.*)$/i);
    if (modeMatch && modeMatch[1].trim()) {
      mode = modeMatch[1].trim();
    } else if (!rawH2.toLowerCase().startsWith('round')) {
      mode = rawH2;
    }
  }

  // 组装标准标题契约：Round <n>: <topic>
  const title = (topic && topic !== '無')
    ? `Round ${roundNumber}: ${topic}`
    : `Round ${roundNumber}: ${mode}`;

  return {
    title,
    mode,
    topic: topic || '無',
    author
  };
}

// 核心标题清洗函数：彻底消除冒号与空格的特殊情况
function formatRoundTitle(rawTitle, roundNumber) {
  const text = sanitizeText(rawTitle);
  if (!text) {
    return `Round ${roundNumber}`;
  }

  // 正则解析：匹配 "Round" + 数字 + (任意中英文冒号与空白) + 剩余标题正文
  const match = text.match(/^Round\s*(\d+)(?:\s*[:：]\s*|\s+)?(.*)$/i);

  if (match) {
    const num = match[1];
    const subTitle = match[2].trim();
    // 如果有副标题输出 "Round <n>: <title>"，否则只输出 "Round <n>"
    return subTitle ? `Round ${num}: ${subTitle}` : `Round ${num}`;
  }

  // 边界兜底：如果原 h2 压根没带 "Round" 字样（例如只有 "你畫我猜"），则用目录的 roundNumber 自动补齐
  return `Round ${roundNumber}: ${text}`;
}

function processAllLegacyHtml() {
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`❌ 源目录不存在: ${SOURCE_DIR}`);
    process.exit(1);
  }

  console.log(`[Info] 开始扫描历史目录: ${SOURCE_DIR}`);
  let count = 0;

  // 1. 扫描 <year>_<Month> 文件夹
  const yearMonthDirs = fs.readdirSync(SOURCE_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory());

  for (const ymDir of yearMonthDirs) {
    const ymName = ymDir.name; // 例如: 2022_April 或 2022_04
    const parts = ymName.split('_');
    if (parts.length < 2) continue;

    const year = parts[0];
    const rawMonth = parts[1].toLowerCase();
    const month = MONTH_MAP[rawMonth] || rawMonth.padStart(2, '0');

    const ymPath = path.join(SOURCE_DIR, ymName);

    // 2. 扫描 Round_<1-5> 文件夹
    const roundDirs = fs.readdirSync(ymPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() && dirent.name.toLowerCase().startsWith('round'));

    for (const rDir of roundDirs) {
      // 提取数字，例如 Round_1 -> 1
      const roundMatch = rDir.name.match(/\d+/);
      if (!roundMatch) continue;
      const roundNumber = roundMatch[0];

      const htmlPath = path.join(ymPath, rDir.name, 'index.html');
      if (!fs.existsSync(htmlPath)) continue;

      const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
      const meta = extractMetaFromHtml(htmlContent, rDir.name);

      // 如果未找到 h2，兜底生成标题
      if (!meta.title) {
        meta.title = `林間繪師重現 —— ${year}年${month}月 (phase_${roundNumber})`;
      }

      // 3. 构建 Bucket 结构输出目录: <OUTPUT_DIR>/<year>/<month>/main/
      const targetDir = path.join(OUTPUT_DIR, year, month, 'main');
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // 输出文件名对齐 phase_<N>.json
      const targetFilePath = path.join(targetDir, `phase_${roundNumber}.json`);
      fs.writeFileSync(targetFilePath, JSON.stringify(meta, null, 2), 'utf-8');

      console.log(`[Generated] -> ${year}/${month}/main/phase_${roundNumber}.json`);
      count++;
    }
  }

  console.log(`\n✅ 处理完成！共转换 ${count} 份历史元数据。`);
  console.log(`📂 输出根目录位于: ${OUTPUT_DIR}`);
}

processAllLegacyHtml();