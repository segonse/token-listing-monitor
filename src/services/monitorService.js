const Token = require("../models/Token");
const Announcement = require("../models/Announcement");
const BybitService = require("./bybitService");
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

      // 获取Bybit公告
      const announcements = await BybitService.getAllAnnouncements();
      if (!announcements.length) {
        console.log("未获取到Bybit公告，跳过检查");
        return;
      }

      console.log(`获取到 ${announcements.length} 条公告`);

      // 遍历公告，检查是否包含关注的代币
      for (const announcement of announcements) {
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
              `发现代币 ${token.name} 的新公告: ${announcement.title}`
            );

            // 保存公告到数据库
            const announcementWithTokenId = {
              ...announcement,
              token_id: token.id,
            };

            await Announcement.create(announcementWithTokenId);

            // 发送企业微信通知
            const message = WechatService.formatTokenAnnouncementMessage(
              token,
              announcement
            );
            await WechatService.sendMessage(message);
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
