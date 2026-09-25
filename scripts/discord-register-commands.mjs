// scripts/discord-register-commands.mjs
const APP_ID = process.env.DISCORD_APPLICATION_ID
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN
// scripts/discord-register-commands.mjs 中 tarot 選項：
import { TAROT_SPREADS } from '../server/discord/assets/tarot-deck.ts'

// 動態組裝 16 個下拉選單項
const spreadChoices = Object.values(TAROT_SPREADS).map(s => ({
    name: s.name,
    value: s.id
}))

if (!APP_ID || !BOT_TOKEN) {
    console.error('[-] 缺少 APP_ID 或 BOT_TOKEN')
    process.exit(1)
}

// 通用基础指令
const commonCommands = [
    { name: 'ping', description: '檢查網站與交互機器人運行狀態' },
    { name: 'site', description: '取得林間小鎮官方網站與重要入口連結' },
    { name: 'pages', description: '展示帶有分頁按鈕的 Embed 交互卡片展示範例' },
]

// 跑团专有指令
const diceCommands = [
    {
        name: 'roll',
        description: 'TRPG 骰子投擲 (支援最佳/最差篩選)',
        options: [
            {
                name: 'count',
                description: '骰子數量 (預設 1, 上限 100)',
                type: 4, // INTEGER
                required: true,
                min_value: 1,
                max_value: 100
            },
            {
                name: 'faces',
                description: '骰子面數 (如 6, 20, 100)',
                type: 4, // INTEGER
                required: true,
                min_value: 1,
                max_value: 10000
            },
            {
                name: 'desc',
                description: '投擲備註原因 (可選)',
                type: 3, // STRING
                required: false
            },
            {
                name: 'keep',
                description: '篩選保留模式 (可選)',
                type: 3, // STRING
                required: false,
                choices: [
                    { name: '保留最好 (Best)', value: 'best' },
                    { name: '保留最差 (Worst)', value: 'worst' }
                ]
            },
            {
                name: 'keep_count',
                description: '保留的骰子數量 (配合 keep 模式)',
                type: 4, // INTEGER
                required: false,
                min_value: 1
            }
        ]
    },
    {
        name: 'choice',
        description: '在多個候選項中隨機抽取一項 (支援逗號或引號包含空格)',
        options: [
            {
                name: 'options',
                description: '候選清單 (例如: "炸雞 薯條", 披薩, 漢堡 或 "Item A" "Item B")',
                type: 3, // STRING
                required: true
            }
        ]
    },
    {
        name: 'arrange',
        description: '將輸入的名單進行隨機打亂重排 (支援自動切分組別)',
        options: [
            {
                name: 'items',
                description: '名單清單 (支援逗號或引號空格, 如: "隊伍 A", "隊伍 B", 隊伍 C)',
                type: 3, // STRING
                required: true
            },
            {
                name: 'groups',
                description: '隨機切分的組別數量 (可選，預設不分組)',
                type: 4, // INTEGER
                required: false,
                min_value: 2
            }
        ]
    },
    {
        name: 'roll_adv',
        description: 'TRPG 骰子投擲 (支援 4d6k3 取高, 2d20kl 劣勢, 1d20+5 算式, 2 6d6 批量)',
        options: [
            {
                name: 'expr',
                description: '骰子表達式 (例: 4d6k3, 2d20kl+3, 1d4+1d6, 6 4d6k3)',
                type: 3, // STRING
                required: true
            },
            {
                name: 'desc',
                description: '檢定備註 (例: 力量檢定、敏捷豁免)',
                type: 3, // STRING
                required: false
            }
        ]
    },
    {
        name: '解答之书',
        description: '翻開《解答之書》，獲取命運對你心中疑惑的隨機啟示',
        options: [
            {
                name: 'question',
                description: '你心中默想的問題 (可選)',
                type: 3, // STRING
                required: false
            }
        ]
    },
    {
        name: '每日塔羅',
        description: '抽取命運塔羅牌陣 (支援 1 至 10 張牌，預設為 3 張牌陣)',
        options: [
            {
                name: 'spread',
                description: '選擇占卜牌陣 (可選，預設為經典時序三牌陣)',
                type: 3, // INTEGER
                required: false,
                choices: spreadChoices
            },
            {
                name: 'question',
                description: '你心中默想或想要占卜的問題 (可選)',
                type: 3, // STRING
                required: false
            }
        ]
    },
    {
        name: '生日密碼',
        description: '解密 366 天生日靈魂密碼與性格宿命',
        options: [
            {
                name: 'month',
                description: '出生月份 (1 ~ 12)',
                type: 4, // INTEGER
                required: true,
                min_value: 1,
                max_value: 12
            },
            {
                name: 'day',
                description: '出生日期 (1 ~ 31)',
                type: 4, // INTEGER
                required: true,
                min_value: 1,
                max_value: 31
            }
        ]
    }
]

