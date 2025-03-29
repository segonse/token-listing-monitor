const Token = require("../models/Token");
const User = require("../models/User");
const Announcement = require("../models/Announcement");
const BybitService = require("./bybitService");
const OkxService = require("./okxService");
const BinanceService = require("./binanceService");
const BitgetService = require("./bitgetService");
const KucoinService = require("./kucoinService");
const HtxService = require("./htxService");
const GateService = require("./gateService");
const XtService = require("./xtService");
const WechatService = require("./wechatService");

class MonitorService {
  static async checkNewAnnouncements() {
    try {
      console.log("开始检查新公告...");

      // 获取用户列表及其订阅信息
      const users = await User.findAll();
      if (!users.length) {
        console.log("没有用户，跳过检查");
        return;
      }

      // 获取各交易所公告
      const [
        // bybitAnnouncements,
        // okxAnnouncements,
        binanceAnnouncements,
        // bitgetAnnouncements,
        // kucoinAnnouncements,
        // htxAnnouncements,
        // gateAnnouncements,
        // xtAnnouncements,
      ] = await Promise.all([
        // BybitService.getAllAnnouncements(),
        // OkxService.getAnnouncements(),
        BinanceService.getAnnouncements(),
        // BitgetService.getAnnouncements(),
        // KucoinService.getAnnouncements(),
        // HtxService.getAnnouncements(),
        // GateService.getAnnouncements(),
        // XtService.getAnnouncements(),
      ]);

      // 合并所有公告
      const allAnnouncements = [
        // ...bybitAnnouncements,
        // ...okxAnnouncements,
        ...binanceAnnouncements,
        // ...bitgetAnnouncements,
        // ...kucoinAnnouncements,
        // ...htxAnnouncements,
        // ...gateAnnouncements,
        // ...xtAnnouncements,
      ];

      if (!allAnnouncements.length) {
        console.log("未获取到任何交易所公告，跳过检查");
        return;
      }

      console.log(`获取到总共 ${allAnnouncements.length} 条公告`);
      // console.log(`- Bybit: ${bybitAnnouncements.length} 条`);
      // console.log(`- OKX: ${okxAnnouncements.length} 条`);
      console.log(`- Binance: ${binanceAnnouncements.length} 条`);
      // console.log(`- Bitget: ${bitgetAnnouncements.length} 条`);
      // console.log(`- KuCoin: ${kucoinAnnouncements.length} 条`);
      // console.log(`- HTX: ${htxAnnouncements.length} 条`);
      // console.log(`- Gate.io: ${gateAnnouncements.length} 条`);
      // console.log(`- XT: ${xtAnnouncements.length} 条`);

      // 处理每条公告
      for (const announcement of allAnnouncements) {
        // 检查公告是否已存在
        const existingAnnouncement = await Announcement.findByURL(
          announcement.url
        );

        // 如果公告已存在，跳过
        if (existingAnnouncement) {
          continue;
        }

        console.log(`新公告: ${announcement.title} (${announcement.exchange})`);
        console.log(`- 类型: ${announcement.type}`);

        // 打印提取到的所有代币信息
        if (
          announcement.tokenInfoArray &&
          announcement.tokenInfoArray.length > 0
        ) {
          console.log(
            `- 提取到 ${announcement.tokenInfoArray.length} 个代币信息:`
          );
          announcement.tokenInfoArray.forEach((token, index) => {
            console.log(
              `  ${index + 1}. 代币: ${token.tokenName || "未知"}, 项目: ${
                token.projectName || "未知"
              }`
            );
          });
        } else {
          console.log(`- 未提取到代币信息`);
        }

        // 保存公告到数据库
        const savedAnnouncement = await Announcement.create(announcement);

        if (!savedAnnouncement) {
          console.error(`保存公告失败: ${announcement.title}`);
          continue;
        }

        // 处理用户订阅和通知
        for (const user of users) {
          // 检查用户是否订阅了此类公告
          const isSubscribed = await User.checkMatchingSubscription(
            user.user_id,
            announcement
          );

          if (isSubscribed) {
            // 检查是否已经发送过通知
            const alreadySent = await Announcement.hasBeenSentToUser(
              user.id,
              savedAnnouncement.id
            );

            if (!alreadySent) {
              console.log(
                `向用户 ${user.user_id} 发送公告通知: ${announcement.title}`
              );

              // 发送微信通知
              const message =
                WechatService.formatAnnouncementMessage(announcement);
              const messageSent = await WechatService.sendMessageToUser(
                user.user_id,
                message
              );

              if (messageSent) {
                // 标记为已发送
                await Announcement.markAsSentToUser(
                  user.id,
                  savedAnnouncement.id
                );
                console.log(`成功向用户 ${user.user_id} 发送通知`);
              } else {
                console.error(`向用户 ${user.user_id} 发送通知失败`);
              }
            } else {
              console.log(`通知已经发送给用户 ${user.user_id}，跳过`);
            }
          }
        }
      }

      console.log("公告检查完成");
    } catch (error) {
      console.error("检查新公告时出错:", error.message);
    }
  }

  // 历史数据获取方法（用于初始化或手动获取历史数据）
  static async fetchHistoricalAnnouncements() {
    try {
      console.log("开始获取历史公告数据...");

      const maxPages = 1; // 获取10页数据（每页50条，约500条历史数据）
      let allAnnouncements = [];

      for (let page = 1; page <= maxPages; page++) {
        console.log(`获取币安历史数据 - 第 ${page} 页...`);
        const announcements = await BinanceService.getAnnouncements(page);

        if (!announcements || announcements.length === 0) {
          console.log(`第 ${page} 页没有数据，结束获取`);
          break;
        }

        allAnnouncements = [...allAnnouncements, ...announcements];

        // 避免请求过于频繁
        if (page < maxPages) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }

      console.log(`共获取到 ${allAnnouncements.length} 条历史公告数据`);

      // 保存历史数据到数据库，但不发送通知
      let savedCount = 0;
      for (const announcement of allAnnouncements) {
        const existingAnnouncement = await Announcement.findByURL(
          announcement.url
        );

        if (!existingAnnouncement) {
          await Announcement.create(announcement);
          savedCount++;
        }
      }

      console.log(`成功保存 ${savedCount} 条新历史公告到数据库`);
      return true;
    } catch (error) {
      console.error("获取历史公告数据失败:", error.message);
      return false;
    }
  }
}

module.exports = MonitorService;
