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
const TelegramService = require("./telegramService");

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
        okxAnnouncements,
        binanceAnnouncements,
        bitgetAnnouncements,
        // kucoinAnnouncements,
        // htxAnnouncements,
        // gateAnnouncements,
        // xtAnnouncements,
      ] = await Promise.all([
        // BybitService.getAllAnnouncements(),
        OkxService.getAnnouncements(),
        BinanceService.getAnnouncements(),
        BitgetService.getAllAnnouncements(),
        // KucoinService.getAnnouncements(),
        // HtxService.getAnnouncements(),
        // GateService.getAnnouncements(),
        // XtService.getAnnouncements(),
      ]);

      // 合并所有公告
      const allAnnouncements = [
        // ...bybitAnnouncements,
        ...okxAnnouncements,
        ...binanceAnnouncements,
        ...bitgetAnnouncements,
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
      console.log(`- OKX: ${okxAnnouncements.length} 条`);
      console.log(`- Binance: ${binanceAnnouncements.length} 条`);
      console.log(`- Bitget: ${bitgetAnnouncements.length} 条`);
      // console.log(`- KuCoin: ${kucoinAnnouncements.length} 条`);
      // console.log(`- HTX: ${htxAnnouncements.length} 条`);
      // console.log(`- Gate.io: ${gateAnnouncements.length} 条`);
      // console.log(`- XT: ${xtAnnouncements.length} 条`);

      // 获取数据库中已有的所有公告，用于去重
      const existingAnnouncements = await Announcement.findAll();

      // 使用Map记录已存在的URL+type组合
      const existingCombinations = new Map();
      for (const existing of existingAnnouncements) {
        const key = `${existing.url}|${existing.type}`;
        existingCombinations.set(key, existing);
      }

      // 处理每条公告
      for (const announcement of allAnnouncements) {
        // 构建当前公告的URL+type键
        const key = `${announcement.url}|${announcement.type}`;

        // 检查公告是否已存在
        const existingAnnouncement = existingCombinations.get(key);

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

        // 添加到已存在Map中，防止重复处理
        existingCombinations.set(key, savedAnnouncement);

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

              // 根据用户ID类型决定发送渠道
              if (user.user_id.startsWith("tg_") && user.telegram_id) {
                // Telegram用户，发送Telegram消息
                const telegramMessage =
                  TelegramService.formatAnnouncementMessage(announcement);
                const messageSent = await TelegramService.sendMessageToUser(
                  user.telegram_id,
                  telegramMessage
                );

                if (messageSent) {
                  // 标记为已发送
                  await Announcement.markAsSentToUser(
                    user.id,
                    savedAnnouncement.id
                  );
                  console.log(`成功向Telegram用户 ${user.user_id} 发送通知`);
                } else {
                  console.error(`向Telegram用户 ${user.user_id} 发送通知失败`);
                }
              } else {
                // 默认为微信用户
                const wechatMessage =
                  WechatService.formatAnnouncementMessage(announcement);
                const messageSent = await WechatService.sendMessageToUser(
                  user.user_id,
                  wechatMessage
                );

                if (messageSent) {
                  // 标记为已发送
                  await Announcement.markAsSentToUser(
                    user.id,
                    savedAnnouncement.id
                  );
                  console.log(`成功向微信用户 ${user.user_id} 发送通知`);
                } else {
                  console.error(`向微信用户 ${user.user_id} 发送通知失败`);
                }
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
  static async fetchHistoricalAnnouncements(
    exchangesToFetch = { binance: true, okx: true, bitget: true }
  ) {
    try {
      console.log("开始获取历史公告数据...");

      // 记录已存储的URL+类型组合
      const storedCombinations = new Map();

      // 先查询数据库中已有的公告
      const existingAnnouncements = await Announcement.findAll();

      // 将已有公告的URL+类型组合加入到Map中
      for (const existing of existingAnnouncements) {
        const key = `${existing.url}|${existing.type}`;
        storedCombinations.set(key, true);
      }

      let binanceAnnouncements = [];
      let okxAnnouncements = [];
      let bitgetAnnouncements = [];

      // 获取币安历史数据
      if (exchangesToFetch.binance) {
        console.log("获取币安历史公告数据...");
        const binanceStartPage = 12;
        const binanceEndPage = 1;

        // 从高页码向低页码获取
        for (let page = binanceStartPage; page >= binanceEndPage; page--) {
          let retryCount = 0;
          const maxRetries = 3;
          let success = false;

          while (!success && retryCount < maxRetries) {
            try {
              console.log(
                `获取币安历史数据 - 第 ${page} 页...${
                  retryCount > 0 ? `(重试第${retryCount}次)` : ""
                }`
              );

              // 调用 getAnnouncements 方法
              const announcements = await BinanceService.getAnnouncements(page);

              // 增加日志，用于问题排查
              console.log(
                `获取到 Binance 第 ${page} 页数据: ${
                  announcements ? announcements.length : 0
                } 条`
              );

              // 即使返回了空数组，也考虑某些情况是因为错误导致的
              // 如果连续多次获取到空数据，有可能是因为服务异常
              if (!announcements || announcements.length === 0) {
                if (page > binanceEndPage - 3) {
                  // 只对较新的页面执行此检查
                  retryCount++;
                  if (retryCount < maxRetries) {
                    console.log(
                      `第 ${page} 页数据为空，可能是临时错误，进行第 ${
                        retryCount + 1
                      } 次重试...`
                    );
                    const retryDelay = 5000 * retryCount;
                    await new Promise((resolve) =>
                      setTimeout(resolve, retryDelay)
                    );
                    continue;
                  }
                }
                console.log(`第 ${page} 页确认没有数据，继续获取下一页`);
                success = true;
                continue;
              }

              binanceAnnouncements = [
                ...binanceAnnouncements,
                ...announcements,
              ];
              success = true;

              // 避免请求过于频繁
              if (page > binanceEndPage) {
                await new Promise((resolve) => setTimeout(resolve, 3000));
              }
            } catch (error) {
              retryCount++;
              console.error(
                `获取币安第${page}页失败 (${retryCount}/${maxRetries}): ${error.message}`
              );

              if (retryCount < maxRetries) {
                const retryDelay = 5000 * retryCount;
                console.log(`将在 ${retryDelay / 1000} 秒后重试...`);
                await new Promise((resolve) => setTimeout(resolve, retryDelay));
              } else {
                console.error(`获取币安第${page}页最终失败，跳过该页`);
              }
            }
          }
        }
      }

      // 获取OKX历史数据 - 使用相同的增强逻辑
      if (exchangesToFetch.okx) {
        console.log("获取OKX历史公告数据...");
        const okxStartPage = 13;
        const okxEndPage = 1;

        // 从高页码向低页码获取
        for (let page = okxStartPage; page >= okxEndPage; page--) {
          let retryCount = 0;
          const maxRetries = 3;
          let success = false;

          while (!success && retryCount < maxRetries) {
            try {
              console.log(
                `获取OKX历史数据 - 第 ${page} 页...${
                  retryCount > 0 ? `(重试第${retryCount}次)` : ""
                }`
              );

              const announcements = await OkxService.getAnnouncements(page);

              // 增加日志
              console.log(
                `获取到 OKX 第 ${page} 页数据: ${
                  announcements ? announcements.length : 0
                } 条`
              );

              // 同样对空结果进行特殊处理
              if (!announcements || announcements.length === 0) {
                if (page > okxEndPage - 3) {
                  // 只对较新的页面执行此检查
                  retryCount++;
                  if (retryCount < maxRetries) {
                    console.log(
                      `第 ${page} 页数据为空，可能是临时错误，进行第 ${
                        retryCount + 1
                      } 次重试...`
                    );
                    const retryDelay = 5000 * retryCount;
                    await new Promise((resolve) =>
                      setTimeout(resolve, retryDelay)
                    );
                    continue;
                  }
                }
                console.log(`第 ${page} 页确认没有数据，继续获取下一页`);
                success = true;
                continue;
              }

              okxAnnouncements = [...okxAnnouncements, ...announcements];
              success = true;

              // 避免请求过于频繁
              if (page > okxEndPage) {
                await new Promise((resolve) => setTimeout(resolve, 3000));
              }
            } catch (error) {
              retryCount++;
              console.error(
                `获取OKX第${page}页失败 (${retryCount}/${maxRetries}): ${error.message}`
              );

              if (retryCount < maxRetries) {
                // 重试前增加延迟，避免连续失败
                const retryDelay = 5000 * retryCount; // 递增延迟
                console.log(`将在 ${retryDelay / 1000} 秒后重试...`);
                await new Promise((resolve) => setTimeout(resolve, retryDelay));
              } else {
                console.error(`获取OKX第${page}页最终失败，跳过该页`);
              }
            }
          }
        }
      }

      // 获取Bitget历史数据
      if (exchangesToFetch.bitget) {
        console.log("获取Bitget历史公告数据...");

        // 定义要获取的各个类型及其页数
        const sectionConfigs = [
          { type: "spot", sectionId: BitgetService.sectionIds.spot, pages: 33 },
          {
            type: "futures",
            sectionId: BitgetService.sectionIds.futures,
            pages: 19,
          },
          {
            type: "margin",
            sectionId: BitgetService.sectionIds.margin,
            pages: 7,
          },
          { type: "copy", sectionId: BitgetService.sectionIds.copy, pages: 1 },
          {
            type: "strategy",
            sectionId: BitgetService.sectionIds.strategy,
            pages: 11,
          },
        ];

        // 按顺序获取每种类型的公告
        for (const config of sectionConfigs) {
          console.log(`获取Bitget ${config.type} 公告数据...`);

          // 从高页码向低页码获取
          for (let page = config.pages; page >= 1; page--) {
            let retryCount = 0;
            const maxRetries = 3;
            let success = false;

            while (!success && retryCount < maxRetries) {
              try {
                console.log(
                  `获取Bitget ${config.type} 历史数据 - 第 ${page} 页...${
                    retryCount > 0 ? `(重试第${retryCount}次)` : ""
                  }`
                );

                const announcements = await BitgetService.getAnnouncements(
                  page,
                  config.sectionId
                );

                // 增加日志
                console.log(
                  `获取到 Bitget ${config.type} 第 ${page} 页数据: ${
                    announcements ? announcements.length : 0
                  } 条`
                );

                // 同样对空结果进行特殊处理
                if (!announcements || announcements.length === 0) {
                  if (page > 1) {
                    // 只对较新的页面执行此检查
                    retryCount++;
                    if (retryCount < maxRetries) {
                      console.log(
                        `第 ${page} 页数据为空，可能是临时错误，进行第 ${
                          retryCount + 1
                        } 次重试...`
                      );
                      const retryDelay = 5000 * retryCount;
                      await new Promise((resolve) =>
                        setTimeout(resolve, retryDelay)
                      );
                      continue;
                    }
                  }
                  console.log(`第 ${page} 页确认没有数据，继续获取下一页`);
                  success = true;
                  continue;
                }

                bitgetAnnouncements = [
                  ...bitgetAnnouncements,
                  ...announcements,
                ];
                success = true;

                // 避免请求过于频繁
                if (page > 1) {
                  await new Promise((resolve) => setTimeout(resolve, 2000));
                }
              } catch (error) {
                retryCount++;
                console.error(
                  `获取Bitget ${config.type} 第${page}页失败 (${retryCount}/${maxRetries}): ${error.message}`
                );

                if (retryCount < maxRetries) {
                  // 重试前增加延迟，避免连续失败
                  const retryDelay = 5000 * retryCount; // 递增延迟
                  console.log(`将在 ${retryDelay / 1000} 秒后重试...`);
                  await new Promise((resolve) =>
                    setTimeout(resolve, retryDelay)
                  );
                } else {
                  console.error(
                    `获取Bitget ${config.type} 第${page}页最终失败，跳过该页`
                  );
                }
              }
            }
          }
        }
      }

      // 合并所有公告
      const allAnnouncements = [
        ...binanceAnnouncements,
        ...okxAnnouncements,
        ...bitgetAnnouncements, // 添加Bitget公告
      ];

      console.log(`共获取到 ${allAnnouncements.length} 条历史公告数据`);
      console.log(`- 币安: ${binanceAnnouncements.length} 条`);
      console.log(`- OKX: ${okxAnnouncements.length} 条`);
      console.log(`- Bitget: ${bitgetAnnouncements.length} 条`);

      // 保存历史数据到数据库，但不发送通知
      let savedCount = 0;

      // 处理新公告
      for (const announcement of allAnnouncements) {
        const key = `${announcement.url}|${announcement.type}`;

        // 检查URL+类型组合是否已存在
        if (!storedCombinations.has(key)) {
          await Announcement.create(announcement);
          storedCombinations.set(key, true);
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
