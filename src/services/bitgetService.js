const axios = require("axios");
const tunnel = require("tunnel");
const { getDynamicProxyConfig } = require("../utils/proxyHelper");

class BitgetService {
  // 公告类型ID配置
  static sectionIds = {
    spot: "5955813039257", // 现货
    futures: "12508313405000", // 合约
    margin: "12508313443168", // 杠杆
    copy: "12508313405075", // 跟单
    strategy: "12508313443194", // 策略
  };

  // 获取Bitget公告（默认获取现货公告）
  static async getAnnouncements(page = 1, sectionId = this.sectionIds.spot) {
    try {
      // 获取随机代理配置
      const proxyConfig = getDynamicProxyConfig();

      // 修改配置中的 username，将 BR 替换为 TR
      proxyConfig.auth.username = proxyConfig.auth.username
        .replace("region-BR", "region-RU")
        .replace("sessid-BR", "sessid-RU");

      // 创建代理隧道
      const agent = tunnel.httpsOverHttp({
        proxy: {
          host: proxyConfig.host,
          port: proxyConfig.port,
          proxyAuth: `${proxyConfig.auth.username}:${proxyConfig.auth.password}`,
        },
      });

      const response = await axios.post(
        "https://www.bitget.com/v1/cms/helpCenter/content/section/helpContentDetail",
        {
          pageNum: page,
          pageSize: 20,
          params: {
            sectionId: sectionId,
            languageId: 3,
            firstSearchTime: Date.now(),
          },
        },
        {
          headers: {
            "Content-Type": "application/json;charset=UTF-8",
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            origin: "https://www.bitget.com",
          },
          httpsAgent: agent,
          timeout: 30000,
        }
      );

      if (
        response.data &&
        response.data.code === "200" &&
        response.data.data &&
        response.data.data.items
      ) {
        const announcements = response.data.data.items || [];

        // 需要异步处理每个公告的代币提取
        const processedAnnouncements = [];
        for (const item of announcements) {
          const tokenInfoArray = await this.extractTokenInfo(item.title);

          const announcement = {
            exchange: "Bitget",
            title: item.title,
            description: "", // 公告详情需要另外获取
            type: this.determineAnnouncementType(item.title, sectionId),
            url: `https://www.bitget.com/en/support/articles/${item.contentId}`,
            publishTime: item.showTime
              ? new Date(parseInt(item.showTime))
              : new Date(),
            tokenInfoArray: tokenInfoArray,
          };

          processedAnnouncements.push(announcement);
        }

        return processedAnnouncements;
      }

      return [];
    } catch (error) {
      console.error("获取Bitget公告失败:", error.message);
      return [];
    }
  }

  // 根据标题和section类型确定公告类型
  static determineAnnouncementType(title, sectionId) {
    // 确定基础类型
    let baseType = "未分类";
    switch (sectionId) {
      case this.sectionIds.spot:
        baseType = "现货";
        break;
      case this.sectionIds.futures:
        baseType = "合约";
        break;
      case this.sectionIds.margin:
        baseType = "杠杆";
        break;
      case this.sectionIds.copy:
        baseType = "跟单";
        break;
      case this.sectionIds.strategy:
        baseType = "策略";
        break;
    }

    // 进一步细分现货公告类型
    // if (baseType === "现货") {
    //   const lowerTitle = title.toLowerCase();

    //   if (
    //     lowerTitle.includes("initial listing") ||
    //     lowerTitle.includes("will list")
    //   ) {
    //     return "上新";
    //   } else if (lowerTitle.includes("pre-market")) {
    //     return "盘前";
    //   } else if (
    //     lowerTitle.includes("airdrop") ||
    //     lowerTitle.includes("candybomb")
    //   ) {
    //     return "空投";
    //   }
    // }

    return baseType;
  }

  // 提取代币信息（增强版，支持只有symbol的情况）
  static async extractTokenInfo(title) {
    const Token = require("../models/Token");

    // 使用Token模型的增强提取方法
    const extractedTokens = await Token.extractTokensFromText(title);

    // 转换为Bitget服务期望的格式
    return extractedTokens.map((token) => ({
      name: token.name,
      symbol: token.symbol,
    }));
  }

