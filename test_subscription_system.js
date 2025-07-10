const SubscriptionService = require("./src/services/subscriptionService");
const TokenSearchService = require("./src/services/tokenSearchService");

async function testSubscriptionSystem() {
  console.log("🚀 测试新的订阅系统...\n");

  try {
    // 测试1: 订阅服务基本功能
    console.log("=== 测试订阅服务 ===");
    
    // 模拟用户ID
    const testUserId = 1;
    
    // 测试添加订阅
    console.log("1. 测试添加订阅...");
    const addResult = await SubscriptionService.addSubscription(
      testUserId, 
      "Binance", 
      "上新", 
      "BTC"
    );
    console.log("添加订阅结果:", addResult);
    
    // 测试获取用户订阅
    console.log("\n2. 测试获取用户订阅...");
    const subscriptions = await SubscriptionService.getUserSubscriptions(testUserId);
    console.log("用户订阅:", subscriptions);
    
    // 测试订阅统计
    console.log("\n3. 测试订阅统计...");
    const stats = await SubscriptionService.getSubscriptionStats(testUserId);
    console.log("订阅统计:", stats);

    // 测试2: 代币搜索服务
    console.log("\n=== 测试代币搜索服务 ===");
    
    // 测试搜索代币
    console.log("1. 测试搜索代币 'BTC'...");
    const searchResults = await TokenSearchService.searchTokens("BTC", 5);
    console.log("搜索结果:", searchResults);
    
    // 测试获取热门代币
    console.log("\n2. 测试获取热门代币...");
    const popularTokens = await TokenSearchService.getPopularTokens(5);
    console.log("热门代币:", popularTokens);
    
    // 测试获取最近代币
    console.log("\n3. 测试获取最近代币...");
    const recentTokens = await TokenSearchService.getRecentTokens(5);
    console.log("最近代币:", recentTokens);
    
    // 测试代币统计
    console.log("\n4. 测试代币统计...");
    const tokenStats = await TokenSearchService.getTokenStats();
    console.log("代币统计:", tokenStats);

    // 测试3: 订阅匹配逻辑
    console.log("\n=== 测试订阅匹配逻辑 ===");
    
    // 模拟公告对象
    const mockAnnouncement = {
      exchange: "Binance",
      type: "上新",
      title: "Binance Will List Bitcoin (BTC) in Innovation Zone",
      tokenInfoArray: [
        { name: "Bitcoin", symbol: "BTC" }
      ]
    };
    
    console.log("测试公告:", mockAnnouncement);
    
    const matchResult = await SubscriptionService.checkAnnouncementMatch(
      testUserId, 
      mockAnnouncement
    );
    console.log("匹配结果:", matchResult);

    // 测试4: 支持的交易所和类型
    console.log("\n=== 测试支持的选项 ===");
    
    const supportedExchanges = SubscriptionService.getSupportedExchanges();
    console.log("支持的交易所:", supportedExchanges);
    
    const supportedTypes = SubscriptionService.getSupportedAnnouncementTypes();
    console.log("支持的公告类型:", supportedTypes);

    console.log("\n✅ 订阅系统测试完成！");
    
  } catch (error) {
    console.error("❌ 测试失败:", error.message);
    console.error(error.stack);
  }
}

// 运行测试
if (require.main === module) {
  testSubscriptionSystem();
}

module.exports = testSubscriptionSystem;
