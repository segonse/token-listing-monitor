const AnnouncementAnalyzer = require("./announcement_analyzer");

// 测试用的真实公告标题
const testAnnouncements = [
  // 币安公告
  {
    title: "Binance Will List Pepe (PEPE) in the Innovation Zone",
    exchange: "binance",
  },
  {
    title: "Binance Adds BLUR/BTC, BLUR/ETH, BLUR/TUSD Trading Pairs",
    exchange: "binance",
  },
  {
    title: "Binance Will Delist DREP/BTC, DREP/BUSD on 2024-01-15",
    exchange: "binance",
  },
  {
    title: "币安合约将上线AAVEUSDC和UNIUSDC U本位永续合约 (2025-06-16)",
    exchange: "binance",
  },
  {
    title: "币安将上线PEPE 5-20倍杠杆代币",
    exchange: "binance",
  },

  // OKX公告
  {
    title: "OKX Will List Arbitrum (ARB) for Spot Trading",
    exchange: "okx",
  },
  {
    title: "OKX Adds New Trading Pairs: SUI/USDT, SUI/USDC",
    exchange: "okx",
  },

  // Bybit公告
  {
    title: "Notice on Bybit Spot Listing of BLUR/USDT Trading Pair",
    exchange: "bybit",
  },
  {
    title: "Bybit Will List Optimism (OP) Token",
    exchange: "bybit",
  },

  // Gate.io公告
  {
    title: "Gate.io Startup: Participate in SUI Token Sale",
    exchange: "gate",
  },
  {
    title: "Gate.io Lists Aptos (APT) in Primary Market",
    exchange: "gate",
  },

  // 非上新公告
  {
    title: "Scheduled System Maintenance - 2024-01-15 02:00 UTC",
    exchange: "binance",
  },
  {
    title: "New Year Trading Competition - Win 100,000 USDT",
    exchange: "okx",
  },
  {
    title: "Airdrop Alert: Claim Your Free Tokens",
    exchange: "bybit",
  },

  // 中文公告测试
  {
    title: "币安将上线Pepe (PEPE)交易",
    exchange: "binance",
  },
  {
    title: "欧易将新增ARB/USDT交易对",
    exchange: "okx",
  },
];

async function runTest() {
  console.log("🚀 开始测试公告分析器...\n");

  const analyzer = new AnnouncementAnalyzer();

  try {
    // 测试单个公告
    console.log("=== 单个公告测试 ===");
    const singleResult = await analyzer.processAnnouncement(
      "OKX to list RSIC•GENESIS•RUNE (RUNECOIN) for spot trading",
      "binance"
    );

    console.log("\n单个测试结果:");
    console.log(JSON.stringify(singleResult, null, 2));

    // 等待一下避免API限制
    console.log("\n等待3秒后开始批量测试...");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 测试批量处理
    // console.log('\n=== 批量公告测试 ===');
    // await analyzer.processAnnouncements(testAnnouncements);

    // 生成报告
    analyzer.generateReport();

    // 保存结果
    analyzer.saveResults("test_results.json");

    console.log("\n✅ 测试完成！");
  } catch (error) {
    console.error("❌ 测试失败:", error);
  }
}

// 运行测试
if (require.main === module) {
  runTest();
}

module.exports = { testAnnouncements, runTest };
