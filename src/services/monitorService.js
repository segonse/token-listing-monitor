const Token = require("../models/Token");
const Announcement = require("../models/Announcement");
const BybitService = require("./bybitService");
const OkxService = require("./okxService");
const BinanceService = require("./binanceService");
const WechatService = require("./wechatService");

class MonitorService {
  static async checkNewAnnouncements() {
    try {
      console.log("开始检查新公告...");

      // 获取所有监控的代币
      const tokens = await Token.findAll();
      if (!tokens.length) {
        console.log("没有设置监控的代币，跳过检查");
        return;
      }

      // 获取各交易所公告
      const bybitAnnouncements = await BybitService.getAllAnnouncements();
      const okxAnnouncements = await OkxService.getAnnouncements();
      const binanceAnnouncements = await BinanceService.getAnnouncements();

      // 合并所有公告
      const allAnnouncements = [
        ...bybitAnnouncements,
        ...okxAnnouncements,
        ...binanceAnnouncements,
      ];

      if (!allAnnouncements.length) {
        console.log("未获取到任何交易所公告，跳过检查");
        return;
      }

      console.log(`获取到总共 ${allAnnouncements.length} 条公告`);
      console.log(`- Bybit: ${bybitAnnouncements.length} 条`);
      console.log(`- OKX: ${okxAnnouncements.length} 条`);
      console.log(`- Binance: ${binanceAnnouncements.length} 条`);

      // 遍历公告，检查是否包含关注的代币
      for (const announcement of allAnnouncements) {
        // 跳过已存在的公告（根据URL去重）
        const existingAnnouncement = await Announcement.findByURL(
          announcement.url
        );
        if (existingAnnouncement) {
          continue;
        }

        // 检查公告标题和描述是否包含监控的代币名称
        for (const token of tokens) {
          const titleContainsToken = announcement.title.includes(token.name);
          const descriptionContainsToken = announcement.description.includes(
            token.name
          );

          if (titleContainsToken || descriptionContainsToken) {
            console.log(
              `发现代币 ${token.name} 的新公告: ${announcement.title} (来自 ${announcement.exchange})`
            );

            // 构建要保存的公告数据
            const announcementWithTokenId = {
              ...announcement,
              token_id: token.id,
            };

            // 先发送企业微信通知
            const message = WechatService.formatTokenAnnouncementMessage(
              token,
              announcement
            );
            const messageSent = await WechatService.sendMessage(message);

            // 只有在消息发送成功后才保存到数据库
            if (messageSent) {
              await Announcement.create(announcementWithTokenId);
              console.log(`公告已保存到数据库: ${announcement.title}`);
            } else {
              console.error(
                `微信通知发送失败，跳过保存公告: ${announcement.title}`
              );
              // 可以在这里添加重试逻辑或其他处理方式
            }
          }
        }
      }

      console.log("公告检查完成");
    } catch (error) {
      console.error("检查新公告时出错:", error.message);
    }
  }
}

module.exports = MonitorService;
