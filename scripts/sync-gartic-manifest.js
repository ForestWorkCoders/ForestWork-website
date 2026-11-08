import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ 致命错误: 缺少 SUPABASE_URL 或 SUPABASE_ANON_KEY 环境变量");
  console.error("💡 提示: 请确认根目录存在 .env 文件，并包含上述两项配置");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const bucketName = 'Gartic_Phone';

async function generateAllManifests() {
  console.log(`[Info] 开始自动扫描 Supabase 存储桶中的所有对局...`);

  const allSessions = [];

  // 1. 获取根目录下的所有年份 (例如: 2022, 2023, 2025)
  const { data: years, error: yearError } = await supabase.storage.from(bucketName).list('', {
    limit: 100,
    sortBy: { column: 'name', order: 'asc' }
  });

  if (yearError || !years) {
    console.error("❌ 获取年份目录失败:", yearError?.message);
    process.exit(1);
  }

  // 修复：改用 !item.id，绝不要用 === null，同时防范 metadata 结构差异
  const validYears = years.filter(item => !item.name.startsWith('.') && !item.id);

  for (const yearObj of validYears) {
    const year = yearObj.name;

    // 2. 获取该年份下的所有月份 (例如: 02, 03...)
    const { data: months } = await supabase.storage.from(bucketName).list(year, {
      limit: 100,
      sortBy: { column: 'name', order: 'asc' }
    });

    if (!months) continue;
    const validMonths = months.filter(item => !item.name.startsWith('.') && item.id === null);

    for (const monthObj of validMonths) {
      const month = monthObj.name;
      const monthPath = `${year}/${month}`;

      // 3. 获取该月份下的所有阶段 (例如: phase_1, phase_2...)
      const { data: phases } = await supabase.storage.from(bucketName).list(monthPath, {
        limit: 100,
        sortBy: { column: 'name', order: 'asc' }
      });

      if (!phases) continue;
      const validPhases = phases.filter(item => !item.name.startsWith('.') && item.id === null);

      for (const phaseObj of validPhases) {
        const phase = phaseObj.name; // 例如 phase_1
        const folderPath = `${monthPath}/${phase}`; // 对应如 2022/05/phase_1
        const sessionId = `${year}-${month}-${phase}`; // 对应路由 id: 2022-05-phase_1

        console.log(`[Processing] 正在扫描对局: ${sessionId} ...`);

        // 4. 获取该阶段下的所有玩家链 (01, 02, 03...)
        const { data: folders } = await supabase.storage.from(bucketName).list(folderPath, {
          limit: 100,
          sortBy: { column: 'name', order: 'asc' }
        });

        if (!folders) continue;
        const chainNames = folders
          .filter(item => !item.name.startsWith('.') && item.id === null)
          .map(folder => folder.name);

        if (chainNames.length === 0) continue;

        // 5. 并行计算每条链的动态帧数
        // 在并行获取链条详情的逻辑中：
        const chainsWithDetails = await Promise.all(
          chainNames.map(async (chainName) => {
            const chainPath = `${folderPath}/${chainName}`;

            const { data: files } = await supabase.storage.from(bucketName).list(chainPath, {
              limit: 100,
              offset: 0
            });

            // 1. 筛选出所有真正的画作帧
            // 2. 提取文件名并排序（字符串排序能完美搞定 frame_00.png, frame_01.png 或 frame_1.png 等顺序）
            const validFrames = (files || [])
              .filter(file => file.name.startsWith('frame_') && file.name.endsWith('.png'))
              .map(file => file.name)
              .sort();

            return {
              id: chainName,
              frames: validFrames // 直接存入真实的文件名数组，例如 ["frame_00.png", "frame_01.png"] 或 ["frame_1.png"]
            };
          })
        );

        let sessionMeta = {
          title: `Round ${phase.replace('phase_', '')}`,
          mode: '趣味對局',
          topic: "無",
          author: "靈魂繪師們"
        };

        // 尝试去读取 main/info.json
        const mainPath = `${monthPath}/main`;
        const { data: mainFiles } = await supabase.storage.from(bucketName).list(mainPath, {
          limit: 100
        });

        const targetMetaFile = `${phase}.json`;
        const infoFile = (mainFiles || []).find(f => f.name === targetMetaFile);
        if (infoFile) {
          // 如果存在 info.json，直接下载并解析它
          const { data: fileData, error: downloadError } = await supabase.storage
            .from(bucketName)
            .download(`${mainPath}/${targetMetaFile}`);

          if (!downloadError && fileData) {
            const textContent = await fileData.text();
            try {
              const parsed = JSON.parse(textContent);
              sessionMeta = {
                title: parsed.title || sessionMeta.title,
                mode: parsed.mode || sessionMeta.mode,
                topic: parsed.topic || sessionMeta.topic,
                author: parsed.author || sessionMeta.author
              };
              console.log(`[Meta] 成功加载 ${phase} 的元数据: ${sessionMeta.title}`);
            } catch (e) {
              console.warn(`[Warning] 解析 ${mainPath}/${targetMetaFile} 失败，使用默认值。`);
            }
          }
        }

        // 6. 组装单局游戏的元数据清单
        const sessionData = {
          id: sessionId,
          title: sessionMeta.title,
          mode: sessionMeta.mode, // 存入单局数据
          topic: sessionMeta.topic,
          author: sessionMeta.author,
          baseUrl: `${supabaseUrl}/storage/v1/object/public/${bucketName}/${folderPath}`,
          chains: chainsWithDetails
        };

        // 写入单局静态 JSON 文件
        const outputDir = path.join(__dirname, '../public/data');
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        const outputPath = path.join(outputDir, `${sessionId}.json`);
        fs.writeFileSync(outputPath, JSON.stringify(sessionData, null, 2));

        // 收集到总目录索引中
        allSessions.push({
          id: sessionId,
          year,
          month,
          phase,
          mode: sessionMeta.mode || phase, // 关键：优先展示模式名，没有则优雅降级为 phase_1
          title: sessionData.title,        // 标题已变为 "Round 1: 桌游"
          chainsCount: chainsWithDetails.length
        });
      }
    }
  }

  // 7. 顺便生成一个主页索引清单 index.json，方便你的首页（图 1）动态渲染所有对局入口
  const masterIndexPath = path.join(__dirname, '../public/data/index.json');
  fs.writeFileSync(masterIndexPath, JSON.stringify(allSessions, null, 2));

  console.log(`✅ [Success] 自动化扫描完成！共生成 ${allSessions.length} 个对局清单。`);
  console.log(`📂 主索引已保存至: ${masterIndexPath}`);
}

generateAllManifests();