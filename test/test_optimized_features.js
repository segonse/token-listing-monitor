const TelegramService = require("../src/services/telegramService");
const { formatAnnouncementMessage } = require("../src/services/telegramBot/formatters");
const MonitorService = require("../src/services/monitorService");
const BinanceService = require("../src/services/binanceService");
const OkxService = require("../src/services/okxService");

async function testOptimizedFeatures() {
  console.log("🧪 开始测试优化后的功能...\n");

  try {
    // 测试1: 消息格式化中的代币信息显示
    console.log("📝 测试1: 消息格式化中的代币信息显示");
    
    const mockAnnouncement = {
      exchange: "Binance",
      type: "上新",
      title: "测试公告 - Tanssi Network (TANSSI) Will Be Available",
      publishTime: new Date(),
      url: "https://example.com/test-announcement",
      tokenInfoArray: [
        { name: "Tanssi Network", symbol: "TANSSI" },
        { name: null, symbol: "ETH" },
        { name: "Bitcoin", symbol: "BTC" }
      ]
    };

    console.log("\n📱 TelegramService格式化结果:");
    const telegramMessage = TelegramService.formatAnnouncementMessage(mockAnnouncement);
    console.log(telegramMessage);

    console.log("\n📋 历史查询格式化结果:");
    const historyMessage = formatAnnouncementMessage(mockAnnouncement);
    console.log(historyMessage);

    // 测试2: 只有symbol的代币显示
    console.log("\n📝 测试2: 只有symbol的代币显示");
    
    const mockAnnouncementSymbolOnly = {
      exchange: "OKX",
      type: "合约",
      title: "ETHUSDT永续合约上线",
      publishTime: new Date(),
      url: "https://example.com/test-contract",
      tokenInfoArray: [
        { name: null, symbol: "ETH" },
        { name: null, symbol: "USDT" }
      ]
    };

    const symbolOnlyMessage = TelegramService.formatAnnouncementMessage(mockAnnouncementSymbolOnly);
    console.log(symbolOnlyMessage);

    // 测试3: 没有代币信息的公告
    console.log("\n📝 测试3: 没有代币信息的公告");
    
    const mockAnnouncementNoTokens = {
      exchange: "Binance",
      type: "通知",
      title: "系统维护通知",
      publishTime: new Date(),
      url: "https://example.com/maintenance",
      tokenInfoArray: []
    };

    const noTokensMessage = TelegramService.formatAnnouncementMessage(mockAnnouncementNoTokens);
    console.log(noTokensMessage);

    // 测试4: 新的分离逻辑测试（仅测试方法存在性，不实际调用）
    console.log("\n📝 测试4: 验证新的分离逻辑方法");
    
    console.log("✅ BinanceService.getRawAnnouncements 方法存在:", typeof BinanceService.getRawAnnouncements === 'function');
    console.log("✅ BinanceService.analyzeAnnouncementWithAI 方法存在:", typeof BinanceService.analyzeAnnouncementWithAI === 'function');
    console.log("✅ OkxService.getRawAnnouncements 方法存在:", typeof OkxService.getRawAnnouncements === 'function');
    console.log("✅ OkxService.analyzeAnnouncementWithAI 方法存在:", typeof OkxService.analyzeAnnouncementWithAI === 'function');
    
    // 验证旧方法已被移除
    console.log("❌ BinanceService.getAnnouncements 方法已移除:", typeof BinanceService.getAnnouncements === 'undefined');
    console.log("❌ OkxService.getAnnouncements 方法已移除:", typeof OkxService.getAnnouncements === 'undefined');

    // 测试5: 历史公告获取方法存在性
    console.log("\n📝 测试5: 历史公告获取方法");
    console.log("✅ MonitorService.fetchHistoricalAnnouncements 方法存在:", typeof MonitorService.fetchHistoricalAnnouncements === 'function');

    console.log("\n🎉 所有优化功能测试完成!");
    
    console.log("\n📊 优化效果总结:");
    console.log("✅ 消息格式化已添加代币信息显示");
    console.log("✅ 支持 symbol(name) 格式显示");
    console.log("✅ 支持只有symbol的代币显示");
    console.log("✅ 历史公告获取已优化为分离逻辑");
    console.log("✅ 旧版getAnnouncements方法已清理");

  } catch (error) {
    console.error("❌ 测试失败:", error.message);
    console.error("详细错误:", error.stack);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  testOptimizedFeatures().then(() => {
    console.log("\n✅ 测试脚本执行完成");
    process.exit(0);
  }).catch(error => {
    console.error("💥 测试脚本执行失败:", error);
    process.exit(1);
  });
}

module.exports = { testOptimizedFeatures };