  // 保留原有的正则表达式方法作为备用
  static extractTokenInfoLegacy(title) {
    const tokens = [];

    // 处理各种格式的标题
    // 1. 标准格式: "[Initial Listing] Bitget Will List ProjectName (TOKEN)"
    // 2. 简单格式: "Bitget Will List ProjectName (TOKEN)"
    // 3. 预市场格式: "Bitget pre-market trading: ProjectName (TOKEN)"

    // 合并多种模式的正则表达式
    const patterns = [
      // 标准上新格式
      /(?:Will\s+List|Listing\].+?Will\s+List)\s+([^(]+?)\s*\(([A-Z0-9]+)\)/i,
      // 预市场格式
      /pre-market\s+trading:?\s+([^(]+?)\s*\(([A-Z0-9]+)\)/i,
      // 通用格式 - 捕获任何 ProjectName (TOKEN) 模式
      /([A-Za-z0-9\s\.\-&']+?)\s*\(([A-Z0-9]+)\)/g,
    ];

    let matched = false;

    // 尝试使用特定模式匹配
    for (let i = 0; i < patterns.length - 1; i++) {
      const match = title.match(patterns[i]);
      if (match) {
        matched = true;
        const projectName = match[1].trim();
        const tokenSymbol = match[2].trim();

        // 清理项目名称
        const cleanedProjectName = this.cleanProjectName(projectName);

        tokens.push({
          tokenName: tokenSymbol,
          projectName: cleanedProjectName,
        });

        break; // 找到匹配后退出循环
      }
    }

    // 如果特定模式没有匹配，使用通用模式
    if (!matched) {
      const generalPattern = patterns[patterns.length - 1];
      let match;

      // 重置正则表达式
      generalPattern.lastIndex = 0;

      while ((match = generalPattern.exec(title)) !== null) {
        const projectName = match[1].trim();
        const tokenSymbol = match[2].trim();

        // 过滤掉明显不是代币信息的匹配（比如 "in the Innovation Zone" 这样的文本）
        if (
          tokenSymbol.length > 1 &&
          !tokenSymbol.includes(" ") &&
          !["IN", "THE", "AND", "FOR", "ZONE"].includes(tokenSymbol)
        ) {
          const cleanedProjectName = this.cleanProjectName(projectName);

          tokens.push({
            tokenName: tokenSymbol,
            projectName: cleanedProjectName,
          });
        }
      }
    }

    return tokens;
  }

  // 新增清理项目名称的辅助方法
  static cleanProjectName(projectName) {
    if (!projectName) return "";

    return (
      projectName
        // 移除尾部的特定文本
        .replace(/\s+in\s+the\s+Innovation.+$/, "")
        .replace(/\s+in\s+the\s+.+Zone.*$/, "")
        .replace(/\.\s+Come\s+and\s+grab.+$/, "")
        .replace(/\s+is\s+set\s+to\s+launch\s+soon.*$/, "")
        // 移除前缀词
        .replace(/^(Bitget|listing|listing:|add|adding|support|new)\s+/i, "")
        // 移除尾部的特殊字符和空格
        .replace(/[,\.!]\s*$/, "")
        .trim()
    );
  }

  // 获取所有类型的公告
  static async getAllAnnouncements() {
    try {
      // 定义要获取的各个类型公告
      const sectionTypes = [
        { type: "spot", sectionId: this.sectionIds.spot },
        { type: "futures", sectionId: this.sectionIds.futures },
        { type: "margin", sectionId: this.sectionIds.margin },
        { type: "copy", sectionId: this.sectionIds.copy },
        { type: "strategy", sectionId: this.sectionIds.strategy },
      ];

      let allAnnouncements = [];

      // 逐个获取各类型的公告，并添加重试机制
      for (const section of sectionTypes) {
        let retryCount = 0;
        const maxRetries = 3;
        let success = false;

        while (!success && retryCount < maxRetries) {
          try {
            console.log(
              `获取Bitget ${section.type}公告...${
                retryCount > 0 ? `(重试第${retryCount}次)` : ""
              }`
            );

            const announcements = await this.getAnnouncements(
              1,
              section.sectionId
            );

            if (announcements && announcements.length > 0) {
              allAnnouncements = [...allAnnouncements, ...announcements];
              console.log(
                `成功获取Bitget ${section.type}公告: ${announcements.length}条`
              );
              success = true;
            } else {
              // 如果返回空结果，也可能是临时错误
              retryCount++;
              if (retryCount < maxRetries) {
                const retryDelay = 1000;
                console.log(
                  `${section.type}公告为空，${retryDelay / 1000}秒后重试...`
                );
                await new Promise((resolve) => setTimeout(resolve, retryDelay));
              } else {
                console.log(`${section.type}公告确认为空，继续获取其他类型`);
                success = true; // 标记为已完成
              }
            }
          } catch (error) {
            retryCount++;
            console.error(
              `获取Bitget ${section.type}公告失败 (${retryCount}/${maxRetries}): ${error.message}`
            );

            if (retryCount < maxRetries) {
              const retryDelay = 3000 * retryCount;
              console.log(`将在${retryDelay / 1000}秒后重试...`);
              await new Promise((resolve) => setTimeout(resolve, retryDelay));
            } else {
              console.error(
                `获取Bitget ${section.type}公告最终失败，跳过该类型`
              );
              success = true; // 标记为已完成以继续下一个类型
            }
          }
        }

        // 各类型请求之间添加短暂延迟
        if (section.type !== "strategy") {
          // 最后一个不需要延迟
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      return allAnnouncements;
    } catch (error) {
      console.error("获取Bitget所有类型公告失败:", error.message);
      return [];
    }
  }
}

module.exports = BitgetService;
