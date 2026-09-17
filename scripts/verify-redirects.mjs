// scripts/verify-redirects.mjs

console.log(process.env.BASE_URL)

// 1. 目标服务地址（默认本地，可通过 BASE_URL=https://forestwork.vercel.app 覆写）
const BASE_URL = process.env.BASE_URL || 'https://forestwork.vercel.app'

// 2. 测试向量矩阵：覆盖此前所有挖掘出的历史边界路径
const TEST_CASES = [
  // --- 静态路由规则 (nuxt.config.ts routeRules) ---
  {
    desc: '旧日麻賽規 (字面量匹配)',
    path: '/rules',
    status: 301,
    target: '/games/mahjongsoul/rules'
  },
  {
    desc: 'Gartic Phone 舊門牌',
    path: '/gartic_phone',
    status: 301,
    target: '/games/garticphone'
  },
  {
    desc: 'Gartic Phone 舊子目錄通配',
    path: '/gartic_phone/test_room',
    status: 301,
    target: '/games/garticphone'
  },
  {
    desc: '歷史活動周：2022 數番盃',
    path: '/pages/event_week/2022JuneMahjongEvent/',
    status: 301,
    target: /\/games\/mahjongsoul\/tournaments\/.+/
  },
  {
    desc: '歷史活動周：2023 役滿盃',
    path: '/pages/event_week/2023MarchMahjongEvent/',
    status: 301,
    target: /\/games\/mahjongsoul\/tournaments\/.+/
  },
  {
    desc: '歷史活動周：未知殘留目錄安全降級',
    path: '/pages/event_week/unknown_slug',
    status: 302,
    target: '/games/mahjongsoul'
  },

  // --- 動態團隊賽路由 (server/routes/teams.ts) ---
  {
    desc: '團隊賽 S1 精確重定向',
    path: '/teams?season_param=1',
    status: 301,
    target: /\/games\/mahjongsoul\/tournaments\/.+/
  },
  {
    desc: '團隊賽 S2 精確重定向',
    path: '/teams?season_param=2',
    status: 301,
    target: /\/games\/mahjongsoul\/tournaments\/.+/
  },
  {
    desc: '團隊賽 S3 精確重定向',
    path: '/teams?season_param=3',
    status: 301,
    target: /\/games\/mahjongsoul\/tournaments\/.+/
  },
  {
    desc: '團隊賽非法參數安全降級',
    path: '/teams?season_param=999',
    status: 302,
    target: '/games/mahjongsoul'
  },

  // --- 年度積分榜路由 (server/routes/fwmp_result.ts) ---
  {
    desc: '2024 年度總決賽/邀請賽',
    path: '/fwmp_result?league=2024',
    status: 301,
    target: /\/games\/mahjongsoul\/tournaments\/.+/
  },
  {
    desc: '2025 年度總決賽/邀請賽',
    path: '/fwmp_result?league=2025',
    status: 301,
    target: /\/games\/mahjongsoul\/tournaments\/.+/
  },
  {
    desc: '年度積分榜無參數安全降級',
    path: '/fwmp_result',
    status: 302,
    target: '/games/mahjongsoul'
  },

  // --- 非標/動態查詢路由 ---
  {
    desc: '歷史常規賽 (年月查詢)',
    path: '/league_result?league_year=2024&league_month=Sep',
    status: 301,
    target: /\/games\/mahjongsoul\/tournaments\/.+/
  },
  {
    desc: '古董無鍵非標參數 (?2024Mar)',
    path: '/pages/match_date/?2024Mar',
    status: 301,
    target: /\/games\/mahjongsoul\/tournaments\/.+/
  },
  {
    desc: '古董無鍵未知格式安全降級',
    path: '/pages/match_date/?invalid_date',
    status: 302,
    target: '/games/mahjongsoul'
  }
]

// 3. 極簡測試執行器
async function runRedirectSuite() {
  console.log(`\n🔍 開始驗證重定向鏈路... 目標網關: ${BASE_URL}\n`)
  let passed = 0
  let failed = 0

  for (const test of TEST_CASES) {
    const targetUrl = new URL(test.path, BASE_URL).toString()
    try {
      // 關鍵：redirect: 'manual' 禁止自動追蹤，精確截獲 HTTP 3xx 響應
      const res = await fetch(targetUrl, { redirect: 'manual' })
      const actualLocation = res.headers.get('location') || ''
      const debugReason = res.headers.get('x-redirect-reason') || 'none'

      // 檢查狀態碼匹配
      const statusMatched = Array.isArray(test.status) 
        ? test.status.includes(res.status)
        : res.status === test.status

      // 檢查跳轉目標匹配
      let targetMatched = false
      if (test.target instanceof RegExp) {
        targetMatched = test.target.test(actualLocation)
      } else {
        targetMatched = actualLocation === test.target || actualLocation.endsWith(test.target)
      }

      if (statusMatched && targetMatched) {
        console.log(`  ✅ [PASS] ${test.desc}`)
        console.log(`     ${test.path} -> (${res.status}) ${actualLocation}`)
        passed++
      } else {
        console.error(`  ❌ [FAIL] ${test.desc}`)
        console.error(`     請求路徑: ${test.path}`)
        console.error(`     狀態碼斷言: 預期 ${JSON.stringify(test.status)}, 實際收到 ${res.status}`)
        console.error(`     Location 斷言: 預期 ${test.target}, 實際收到 "${actualLocation}"`)
        console.error(`     診斷原因 (Header): ${debugReason}`)
        failed++
      }
    } catch (err) {
      console.error(`  💥 [ERROR] 連線異常: ${test.desc} (${targetUrl})`)
      console.error(`     錯誤資訊: ${err.message}`)
      failed++
    }
  }

  console.log(`\n========================================`)
  console.log(`測試結果: ${passed} 通過, ${failed} 失敗 (共 ${TEST_CASES.length} 項)`)
  console.log(`========================================\n`)

  if (failed > 0) {
    process.exit(1)
  }
}

runRedirectSuite()