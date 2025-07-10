const BinanceService = require("./src/services/binanceService");
const AIAnalyzerService = require("./src/services/aiAnalyzerService");

async function testBinanceAI() {
  console.log("🚀 测试Binance AI分析器集成...\n");

  try {
    // 测试AI分析器
    console.log("=== 测试AI分析器 ===");
    const aiAnalyzer = new AIAnalyzerService();

    // const testTitles = [
    //   "Binance Will List Pepe (PEPE) in the Innovation Zone",
    //   "Binance Adds BLUR/BTC, BLUR/ETH, BLUR/TUSD Trading Pairs",
    //   "Introducing Xai (XAI) on Binance Launchpool",
    //   "Binance Alpha Will List Multiple Tokens",
    // ];

    // for (const title of testTitles) {
    //   console.log(`\n分析标题: ${title}`);

    //   // 使用Binance专用的prompt
    //   const prompt = BinanceService.getBinancePrompt(title, "Binance");
    //   const result = await aiAnalyzer.analyzeAnnouncement(
    //     title,
    //     "Binance",
    //     prompt
    //   );
    //   console.log("分析结果:", JSON.stringify(result, null, 2));

    //   // 添加延迟避免API限制
    //   await new Promise((resolve) => setTimeout(resolve, 1000));
    // }

    // 测试Binance服务（注意：这会调用真实的API）
    console.log("\n=== 测试Binance服务 ===");
    console.log("注意：这将调用真实的Binance API和AI分析器");

    // 只获取第一页的少量数据进行测试
    const announcements = await BinanceService.getAnnouncements(4);
    console.log(`获取到 ${announcements.length} 条公告`);

    if (announcements.length > 0) {
      console.log("\n前10条公告的AI分析结果:");
      for (let i = 0; i < Math.min(10, announcements.length); i++) {
        const announcement = announcements[i];
        console.log(`\n${i + 1}. ${announcement.title}`);
        console.log(`   类型: ${announcement.type}`);
        console.log(`   代币信息:`, announcement.tokenInfoArray);
        if (announcement.aiAnalysis) {
          console.log(`   AI分析:`, {
            categories: announcement.aiAnalysis.categories,
            confidence: announcement.aiAnalysis.confidence,
            tokens: announcement.aiAnalysis.tokens,
          });
        }
      }
    }

    console.log("\n✅ 测试完成！");
  } catch (error) {
    console.error("❌ 测试失败:", error.message);
    console.error(error.stack);
  }
}

// 运行测试
if (require.main === module) {
  testBinanceAI();
}

module.exports = testBinanceAI;
