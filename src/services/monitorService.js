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

      // 获取各交易所原始公告数据（不进行AI分析）
      const [
        // bybitAnnouncements,
        okxRawAnnouncements,
        binanceRawAnnouncements,
        // bitgetAnnouncements, // Bitget暂时保持原有逻辑
        // kucoinAnnouncements,
        // htxAnnouncements,
        // gateAnnouncements,
        // xtAnnouncements,
      ] = await Promise.all([
        // BybitService.getAllAnnouncements(),
        OkxService.getRawAnnouncements(),
        BinanceService.getRawAnnouncements(),
        // BitgetService.getAllAnnouncements(), // Bitget暂时保持原有逻辑
        // KucoinService.getAnnouncements(),
        // HtxService.getAnnouncements(),
        // GateService.getAnnouncements(),
        // XtService.getAnnouncements(),
      ]);

      // 合并所有原始公告
      const allRawAnnouncements = [
        // ...bybitAnnouncements,
        ...okxRawAnnouncements,
        ...binanceRawAnnouncements,
        // ...bitgetAnnouncements, // Bitget暂时保持原有逻辑
        // ...kucoinAnnouncements,
        // ...htxAnnouncements,
        // ...gateAnnouncements,
        // ...xtAnnouncements,
      ];

      if (!allRawAnnouncements.length) {
        console.log("未获取到任何交易所公告，跳过检查");
        return;
      }

      console.log(`获取到总共 ${allRawAnnouncements.length} 条原始公告`);
      // console.log(`- Bybit: ${bybitAnnouncements.length} 条`);
      console.log(`- OKX: ${okxRawAnnouncements.length} 条`);
      console.log(`- Binance: ${binanceRawAnnouncements.length} 条`);
      // console.log(`- Bitget: ${bitgetAnnouncements.length} 条`);
      // console.log(`- KuCoin: ${kucoinAnnouncements.length} 条`);
      // console.log(`- HTX: ${htxAnnouncements.length} 条`);
      // console.log(`- Gate.io: ${gateAnnouncements.length} 条`);
      // console.log(`- XT: ${xtAnnouncements.length} 条`);

      // 获取数据库中已有的所有公告，用于去重（改为基于URL+标题）
      const existingAnnouncements = await Announcement.findAll();

      // 使用Map记录已存在的URL+标题组合
      const existingCombinations = new Map();
      for (const existing of existingAnnouncements) {
        const key = `${existing.url}|${existing.title}`;
        existingCombinations.set(key, existing);
      }

      // 筛选出真正的新公告（基于URL+标题去重）
      const newRawAnnouncements = [];
      for (const announcement of allRawAnnouncements) {
        // 构建当前公告的URL+标题键
        const key = `${announcement.url}|${announcement.title}`;

        // 检查公告是否已存在
        if (!existingCombinations.has(key)) {
          newRawAnnouncements.push(announcement);
        }
      }

      console.log(
        `发现 ${newRawAnnouncements.length} 条新公告，需要进行AI分析和处理`
      );

      if (newRawAnnouncements.length === 0) {
        console.log("没有新公告需要处理");
        return;
      }

      // 对新公告进行AI分析和处理
      for (const rawAnnouncement of newRawAnnouncements) {
        console.log(
          `处理新公告: ${rawAnnouncement.title} (${rawAnnouncement.exchange})`
        );

        // 根据交易所类型进行AI分析
        let processedAnnouncementList = [];

        try {
          if (rawAnnouncement.exchange === "Binance") {
            // 使用Binance的AI分析方法
            processedAnnouncementList =
              await BinanceService.analyzeAnnouncementWithAI(rawAnnouncement);
          } else if (rawAnnouncement.exchange === "OKX") {
            // 使用OKX的AI分析方法
            processedAnnouncementList =
              await OkxService.analyzeAnnouncementWithAI(rawAnnouncement);
          } else if (rawAnnouncement.exchange === "Bitget") {
            // Bitget使用正则表达式，已经包含了基本的代币提取，这里保持原样
            processedAnnouncementList = [rawAnnouncement];
          } else {
            // 其他交易所的处理逻辑（暂时保持原样）
            processedAnnouncementList = [rawAnnouncement];
          }

          console.log(
            `AI分析完成，生成 ${processedAnnouncementList.length} 条分类公告`
          );

          // 处理每个分析后的公告（一个原始公告可能产生多个分类后的公告）
          for (const processedAnnouncement of processedAnnouncementList) {
            console.log(`- 类型: ${processedAnnouncement.type}`);

            // 打印提取到的所有代币信息
            if (
              processedAnnouncement.tokenInfoArray &&
              processedAnnouncement.tokenInfoArray.length > 0
            ) {
              console.log(
                `- 提取到 ${processedAnnouncement.tokenInfoArray.length} 个代币信息:`
              );
              processedAnnouncement.tokenInfoArray.forEach((token, index) => {
                console.log(
                  `  ${index + 1}. 符号: ${token.symbol || "未知"}, 名称: ${
                    token.name || "未知"
                  }`
                );
              });
            } else {
              console.log(`- 未提取到代币信息`);
            }

            // 保存公告到数据库
            const savedAnnouncement = await Announcement.create(
              processedAnnouncement
            );

            if (!savedAnnouncement) {
              console.error(`保存公告失败: ${processedAnnouncement.title}`);
              continue;
            }

            // 添加到已存在Map中，防止重复处理
            const key = `${processedAnnouncement.url}|${processedAnnouncement.title}`;
            existingCombinations.set(key, savedAnnouncement);

            // 处理用户订阅和通知
            for (const user of users) {
              // 检查用户是否订阅了此类公告
              const isSubscribed = await User.checkMatchingSubscription(
                user.user_id,
                processedAnnouncement
              );

              if (isSubscribed) {
                // 检查是否已经发送过通知
                const alreadySent = await Announcement.hasBeenSentToUser(
                  user.id,
                  savedAnnouncement.id
                );

                if (!alreadySent) {
                  console.log(
                    `向用户 ${user.user_id} 发送公告通知: ${processedAnnouncement.title}`
                  );

                  // 根据用户ID类型决定发送渠道
                  if (user.user_id.startsWith("tg_") && user.telegram_id) {
                    // Telegram用户，发送Telegram消息
                    const telegramMessage =
                      TelegramService.formatAnnouncementMessage(
                        processedAnnouncement
                      );
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
                      console.log(
                        `成功向Telegram用户 ${user.user_id} 发送通知`
                      );
                    } else {
                      console.error(
                        `向Telegram用户 ${user.user_id} 发送通知失败`
                      );
                    }
                  } else {
                    // 默认为微信用户 - 暂时注释掉微信推送功能
                    console.log(
                      `跳过微信用户 ${user.user_id} 的通知发送（微信推送已禁用）`
                    );

                    // 注释掉的微信推送代码
                    /*
                    const wechatMessage =
                      WechatService.formatAnnouncementMessage(
                        processedAnnouncement
                      );
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
                    */
                  }
                } else {
                  console.log(`通知已经发送给用户 ${user.user_id}，跳过`);
                }
              }
            }
          }
        } catch (error) {
          console.error(
            `处理公告失败: ${rawAnnouncement.title}`,
            error.message
          );
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

      // 记录已存储的URL+标题组合（与定时检查保持一致）
      const storedCombinations = new Map();

      // 先查询数据库中已有的公告
      const existingAnnouncements = await Announcement.findAll();

      // 将已有公告的URL+标题组合加入到Map中
      for (const existing of existingAnnouncements) {
        const key = `${existing.url}|${existing.title}`;
        storedCombinations.set(key, existing);
      }

      let binanceAnnouncements = [];
      let okxAnnouncements = [];
      let bitgetAnnouncements = [];

      // 获取币安历史数据
      if (exchangesToFetch.binance) {
        console.log("获取币安历史公告数据...");
        const binanceStartPage = 13;
        const binanceEndPage = 2;

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

              // 使用新的分离逻辑：先获取原始数据
              const rawAnnouncements = await BinanceService.getRawAnnouncements(
                page
              );

              // 增加日志，用于问题排查
              console.log(
                `获取到 Binance 第 ${page} 页原始数据: ${
                  rawAnnouncements ? rawAnnouncements.length : 0
                } 条`
              );

              // 即使返回了空数组，也考虑某些情况是因为错误导致的
              if (!rawAnnouncements || rawAnnouncements.length === 0) {
                if (page > 1) {
                  // 只对较新的页面执行此检查
                  retryCount++;
                  if (retryCount < maxRetries) {
                    console.log(
                      `第 ${page} 页数据为空，可能是临时错误，进行第 ${retryCount} 次重试...`
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

              // 筛选出真正需要AI分析的新公告
              const newRawAnnouncements = [];
              for (const rawAnnouncement of rawAnnouncements) {
                const key = `${rawAnnouncement.url}|${rawAnnouncement.title}`;
                if (!storedCombinations.has(key)) {
                  newRawAnnouncements.push(rawAnnouncement);
                }
              }

              console.log(
                `第 ${page} 页发现 ${newRawAnnouncements.length} 条新公告需要AI分析`
              );

              // 对新公告进行AI分析
              const processedAnnouncements = [];
              for (const rawAnnouncement of newRawAnnouncements) {
                try {
                  const analyzed =
                    await BinanceService.analyzeAnnouncementWithAI(
                      rawAnnouncement
                    );
                  processedAnnouncements.push(...analyzed);

                  // 避免AI API限制
                  if (
                    newRawAnnouncements.indexOf(rawAnnouncement) <
                    newRawAnnouncements.length - 1
                  ) {
                    await new Promise((resolve) => setTimeout(resolve, 500));
                  }
                } catch (error) {
                  console.error(
                    `AI分析失败: ${rawAnnouncement.title}`,
                    error.message
                  );
                  // 添加未分类的公告
                  processedAnnouncements.push({
                    ...rawAnnouncement,
                    type: "未分类",
                    tokenInfoArray: [],
                  });
                }
              }

              binanceAnnouncements = [
                ...binanceAnnouncements,
                ...processedAnnouncements,
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

              // 使用新的分离逻辑：先获取原始数据
              const rawAnnouncements = await OkxService.getRawAnnouncements(
                page
              );

              // 增加日志
              console.log(
                `获取到 OKX 第 ${page} 页原始数据: ${
                  rawAnnouncements ? rawAnnouncements.length : 0
                } 条`
              );

              // 同样对空结果进行特殊处理
              if (!rawAnnouncements || rawAnnouncements.length === 0) {
                if (page > okxEndPage - 3) {
                  // 只对较新的页面执行此检查
                  retryCount++;
                  if (retryCount < maxRetries) {
                    console.log(
                      `第 ${page} 页数据为空，可能是临时错误，进行第 ${retryCount} 次重试...`
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

              // 筛选出真正需要AI分析的新公告
              const newRawAnnouncements = [];
              for (const rawAnnouncement of rawAnnouncements) {
                const key = `${rawAnnouncement.url}|${rawAnnouncement.title}`;
                if (!storedCombinations.has(key)) {
                  newRawAnnouncements.push(rawAnnouncement);
                }
              }

              console.log(
                `第 ${page} 页发现 ${newRawAnnouncements.length} 条新公告需要AI分析`
              );

              // 对新公告进行AI分析
              const processedAnnouncements = [];
              for (const rawAnnouncement of newRawAnnouncements) {
                try {
                  const analyzed = await OkxService.analyzeAnnouncementWithAI(
                    rawAnnouncement
                  );
                  processedAnnouncements.push(...analyzed);

                  // 避免AI API限制
                  if (
                    newRawAnnouncements.indexOf(rawAnnouncement) <
                    newRawAnnouncements.length - 1
                  ) {
                    await new Promise((resolve) => setTimeout(resolve, 500));
                  }
                } catch (error) {
                  console.error(
                    `AI分析失败: ${rawAnnouncement.title}`,
                    error.message
                  );
                  // 添加未分类的公告
                  processedAnnouncements.push({
                    ...rawAnnouncement,
                    type: "未分类",
                    tokenInfoArray: [],
                  });
                }
              }

              okxAnnouncements = [
                ...okxAnnouncements,
                ...processedAnnouncements,
              ];
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
            const maxRetries = 10;
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
                  if (page > 0) {
                    // 只对较新的页面执行此检查(bitget403率过高，例外)
                    retryCount++;
                    if (retryCount < maxRetries) {
                      console.log(
                        `第 ${page} 页数据为空，可能是临时错误，进行第 ${retryCount} 次重试...`
                      );
                      const retryDelay = 1000;
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