const cocCommands = [
    {
        name: 'insanity',
        description: '抽取 CoC 7版理智崩潰與瘋狂症狀 (支援症狀、恐懼症與狂熱症)',
        options: [
            {
                name: 'type',
                description: '選擇瘋狂類別 (可選，預設為短期/長期瘋狂症狀)',
                type: 3, // STRING
                required: false,
                choices: [
                    {
                        name: '🧠 短期/長期瘋狂症狀 (1D10，含連鎖抽取)',
                        value: 'full'
                    },
                    {
                        name: '🕷️ 隨機恐懼症 Phobia (1D100)',
                        value: 'phobia'
                    },
                    {
                        name: '🔥 隨機狂熱症 Mania (1D100)',
                        value: 'mania'
                    }
                ]
            }
        ]
    },
    {
        name: 'cc',
        description: '執行 CoC 7版技能對抗檢定 (支援獎懲骰與暗骰)',
        options: [
            {
                name: 'value',
                description: '檢定目標數值或技能值 (1 ~ 100)',
                type: 4, // INTEGER
                required: true,
                min_value: 1,
                max_value: 100
            },
            {
                name: 'skill',
                description: '技能名稱或檢定項目 (例如：偵察、聆聽、手槍)',
                type: 3, // STRING
                required: false
            },
            {
                name: 'bonus',
                description: '獎勵骰或懲罰骰 (可選)',
                type: 4, // INTEGER
                required: false,
                choices: [
                    { name: '🎁 獎勵骰 B2 (+2)', value: 2 },
                    { name: '🎁 獎勵骰 B1 (+1)', value: 1 },
                    { name: '🎲 標準檢定 (無獎懲)', value: 0 },
                    { name: '⚠️ 懲罰骰 P1 (-1)', value: -1 },
                    { name: '⚠️ 懲罰骰 P2 (-2)', value: -2 }
                ]
            },
            {
                name: 'secret',
                description: '是否進行暗骰 (僅自己可見)',
                type: 5, // BOOLEAN
                required: false
            }
        ]
    },
    {
        name: 'en',
        description: '執行 CoC 7版技能幕間成長檢定 (成功則 1D10 增長)',
        options: [
            {
                name: 'skill',
                description: '要進行成長檢定的技能名稱 (例如：偵察、聆聽)',
                type: 3, // STRING
                required: true
            },
            {
                name: 'value',
                description: '當前技能數值 (1 ~ 99)',
                type: 4, // INTEGER
                required: true,
                min_value: 1,
                max_value: 99
            }
        ]
    },
    {
        name: 'coc_make',
        description: '快速生成一組 CoC 7版調查員八圍屬性與幸運池',
        options: [
            {
                name: 'secret',
                description: '是否暗骰車卡 (僅自己可見)',
                type: 5, // BOOLEAN
                required: false
            }
        ]
    },
    {
        name: 'card',
        description: 'CoC 7版調查員角色卡管理系統',
        options: [
            {
                name: 'create',
                description: '填寫表單建立新調查員角色卡',
                type: 1 // SUB_COMMAND
            },
            {
                name: 'view',
                description: '檢視調查員角色卡全息檔案',
                type: 1, // SUB_COMMAND
                options: [
                    {
                        name: 'name',
                        description: '指定角色姓名 (可選，預設為當前出戰卡)',
                        type: 3, // STRING
                        required: false
                    },
                    {
                        name: 'user',
                        description: '調閱伺服器其他玩家的角色卡 (可選)',
                        type: 6, // USER
                        required: false
                    }
                ]
            },
            {
                name: 'list',
                description: '列出自己擁有的所有調查員角色卡',
                type: 1 // SUB_COMMAND
            },
            {
                name: 'switch',
                description: '切換當前出戰中的活躍角色卡',
                type: 1, // SUB_COMMAND
                options: [
                    {
                        name: 'name',
                        description: '要啟用的角色姓名',
                        type: 3, // STRING
                        required: true
                    }
                ]
            },
            {
                name: 'delete',
                description: '徹底清除指定的調查員角色卡',
                type: 1, // SUB_COMMAND
                options: [
                    {
                        name: 'name',
                        description: '要刪除的角色姓名',
                        type: 3, // STRING
                        required: true
                    }
                ]
            }
        ]
    }
]

const mahjongCommands = [{
    name: 'mahjong_pair',
    description: '雀魂三麻均衡隨機分桌 (自動考量歷史碰面與座位均衡演算法)',
    options: [
        {
            name: 'players',
            description: '參賽選手的 ID 清單 (用逗號或空格隔開，必須為 3 的倍數)',
            type: 3, // STRING
            required: true
        },
        {
            name: 'id_type',
            description: '輸入的號碼類型 (可選，預設為好友碼)',
            type: 3, // STRING
            required: false,
            choices: [
                {
                    name: '好友碼 (Friend ID - 遊戲內顯示之 8~9 位號碼)',
                    value: 'friend'
                },
                {
                    name: '帳號 ID (Account ID - 資料庫底層數字)',
                    value: 'account'
                }
            ]
        }
    ]
}]

// 按 Guild 配置指令清单 (数据驱动，物理隔离)
const guildConfigs = {
    // 林間小鎮
    '510192195509157909': [...commonCommands, ...diceCommands, ...mahjongCommands],

    // 血之秘儀
    '912673754696548365': [...commonCommands, ...diceCommands, ...cocCommands]
}



for (const [guildId, commands] of Object.entries(guildConfigs)) {
    console.log(`[+] 正在为 Guild [${guildId}] 同步 ${commands.length} 个指令...`)
    const res = await fetch(`https://discord.com/api/v10/applications/${APP_ID}/guilds/${guildId}/commands`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bot ${BOT_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(commands)
    })

    if (res.ok) {
        console.log(`[✔] Guild [${guildId}] 同步成功:`, commands.map(c => `/${c.name}`).join(', '))
    } else {
        console.error(`[-] Guild [${guildId}] 注册失败:`, await res.text())
    }
}