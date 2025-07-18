const Token = require("../src/models/Token");
const AnnouncementToken = require("../src/models/AnnouncementToken");
const Announcement = require("../src/models/Announcement");

async function testNewFeatures() {
  console.log("🧪 开始测试新功能...\n");

  try {
    // 测试1: 代币查找或创建功能
    console.log("📝 测试1: 代币查找或创建功能");

    // 创建只有symbol的代币
    const token1 = await Token.findOrCreate(null, "TEST");
    console.log("创建只有symbol的代币:", token1);

    // 创建有name和symbol的代币（应该更新现有记录）
    const token2 = await Token.findOrCreate("Test Token", "TEST");
    console.log("更新代币信息:", token2);

    // 测试创建只有name的代币
    const token3 = await Token.findOrCreate("Another Test Token", null);
    console.log("创建只有name的代币:", token3);

    // 测试2: 代币搜索功能
    console.log("\n📝 测试2: 代币搜索功能");
    const searchResults = await Token.search("TEST");
    console.log("搜索结果:", searchResults);

    // 测试3: 从文本提取代币信息
    console.log("\n📝 测试3: 从文本提取代币信息");
    const testTexts = [
      "Binance Will List Tanssi Network (TANSSI)",
      "ETHUSDT永续合约上线",
      "Bitcoin (BTC) and Ethereum (ETH) trading pairs",
    ];

    for (const text of testTexts) {
      console.log(`\n分析文本: "${text}"`);
      const extractedTokens = await Token.extractTokensFromText(text);
      console.log("提取到的代币:", extractedTokens);
    }

    // 测试4: 公告-代币关联
    console.log("\n📝 测试4: 公告-代币关联功能");

    // 创建测试公告
    const testAnnouncement = {
      exchange: "Test",
      title: "Test Announcement for TANSSI",
      description: "Test description",
      type: "上新",
      url: "https://test.com/announcement/123",
      publishTime: new Date(),
      tokenInfoArray: [
        { name: "Tanssi Network", symbol: "TANSSI" },
        { name: null, symbol: "ETH" },
      ],
    };

    const savedAnnouncement = await Announcement.create(testAnnouncement);
    console.log("创建测试公告:", savedAnnouncement.id);

    // 获取公告关联的代币
    const relatedTokens = await AnnouncementToken.getTokensByAnnouncementId(
      savedAnnouncement.id
    );
    console.log("公告关联的代币:", relatedTokens);

    // 测试5: 通过代币ID查找公告
    console.log("\n📝 测试5: 通过代币ID查找公告");
    if (relatedTokens.length > 0) {
      const tokenAnnouncements =
        await AnnouncementToken.getAnnouncementsByTokenId(relatedTokens[0].id);
      console.log(
        `代币 ${relatedTokens[0].symbol} 的相关公告:`,
        tokenAnnouncements.length,
        "条"
      );
    }

    console.log("\n✅ 所有测试完成!");
  } catch (error) {
    console.error("❌ 测试失败:", error.message);
    console.error(error.stack);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  testNewFeatures()
    .then(() => {
      console.log("\n🎉 测试脚本执行完成");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 测试脚本执行失败:", error);
      process.exit(1);
    });
}

module.exports = { testNewFeatures };
