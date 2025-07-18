const TelegramService = require("../src/services/telegramService");
require("dotenv").config();

async function testTelegramProxy() {
  console.log("🧪 开始测试Telegram代理配置...\n");

  try {
    // 检查环境变量
    console.log("📋 检查环境变量配置:");
    console.log(
      `- TELEGRAM_BOT_TOKEN: ${
        process.env.TELEGRAM_BOT_TOKEN ? "已配置" : "未配置"
      }`
    );
    console.log(
      `- TELEGRAM_CHAT_ID: ${
        process.env.TELEGRAM_CHAT_ID ? "已配置" : "未配置"
      }`
    );
    console.log(`- PROXY_HOST: ${process.env.PROXY_HOST || "未配置"}`);
    console.log(`- PROXY_PORT: ${process.env.PROXY_PORT || "未配置"}`);
    console.log(
      `- PROXY_PASSWORD: ${process.env.PROXY_PASSWORD ? "已配置" : "未配置"}`
    );

    if (!process.env.TELEGRAM_BOT_TOKEN) {
      console.error("❌ TELEGRAM_BOT_TOKEN 未配置");
      return;
    }

    // if (!process.env.TELEGRAM_CHAT_ID) {
    //   console.error("❌ TELEGRAM_CHAT_ID 未配置");
    //   return;
    // }

    // 测试发送消息到默认聊天
    console.log("\n📤 测试发送消息到默认聊天...");
    const testMessage = `🧪 Telegram代理测试消息\n\n⏰ 时间: ${new Date().toLocaleString(
      "zh-CN",
      {
        timeZone: "Asia/Shanghai",
      }
    )}\n🔧 状态: 代理配置测试`;

    const result1 = await TelegramService.sendMessage(testMessage);
    console.log(`结果: ${result1 ? "✅ 成功" : "❌ 失败"}`);

    // 测试发送消息到指定用户（如果有配置的话）
    const testUserId = "6499471563";
    if (testUserId) {
      console.log(`\n📤 测试发送消息到用户 ${testUserId}...`);
      const testUserMessage = `🧪 Telegram用户代理测试消息\n\n⏰ 时间: ${new Date().toLocaleString(
        "zh-CN",
        {
          timeZone: "Asia/Shanghai",
        }
      )}\n🔧 状态: 用户消息代理配置测试`;

      const result2 = await TelegramService.sendMessageToUser(
        testUserId,
        testUserMessage
      );
      console.log(`结果: ${result2 ? "✅ 成功" : "❌ 失败"}`);
    } else {
      console.log("\n⚠️  TEST_TELEGRAM_USER_ID 未配置，跳过用户消息测试");
    }

    // 测试格式化消息
    console.log("\n📝 测试消息格式化...");
    const mockAnnouncement = {
      exchange: "Binance",
      type: "上新",
      title: "测试公告标题 - Telegram代理测试",
      publishTime: new Date(),
      url: "https://example.com/test-announcement",
    };

    const formattedMessage =
      TelegramService.formatAnnouncementMessage(mockAnnouncement);
    console.log("格式化消息预览:");
    console.log(formattedMessage);

    console.log("\n🎉 Telegram代理配置测试完成！");
  } catch (error) {
    console.error("❌ 测试失败:", error.message);
    console.error("详细错误:", error.stack);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  testTelegramProxy()
    .then(() => {
      console.log("\n✅ 测试脚本执行完成");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 测试脚本执行失败:", error);
      process.exit(1);
    });
}

module.exports = { testTelegramProxy };
